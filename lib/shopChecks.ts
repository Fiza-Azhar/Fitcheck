import { ShopCheck } from '@/interfaces/shop-check';
import { ShopCheckGroup } from '@/interfaces/shop-check-group';

// `shop_checks` is an append-only history log: the extension writes a row every
// time you open a product page, so re-visiting an item three times leaves three
// rows. The feed reads better as "items you looked at" than as a keystroke log,
// so rows collapse to one per product and the most recent check is the one shown.
//
// Nothing is deleted — this is a display concern only. The full history stays in
// the table for anything that later wants it.

// Query parameters that describe how you *arrived* at a product, not which
// product it is. Only these are stripped.
//
// The list is deliberately short. Plenty of shops carry the real product identity
// in the query string (?variant=, ?item=, ?sku=, ?pid=), so blanket-stripping the
// query would merge genuinely different products and hide one of them — a worse
// failure than showing a duplicate. When in doubt, keep the parameter.
const TRACKING_PARAMS = new Set([
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'utm_id',
  'fbclid',
  'gclid',
  'msclkid',
  'igshid',
  'ttclid',
  'ref',
  'ref_src',
  'referrer',
  'source',
  'spm',
  'scm',
]);

/**
 * Identity of the product a check refers to. Two checks share a key when they
 * point at the same product page reached by different routes — from a search
 * result, an ad, or a direct link.
 */
export function productKey(check: ShopCheck): string {
  const raw = check.productUrl.trim();
  try {
    const url = new URL(raw);

    for (const name of [...url.searchParams.keys()]) {
      if (TRACKING_PARAMS.has(name.toLowerCase())) url.searchParams.delete(name);
    }
    // Query order differs between a search result and a direct link to the same
    // page, so sort what survives — otherwise ?a=1&b=2 and ?b=2&a=1 read as two
    // different products.
    url.searchParams.sort();

    // Fragments address a spot on the page, never a different product.
    url.hash = '';
    url.hostname = url.hostname.replace(/^www\./, '');
    // Trailing slashes are cosmetic: /p/shirt and /p/shirt/ are the same page.
    url.pathname = url.pathname.replace(/\/+$/, '') || '/';

    return url.toString();
  } catch {
    // The extension stores whatever the page gave it, which is not guaranteed to
    // parse. Fall back to the raw string so the row still dedupes against an
    // identical one, rather than being dropped or breaking the feed.
    return raw.toLowerCase();
  }
}

/**
 * Collapses repeat checks of the same product into one group each.
 *
 * `checks` must already be sorted newest-first: the first row seen for a key is
 * therefore the most recent, and the groups keep that newest-to-oldest order
 * (Map iterates in insertion order).
 *
 * Each group carries every raw `productUrl` that fed into it, because deleting an
 * entry from the feed has to delete all of its rows — see ShopCheckGroup.
 */
export function groupChecks(checks: ShopCheck[]): ShopCheckGroup[] {
  const byKey = new Map<string, ShopCheckGroup>();
  for (const check of checks) {
    const key = productKey(check);
    const group = byKey.get(key);
    if (!group) {
      byKey.set(key, { check, urls: [check.productUrl] });
      continue;
    }
    // Same product, different link (a tracking parameter differed). Keep the URL
    // so the delete covers it, but leave `check` alone — it is already the newest.
    if (!group.urls.includes(check.productUrl)) group.urls.push(check.productUrl);
  }
  return [...byKey.values()];
}
