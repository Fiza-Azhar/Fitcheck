import { ShopCheck } from '@/interfaces/shop-check';
import { ShopCheckGroup } from '@/interfaces/shop-check-group';
import { groupChecks } from '@/lib/shopChecks';
import { apiFetch } from '@/lib/apiClient';

// Reads the shopping checks the extension logged, via /api/shop-checks (scoped
// to the signed-in user by the bearer token — the same account whose wardrobe
// the extension compared against). Failures throw — an empty feed is a real
// state, a broken query is not.
//
// Returns at most `limit` *distinct products*, most recently checked first.
// `checkedAt` is a text column, but every writer stores an ISO-8601 UTC string,
// which sorts lexicographically in the same order as chronologically.
export async function fetchRecentChecks(limit = 40): Promise<ShopCheckGroup[]> {
  const checks = await apiFetch<ShopCheck[]>('/api/shop-checks');
  return groupChecks(checks).slice(0, limit);
}

// Removes a product from the feed entirely.
//
// Deletes by `productUrl` rather than by row id on purpose: one feed entry
// stands for every time the product was checked, and matching on the URL also
// clears rows older than the route's scan window that we never loaded. Deleting
// only the ids we happen to be holding would leave those behind to resurface
// later.
export async function deleteChecksForProduct(productUrls: string[]): Promise<void> {
  if (productUrls.length === 0) return;
  await apiFetch<{ ok: true }>('/api/shop-checks', {
    method: 'DELETE',
    body: JSON.stringify({ productUrls }),
  });
}
