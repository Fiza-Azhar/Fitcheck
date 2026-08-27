import { AuthResponseBody, SignupRequestBody } from '@/interfaces/auth-session';
import { sql } from '@/lib/db';
import { hashPassword, signToken } from '@/lib/server/auth';

// Messages match the substrings lib/authErrors.ts already looks for (carried
// over from the Supabase error-mapping days), so that file needed no changes.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request): Promise<Response> {
  let body: SignupRequestBody;
  try {
    body = (await request.json()) as SignupRequestBody;
  } catch {
    return Response.json({ error: 'bad_request' }, { status: 400 });
  }

  const name = body.name?.trim();
  const email = body.email?.trim().toLowerCase();
  const password = body.password ?? '';

  if (!name || !email) {
    return Response.json({ error: 'bad_request' }, { status: 400 });
  }
  if (!EMAIL_RE.test(email)) {
    return Response.json({ error: 'Unable to validate email address: invalid format' }, { status: 422 });
  }
  if (password.length < 6) {
    return Response.json({ error: 'Password should be at least 6 characters.' }, { status: 422 });
  }

  const existing = await sql`select id from users where email = ${email}`;
  if (existing.length > 0) {
    return Response.json({ error: 'User already registered' }, { status: 422 });
  }

  const passwordHash = await hashPassword(password);
  const rows = await sql`
    insert into users (email, "passwordHash", name)
    values (${email}, ${passwordHash}, ${name})
    returning id, email, name
  `;
  const user = rows[0] as { id: string; email: string; name: string };

  const responseBody: AuthResponseBody = { token: signToken(user.id), user };
  return Response.json(responseBody);
}
