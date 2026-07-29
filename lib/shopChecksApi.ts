import { ShopCheck } from '@/interfaces/shop-check';
import { ShopCheckGroup } from '@/interfaces/shop-check-group';
import { groupChecks } from '@/lib/shopChecks';
import { supabase } from '@/lib/supabase';

// How many raw history rows to scan before collapsing duplicates. It is larger
// than the display limit on purpose: the same product can occupy many rows, so
// scanning only `limit` rows would let a user who re-opened one page 40 times end
// up with a feed of a single item. This is the row budget, not the item count.
const SCAN_LIMIT = 200;

// Reads the shopping checks the extension logged. Talks straight to Supabase with
// the anon key; RLS returns only the signed-in user's rows, so this is the same
// account whose wardrobe the extension compared against. Failures throw — an
// empty feed is a real state, a broken query is not.
//
// Returns at most `limit` *distinct products*, most recently checked first.
// `checkedAt` is a text column, but every writer stores an ISO-8601 UTC string,
// which sorts lexicographically in the same order as chronologically.
export async function fetchRecentChecks(limit = 40): Promise<ShopCheckGroup[]> {
  const { data, error } = await supabase
    .from('shop_checks')
    .select('*')
    .order('checkedAt', { ascending: false })
    .limit(SCAN_LIMIT);
  if (error) throw new Error(error.message);
  return groupChecks(data as ShopCheck[]).slice(0, limit);
}

// Removes a product from the feed entirely.
//
// Deletes by `productUrl` rather than by row id on purpose: one feed entry stands
// for every time the product was checked, and matching on the URL also clears
// rows older than the SCAN_LIMIT window that we never loaded. Deleting only the
// ids we happen to be holding would leave those behind to resurface later.
//
// RLS scopes the delete to the signed-in user, so this can never reach another
// account's history even though it filters on a URL rather than an id.
export async function deleteChecksForProduct(productUrls: string[]): Promise<void> {
  if (productUrls.length === 0) return;
  const { error } = await supabase.from('shop_checks').delete().in('productUrl', productUrls);
  if (error) throw new Error(error.message);
}
