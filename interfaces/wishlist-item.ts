import { Category, Formality, Occasion, SeasonName } from '@/types/garment';

// A candidate garment the user saved from the extension to consider buying, as
// stored in wishlist_items. It holds the full garment shape (so it can be
// promoted straight into the wardrobe on purchase) plus the product it came from.
export interface WishlistItem {
  id: string;
  name: string;
  category: Category;
  color: string;
  formality: Formality;
  pattern: string;
  seasons: SeasonName[];
  occasions: Occasion[];
  productUrl: string | null;
  imageUrl: string | null;
  price: string | null;
  createdAt: string;
}
