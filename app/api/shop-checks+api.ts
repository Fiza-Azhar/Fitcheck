import { ShopCheck } from '@/interfaces/shop-check';
import { sql } from '@/lib/db';
import { requireAuth } from '@/lib/server/auth';

// Mirrors the old SCAN_LIMIT in lib/shopChecksApi.ts: more rows than the
// display limit, because the same product can occupy many history rows and
// grouping happens client-side in lib/shopChecks.ts.
const SCAN_LIMIT = 200;

export async function GET(request: Request): Promise<Response> {
  const auth = requireAuth(request);
  if (auth instanceof Response) return auth;

  const rows = await sql`
    select id, title, "productUrl", "imageUrl", price, category, color, verdict,
           "goesWithCount", "alreadyOwnCount", "checkedAt"
    from shop_checks
    where "userId" = ${auth.userId}
    order by "checkedAt" desc
    limit ${SCAN_LIMIT}
  `;
  return Response.json(rows as ShopCheck[]);
}

export async function DELETE(request: Request): Promise<Response> {
  const auth = requireAuth(request);
  if (auth instanceof Response) return auth;

  let productUrls: string[];
  try {
    const body = (await request.json()) as { productUrls: string[] };
    productUrls = body.productUrls;
    if (!Array.isArray(productUrls)) throw new Error('bad body');
  } catch {
    return Response.json({ error: 'bad_request' }, { status: 400 });
  }
  if (productUrls.length === 0) return Response.json({ ok: true });

  await sql`
    delete from shop_checks
    where "userId" = ${auth.userId} and "productUrl" = any(${productUrls})
  `;
  return Response.json({ ok: true });
}
