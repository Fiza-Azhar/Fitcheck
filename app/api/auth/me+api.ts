import { MeResponseBody } from '@/interfaces/auth-session';
import { sql } from '@/lib/db';
import { requireAuth } from '@/lib/server/auth';

// Called once on cold start to turn a persisted token back into a user, the
// same role Supabase's getSession() played — except this one round-trips to
// the DB, since a bare JWT verify can't tell a deleted account from a live one.
export async function GET(request: Request): Promise<Response> {
  const auth = requireAuth(request);
  if (auth instanceof Response) return auth;

  const rows = await sql`select id, email, name from users where id = ${auth.userId}`;
  const user = rows[0] as { id: string; email: string; name: string } | undefined;
  if (!user) return Response.json({ error: 'unauthorized' }, { status: 401 });

  const responseBody: MeResponseBody = { user };
  return Response.json(responseBody);
}
