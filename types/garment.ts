import { CATEGORIES, OCCASIONS, SEASONS } from '@/constants/garment';

export type Category = (typeof CATEGORIES)[number];
export type Occasion = (typeof OCCASIONS)[number];
export type SeasonName = (typeof SEASONS)[number];
export type Formality = 1 | 2 | 3 | 4 | 5;
