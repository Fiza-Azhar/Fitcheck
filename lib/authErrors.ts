// Turns a raw auth error into a short, human sentence for the auth screens.
// The API routes (app/api/auth/*+api.ts) throw messages matching these
// substrings on purpose, so this needed no changes when auth moved off
// Supabase. Unknown errors fall through to their own message rather than a
// canned "something went wrong", so a real cause is never hidden — the app's
// rule.
export function authErrorMessage(e: unknown): string {
  const raw = e instanceof Error ? e.message : String(e);
  const m = raw.toLowerCase();

  if (m.includes('invalid login credentials')) return 'Incorrect email or password.';
  if (m.includes('already registered') || m.includes('already been registered')) {
    return 'An account with this email already exists.';
  }
  if (m.includes('password should be at least')) return 'Password is too short (min 6 characters).';
  if (m.includes('unable to validate email') || m.includes('invalid email')) {
    return 'That email address looks invalid.';
  }
  if (m.includes('email not confirmed')) return 'Please confirm your email before signing in.';
  if (m.includes('network') || m.includes('fetch')) {
    return "Can't reach the server — check your connection.";
  }
  return raw;
}
