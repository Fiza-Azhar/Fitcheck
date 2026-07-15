import { Garment } from '@/interfaces/garment';
import { ShopVariant } from '@/types/shop';
export interface MatchBadgeProps { variant: ShopVariant; count: number; thumbnails: Garment[]; }
