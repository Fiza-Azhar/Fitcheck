import { Garment } from '@/interfaces/garment';

export interface Outfit {
  id: string;
  top: Garment;
  bottom: Garment;
  shoes: Garment;
  score: number;   // 0..100
  reason: string;
}
