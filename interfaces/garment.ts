import { Category, Occasion, SeasonName } from '@/types/garment';

export interface Garment {
  id: string;
  name: string;
  category: Category;
  color: string;          // hex, used as tile background
  formality: 1 | 2 | 3 | 4 | 5;
  pattern: string;
  seasons: SeasonName[];
  occasions: Occasion[];
  wearCount: number;
  image: string | null;
}
