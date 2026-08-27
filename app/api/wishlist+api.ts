import { CreateWishlistItemRequestBody, WishlistItem } from '@/interfaces/wishlist-item';
import { sql } from '@/lib/db';
import { requireAuth } from '@/lib/server/auth';

function newWishlistId(): string {
  return `wl${Date.now()}${Math.random().toString(36).slice(2, 7)}`;
}

export async function GET(request: Request): Promise<Response> {
  const auth = requireAuth(request);
  if (auth instanceof Response) return auth;

  const rows = await sql`
    select id, name, category, color, formality, pattern, seasons, occasions,
           "productUrl", "imageUrl", price, "createdAt"
    from wishlist_items
    where "userId" = ${auth.userId}
    order by "createdAt" desc
  `;
  return Response.json(rows as WishlistItem[]);
}

// Written by the browser extension when the user saves a scraped product — the
// app only ever reads this table via GET.
export async function POST(request: Request): Promise<Response> {
  const auth = requireAuth(request);
  if (auth instanceof Response) return auth;

  let body: CreateWishlistItemRequestBody;
  try {
    body = (await request.json()) as CreateWishlistItemRequestBody;
  } catch {
    return Response.json({ error: 'bad_request' }, { status: 400 });
  }

  const rows = await sql`
    insert into wishlist_items (
      id, "userId", name, category, color, formality, pattern, seasons, occasions,
      "productUrl", "imageUrl", price, "createdAt"
    ) values (
      ${newWishlistId()}, ${auth.userId}, ${body.name}, ${body.category}, ${body.color},
      ${body.formality}, ${body.pattern}, ${JSON.stringify(body.seasons)}, ${JSON.stringify(body.occasions)},
      ${body.productUrl}, ${body.imageUrl}, ${body.price}, ${new Date().toISOString()}
    )
    returning id, name, category, color, formality, pattern, seasons, occasions,
              "productUrl", "imageUrl", price, "createdAt"
  `;
  return Response.json(rows[0] as WishlistItem);
}
