import { Garment } from '@/interfaces/garment';
import { AiOutfitPick, OutfitsRequestBody, OutfitsResponseBody, GroqChatResponse } from '@/interfaces/ai';

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.3-70b-versatile';

function isPick(v: unknown): v is AiOutfitPick {
  if (typeof v !== 'object' || v === null) return false;
  const p = v as Record<string, unknown>;
  return (
    typeof p.topId === 'string' &&
    typeof p.bottomId === 'string' &&
    typeof p.shoesId === 'string' &&
    typeof p.score === 'number' &&
    p.score >= 0 && p.score <= 100 &&
    typeof p.reason === 'string'
  );
}

// Keep only picks whose ids exist in the wardrobe with the right category per slot.
function validatePicks(raw: unknown, items: Garment[]): AiOutfitPick[] {
  if (!Array.isArray(raw)) return [];
  const byId = new Map(items.map((g) => [g.id, g]));
  return raw.filter(isPick).filter((p) => {
    return (
      byId.get(p.topId)?.category === 'top' &&
      byId.get(p.bottomId)?.category === 'bottom' &&
      byId.get(p.shoesId)?.category === 'footwear'
    );
  }).slice(0, 3);
}

function buildPrompt(items: Garment[]): string {
  const catalogue = items
    .map(
      (g) =>
        `id=${g.id} | ${g.name} | category=${g.category} | color=${g.color} | ` +
        `formality=${g.formality}/5 | pattern=${g.pattern} | ` +
        `seasons=${g.seasons.join(',')} | occasions=${g.occasions.join(',')}`,
    )
    .join('\n');
  return (
    `Here is a wardrobe:\n${catalogue}\n\n` +
    `Suggest up to 3 outfits that pair well (color harmony, similar formality, shared occasions). ` +
    `Each outfit uses exactly one category=top, one category=bottom and one category=footwear item, by id. ` +
    `Respond with a JSON object of this exact shape and nothing else: ` +
    `{"outfits":[{"topId":"...","bottomId":"...","shoesId":"...","score":85,"reason":"..."}]} ` +
    `where score is 0-100 (how well the outfit works) and reason is a short explanation of max 12 words.`
  );
}

export async function POST(request: Request): Promise<Response> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return Response.json({ error: 'no_key' }, { status: 503 });
  }

  let items: Garment[];
  try {
    const body = (await request.json()) as OutfitsRequestBody;
    items = body.items;
    if (!Array.isArray(items) || items.length === 0) throw new Error('empty');
  } catch {
    return Response.json({ error: 'bad_request' }, { status: 400 });
  }

  try {
    const groqRes = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        temperature: 0.4,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: 'You are a fashion stylist. You only reply with JSON.' },
          { role: 'user', content: buildPrompt(items) },
        ],
      }),
    });
    if (!groqRes.ok) throw new Error(`groq status ${groqRes.status}`);

    const data = (await groqRes.json()) as GroqChatResponse;
    const parsed = JSON.parse(data.choices[0].message.content) as Record<string, unknown>;
    const outfits = validatePicks(parsed.outfits, items);
    if (outfits.length === 0) throw new Error('no valid outfits');

    const responseBody: OutfitsResponseBody = { outfits };
    return Response.json(responseBody);
  } catch {
    return Response.json({ error: 'groq_failed' }, { status: 502 });
  }
}
