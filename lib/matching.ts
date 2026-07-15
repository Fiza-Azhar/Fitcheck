import { Garment } from '@/interfaces/garment';
import { Outfit } from '@/interfaces/outfit';
import { Occasion } from '@/types/garment';

const REASONS = [
  'Neutral tones, office-appropriate',
  'Relaxed weekend pairing',
  'Smart-casual, easy to dress up',
];

// DUMMY: pairs first available top/bottom/shoes into up to 3 outfits.
// Real algorithm (color harmony + formality proximity) replaces this body later;
// signature and Outfit shape stay identical.
export function generateOutfits(items: Garment[]): Outfit[] {
  const tops = items.filter((g) => g.category === 'top');
  const bottoms = items.filter((g) => g.category === 'bottom');
  const shoes = items.filter((g) => g.category === 'footwear');
  const count = Math.min(3, tops.length, bottoms.length, shoes.length);
  const outfits: Outfit[] = [];
  for (let i = 0; i < count; i++) {
    outfits.push({
      id: `o${i + 1}`,
      top: tops[i], bottom: bottoms[i], shoes: shoes[i],
      score: 92 - i * 7,
      reason: REASONS[i % REASONS.length],
    });
  }
  return outfits;
}

export function shopMatches(items: Garment[], targetOccasion: Occasion): Garment[] {
  return items.filter((g) => g.occasions.includes(targetOccasion));
}
