import { sql } from '@/lib/db';
import { requireAuth } from '@/lib/server/auth';

export async function DELETE(request: Request, { id }: Record<string, string>): Promise<Response> {
  const auth = requireAuth(request);
  if (auth instanceof Response) return auth;

  // Scoped by userId as well as id, the same boundary RLS used to enforce — a
  // guessed id belonging to another account deletes nothing.
  await sql`delete from garments where id = ${id} and "userId" = ${auth.userId}`;
  return Response.json({ ok: true });
}
