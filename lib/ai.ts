import { Garment } from '@/interfaces/garment';
import { Outfit } from '@/interfaces/outfit';
import { OutfitsRequestBody, OutfitsResponseBody } from '@/interfaces/ai';
import { Occasion } from '@/types/garment';

const TIMEOUT_MS = 15000;

// No fallback. This used to swallow every failure and return generateOutfits()
// instead, which made a missing API key look exactly like a working stylist —
// and hid a completely dead Groq integration. Failures now propagate and the
// screen shows them.
export async function getOutfits(items: Garment[], occasion?: Occasion): Promise<Outfit[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let res: Response;
  try {
    const body: OutfitsRequestBody = { items, occasion };
    res = await fetch('/api/outfits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }

  if (res.status === 503) throw new Error('No Groq API key is configured on the server.');
  if (!res.ok) throw new Error(`The stylist is unavailable right now (${res.status}).`);

  const data = (await res.json()) as OutfitsResponseBody;
  const byId = new Map(items.map((g) => [g.id, g]));

  const outfits: Outfit[] = [];
  data.outfits.forEach((p, i) => {
    const top = byId.get(p.topId);
    const bottom = byId.get(p.bottomId);
    // Shoes are optional; a named-but-missing shoe just drops to null.
    const shoes = p.shoesId ? byId.get(p.shoesId) ?? null : null;
    if (!top || !bottom) return;
    outfits.push({ id: `ai${i + 1}`, name: p.name, top, bottom, shoes, score: p.score, reason: p.reason });
  });

  if (outfits.length === 0) {
    throw new Error('The stylist could not put together an outfit from these items.');
  }
  return outfits;
}
