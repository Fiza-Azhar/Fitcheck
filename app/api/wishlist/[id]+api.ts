import { sql } from '@/lib/db';
import { requireAuth } from '@/lib/server/auth';

export async function DELETE(request: Request, { id }: Record<string, string>): Promise<Response> {
  const auth = requireAuth(request);
  if (auth instanceof Response) return auth;

  await sql`delete from wishlist_items where id = ${id} and "userId" = ${auth.userId}`;
  return Response.json({ ok: true });
}
