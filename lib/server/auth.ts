import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// Replaces Supabase Auth: a small hand-rolled JWT scheme. The token carries
// only the user id ("sub") and is verified on every data route (garments,
// wishlist, shop-checks) to recover the caller's userId for filtering — this is
// the enforcement point that RLS used to be, now living in application code
// instead of a DB policy.
function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Auth not configured: set ${name} in .env`);
  return value;
}

const JWT_SECRET = requiredEnv('JWT_SECRET');

// Long-lived on purpose: there is no refresh-token flow here, unlike Supabase's
// auto-refreshing session. A month matches how long the app expects to keep
// someone signed in between explicit sign-outs.
const TOKEN_TTL = '30d';

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function signToken(userId: string): string {
  return jwt.sign({ sub: userId }, JWT_SECRET, { expiresIn: TOKEN_TTL });
}

// Throws on a missing/invalid/expired token — every caller maps that straight
// to a 401 rather than inventing an "anonymous" fallback identity.
export function userIdFromRequest(request: Request): string {
  const header = request.headers.get('authorization') ?? '';
  const token = header.startsWith('Bearer ') ? header.slice('Bearer '.length) : null;
  if (!token) throw new Error('missing token');

  const payload = jwt.verify(token, JWT_SECRET);
  if (typeof payload === 'string' || typeof payload.sub !== 'string') {
    throw new Error('malformed token');
  }
  return payload.sub;
}

// Shared entry point for every data route: a valid userId to filter by, or a
// 401 Response ready to return as-is. Keeps the "no token / bad token" branch
// out of each route body.
export function requireAuth(request: Request): { userId: string } | Response {
  try {
    return { userId: userIdFromRequest(request) };
  } catch {
    return Response.json({ error: 'unauthorized' }, { status: 401 });
  }
}
