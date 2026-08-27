import { CreateShopCheckRequestBody, ShopCheck } from '@/interfaces/shop-check';
import { sql } from '@/lib/db';
import { requireAuth } from '@/lib/server/auth';

// Mirrors the old SCAN_LIMIT in lib/shopChecksApi.ts: more rows than the
// display limit, because the same product can occupy many history rows and
// grouping happens client-side in lib/shopChecks.ts.
const SCAN_LIMIT = 200;

function newShopCheckId(): string {
  return `sc${Date.now()}${Math.random().toString(36).slice(2, 7)}`;
}

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

// Written by the browser extension after checking a product against the
// wardrobe — the app only ever reads this table via GET.
export async function POST(request: Request): Promise<Response> {
  const auth = requireAuth(request);
  if (auth instanceof Response) return auth;

  let body: CreateShopCheckRequestBody;
  try {
    body = (await request.json()) as CreateShopCheckRequestBody;
  } catch {
    return Response.json({ error: 'bad_request' }, { status: 400 });
  }

  const rows = await sql`
    insert into shop_checks (
      id, "userId", title, "productUrl", "imageUrl", price, category, color,
      verdict, "goesWithCount", "alreadyOwnCount", "checkedAt"
    ) values (
      ${newShopCheckId()}, ${auth.userId}, ${body.title}, ${body.productUrl}, ${body.imageUrl},
      ${body.price}, ${body.category}, ${body.color}, ${body.verdict},
      ${body.goesWithCount}, ${body.alreadyOwnCount}, ${new Date().toISOString()}
    )
    returning id, title, "productUrl", "imageUrl", price, category, color, verdict,
              "goesWithCount", "alreadyOwnCount", "checkedAt"
  `;
  return Response.json(rows[0] as ShopCheck);
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
