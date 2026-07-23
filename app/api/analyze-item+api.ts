import { CATEGORIES, OCCASIONS, SEASONS } from '@/constants/garment';
import { GroqChatResponse } from '@/interfaces/ai';
import { AnalyzeItemRequestBody, AnalyzeItemResponseBody } from '@/interfaces/item-analysis';
import { isUsableBase64Image, parseAnalysis } from '@/lib/server/validation';

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
// Groq's current vision model. The previous one
// (meta-llama/llama-4-scout-17b-16e-instruct) was a preview model and Groq
// removed it from the API, which made every analysis fail. Vision models here
// are volatile — verify the id against https://console.groq.com/docs/vision
// (or GET /openai/v1/models) if analysis starts failing again. Only this
// constant changes when it moves.
const GROQ_VISION_MODEL = 'qwen/qwen3.6-27b';

const PROMPT =
  `First decide whether this photo shows a single wearable clothing item that is a ` +
  `${CATEGORIES.join(', ')}. If it does NOT — e.g. a cup, food, a face, a room, a pet, or an ` +
  `accessory like a bag, watch or jewellery — respond with exactly {"isGarment": false} and nothing else.\n\n` +
  `Otherwise identify the clothing item and respond with this exact JSON shape and nothing else:\n` +
  `{"isGarment": true,"name":"...","category":"...","color":"#RRGGBB","pattern":"...","formality":3,` +
  `"seasons":["..."],"occasions":["..."]}\n\n` +
  `Rules:\n` +
  `- name: short natural garment description, max 5 words (e.g. "Navy Wool Blazer").\n` +
  `- category: exactly one of ${CATEGORIES.join(', ')}.\n` +
  `- color: the garment's dominant colour as a 6-digit hex code.\n` +
  `- pattern: one or two words (e.g. "solid", "striped", "printed", "checked").\n` +
  `- formality: integer 1-5, where 1 is very casual and 5 is black tie.\n` +
  `- seasons: non-empty subset of ${SEASONS.join(', ')} the item suits.\n` +
  `- occasions: non-empty subset of ${OCCASIONS.join(', ')} the item suits.`;

export async function POST(request: Request): Promise<Response> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return Response.json({ error: 'no_key' }, { status: 503 });
  }

  let imageBase64: string;
  try {
    const body = (await request.json()) as AnalyzeItemRequestBody;
    if (!isUsableBase64Image(body.imageBase64)) throw new Error('bad image');
    imageBase64 = body.imageBase64;
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
        model: GROQ_VISION_MODEL,
        temperature: 0.2,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: PROMPT },
              { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${imageBase64}` } },
            ],
          },
        ],
      }),
    });
    if (!groqRes.ok) throw new Error(`groq status ${groqRes.status}`);

    const data = (await groqRes.json()) as GroqChatResponse;
    const raw = JSON.parse(data.choices[0].message.content) as Record<string, unknown>;

    // The model's own verdict that this isn't clothing. A positive rejection,
    // distinct from a failed analysis — the client blocks the save on this.
    if (raw.isGarment === false) {
      return Response.json({ error: 'not_garment' }, { status: 422 });
    }

    const parsed = parseAnalysis(raw);
    if (!parsed) throw new Error('analysis failed validation');

    const responseBody: AnalyzeItemResponseBody = { draft: parsed };
    return Response.json(responseBody);
  } catch (e) {
    // Log the real cause: a swallowed error here (e.g. a discontinued model)
    // otherwise surfaces only as blank fields on the Add screen, with no hint why.
    console.error('[analyze-item] Groq vision failed:', e);
    return Response.json({ error: 'groq_failed' }, { status: 502 });
  }
}
