import { Garment } from '@/interfaces/garment';

export interface Outfit {
  id: string;
  name: string;
  top: Garment;
  bottom: Garment;
  shoes: Garment | null;  // optional: null when the wardrobe has no footwear
  score: number;   // 0..100
  reason: string;
}
