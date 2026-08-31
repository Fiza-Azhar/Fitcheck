// A product the browser extension checked while shopping, as stored in the
// shop_checks table and shown in the app's "Recently checked" list. It is a
// history record, not a garment: it keeps what was seen and the verdict summary.
export type ShopVerdict = 'similar' | 'goes' | 'fresh' | 'not_garment';

export interface ShopCheck {
  id: string;
  title: string;
  productUrl: string;
  imageUrl: string | null;
  price: string | null;
  category: string | null;
  color: string | null;
  verdict: ShopVerdict;
  goesWithCount: number;
  alreadyOwnCount: number;
  checkedAt: string;
}

// POST /api/shop-checks body — what the browser extension sends after checking
// a product against the wardrobe. id/checkedAt are assigned server-side.
export type CreateShopCheckRequestBody = Omit<ShopCheck, 'id' | 'checkedAt'>;
