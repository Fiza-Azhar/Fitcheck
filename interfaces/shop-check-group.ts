import { ShopCheck } from '@/interfaces/shop-check';

// One product in the "Recently checked" feed, standing in for every time it was
// checked. `shop_checks` is an append-only log — re-opening a product page adds
// another row — so the feed shows one entry per product rather than one per visit.
export interface ShopCheckGroup {
  // The most recent check for this product. This is what the row renders, so the
  // verdict and timestamp shown are always the latest ones.
  check: ShopCheck;
  // Every distinct raw `productUrl` that collapsed into this group. Deleting the
  // entry has to delete all of them: removing only the newest row would let an
  // older one resurface as the "most recent" on the very next load.
  urls: string[];
}
