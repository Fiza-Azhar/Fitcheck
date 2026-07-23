import { Garment } from '@/interfaces/garment';
import { Occasion } from '@/types/garment';

// generateOutfits() lived here and paired the first available top/bottom/shoes
// with hardcoded scores and canned reasons. Removed when outfit suggestions
// became real: it existed only as lib/ai.ts's silent fallback, and that fallback
// is what disguised a dead Groq integration as a working one.

export function shopMatches(items: Garment[], targetOccasion: Occasion): Garment[] {
  return items.filter((g) => g.occasions.includes(targetOccasion));
}
