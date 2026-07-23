import { Garment } from '@/interfaces/garment';
import { AiOutfitPick, OutfitsRequestBody, OutfitsResponseBody, GroqChatResponse } from '@/interfaces/ai';
import { Occasion } from '@/types/garment';
import { OCCASIONS } from '@/constants/garment';

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.3-70b-versatile';

function isPick(v: unknown): v is AiOutfitPick {
  if (typeof v !== 'object' || v === null) return false;
  const p = v as Record<string, unknown>;
  return (
    typeof p.topId === 'string' &&
    typeof p.bottomId === 'string' &&
    (p.shoesId === undefined || typeof p.shoesId === 'string') &&
    typeof p.name === 'string' &&
    typeof p.score === 'number' &&
    p.score >= 0 && p.score <= 100 &&
    typeof p.reason === 'string'
  );
}

// Keep only picks whose ids exist in the wardrobe with the right category per slot.
function validatePicks(raw: unknown, items: Garment[]): AiOutfitPick[] {
  if (!Array.isArray(raw)) return [];
  const byId = new Map(items.map((g) => [g.id, g]));

  const valid = raw.filter(isPick).filter((p) => {
    // Shoes are optional: allowed to be absent, but if named must be footwear.
    const shoesOk = !p.shoesId || byId.get(p.shoesId)?.category === 'footwear';
    return (
      byId.get(p.topId)?.category === 'top' &&
      byId.get(p.bottomId)?.category === 'bottom' &&
      shoesOk
    );
  });

  // An outfit's identity is its top+bottom pair, NOT the exact item set. Asked
  // for more outfits than the wardrobe affords, the model repeats a pair — and
  // with shoes optional it even returns the same pair once with a shoe and once
  // without, which read as duplicates. So dedupe on the pair and, when a pair
  // repeats, keep the variant that includes footwear (the richer card).
  const byPair = new Map<string, AiOutfitPick>();
  for (const p of valid) {
    const key = `${p.topId}|${p.bottomId}`;
    const existing = byPair.get(key);
    if (!existing || (!existing.shoesId && p.shoesId)) byPair.set(key, p);
  }
  return [...byPair.values()].slice(0, 3);
}

function buildPrompt(items: Garment[], occasion?: Occasion): string {
  const catalogue = items
    .map(
      (g) =>
        `id=${g.id} | ${g.name} | category=${g.category} | color=${g.color} | ` +
        `formality=${g.formality}/5 | pattern=${g.pattern} | ` +
        `seasons=${g.seasons.join(',')} | occasions=${g.occasions.join(',')}`,
    )
    .join('\n');
  const occasionLine = occasion
    ? `The user is dressing for: ${occasion}. Prioritise items tagged with that occasion and a ` +
      `fitting formality, and let each outfit's name reflect the occasion. `
    : '';
  return (
    `Here is a wardrobe:\n${catalogue}\n\n` +
    occasionLine +
    `Suggest up to 3 outfits that pair well (color harmony, similar formality, shared occasions). ` +
    `Each outfit uses exactly one category=top and one category=bottom item, by id. ` +
    `When the wardrobe contains footwear, EVERY outfit must include one category=footwear item (shoesId); ` +
    `if it has none, omit shoesId entirely. ` +
    `Every outfit must use a DIFFERENT top+bottom pair — never reuse the same top and bottom together, ` +
    `even with different shoes. If the wardrobe only supports one or two distinct top+bottom pairs, ` +
    `return only that many — never pad to three. ` +
    `Respond with a JSON object of this exact shape and nothing else: ` +
    `{"outfits":[{"topId":"...","bottomId":"...","shoesId":"...","name":"...","score":85,"reason":"..."}]} ` +
    `where shoesId is optional, name is a short outfit title of max 4 words, ` +
    `score is 0-100 (how well the outfit works) and reason is a short explanation of max 12 words.`
  );
}

export async function POST(request: Request): Promise<Response> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return Response.json({ error: 'no_key' }, { status: 503 });
  }

  let items: Garment[];
  let occasion: Occasion | undefined;
  try {
    const body = (await request.json()) as OutfitsRequestBody;
    items = body.items;
    if (!Array.isArray(items) || items.length === 0) throw new Error('empty');
    // Ignore anything outside the known vocabulary rather than trusting it.
    occasion = (OCCASIONS as readonly string[]).includes(body.occasion as string)
      ? (body.occasion as Occasion)
      : undefined;
  } catch (e) {
    console.error('[outfits] bad request:', e);
    return Response.json({ error: 'bad_request' }, { status: 400 });
  }

  console.log('[outfits] request:', {
    itemCount: items.length,
    occasion: occasion ?? '(none)',
    categories: [...new Set(items.map((g) => g.category))],
  });

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
          { role: 'user', content: buildPrompt(items, occasion) },
        ],
      }),
    });
    if (!groqRes.ok) throw new Error(`groq status ${groqRes.status}`);

    const data = (await groqRes.json()) as GroqChatResponse;
    const parsed = JSON.parse(data.choices[0].message.content) as Record<string, unknown>;
    const rawCount = Array.isArray(parsed.outfits) ? parsed.outfits.length : 'not-an-array';
    const outfits = validatePicks(parsed.outfits, items);
    console.log('[outfits] groq returned', rawCount, 'picks,', outfits.length, 'valid after checks');
    if (outfits.length === 0) throw new Error('no valid outfits');

    const responseBody: OutfitsResponseBody = { outfits };
    return Response.json(responseBody);
  } catch (e) {
    console.error('[outfits] failed:', e);
    return Response.json({ error: 'groq_failed' }, { status: 502 });
  }
}
