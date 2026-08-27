import { WishlistItem } from '@/interfaces/wishlist-item';
import { sql } from '@/lib/db';
import { requireAuth } from '@/lib/server/auth';

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
