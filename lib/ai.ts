import { Garment } from '@/interfaces/garment';
import { Outfit } from '@/interfaces/outfit';
import { OutfitsResponseBody, GetOutfitsResult } from '@/interfaces/ai';
import { generateOutfits } from '@/lib/matching';

const TIMEOUT_MS = 8000;

// Tries the real-AI backend first; on ANY failure returns the dummy
// generateOutfits result so the app behaves exactly like the prototype.
export async function getOutfits(items: Garment[]): Promise<GetOutfitsResult> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    let res: Response;
    try {
      res = await fetch('/api/outfits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }
    if (!res.ok) throw new Error(`api status ${res.status}`);

    const data = (await res.json()) as OutfitsResponseBody;
    const byId = new Map(items.map((g) => [g.id, g]));
    const outfits: Outfit[] = [];
    data.outfits.forEach((p, i) => {
      const top = byId.get(p.topId);
      const bottom = byId.get(p.bottomId);
      const shoes = byId.get(p.shoesId);
      if (!top || !bottom || !shoes) return;
      outfits.push({ id: `ai${i + 1}`, top, bottom, shoes, score: p.score, reason: p.reason });
    });
    if (outfits.length === 0) throw new Error('no valid outfits');

    return { outfits, source: 'ai' };
  } catch {
    return { outfits: generateOutfits(items), source: 'dummy' };
  }
}
