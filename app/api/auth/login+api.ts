import { AuthResponseBody, LoginRequestBody } from '@/interfaces/auth-session';
import { sql } from '@/lib/db';
import { signToken, verifyPassword } from '@/lib/server/auth';

export async function POST(request: Request): Promise<Response> {
  let body: LoginRequestBody;
  try {
    body = (await request.json()) as LoginRequestBody;
  } catch {
    return Response.json({ error: 'bad_request' }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  const password = body.password ?? '';
  if (!email || !password) {
    return Response.json({ error: 'bad_request' }, { status: 400 });
  }

  const rows = await sql`
    select id, email, name, "passwordHash" from users where email = ${email}
  `;
  const row = rows[0] as { id: string; email: string; name: string; passwordHash: string } | undefined;

  // Same message whether the email doesn't exist or the password is wrong —
  // distinguishing them would let a caller enumerate registered emails.
  if (!row || !(await verifyPassword(password, row.passwordHash))) {
    return Response.json({ error: 'Invalid login credentials' }, { status: 401 });
  }

  const responseBody: AuthResponseBody = {
    token: signToken(row.id),
    user: { id: row.id, email: row.email, name: row.name },
  };
  return Response.json(responseBody);
}
