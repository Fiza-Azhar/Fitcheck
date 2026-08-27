import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import { AuthResponseBody, AuthSessionValue, AuthUser, MeResponseBody } from '@/interfaces/auth-session';
import { apiFetch, getToken, setToken } from '@/lib/apiClient';

// Gates the tabs behind the login screen. Backed by a hand-rolled JWT (see
// lib/server/auth.ts) instead of Supabase Auth: the token is restored from
// storage on mount and traded for the current user via /api/auth/me, so a
// signed-in user survives cold starts. Failures reject rather than resolve to a
// fake signed-in state — the screens surface the message.
const AuthSessionContext = createContext<AuthSessionValue | null>(null);

export function AuthSessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const token = await getToken();
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const { user: me } = await apiFetch<MeResponseBody>('/api/auth/me');
        setUser(me);
      } catch {
        // Token expired, was revoked, or the account is gone — same outcome as
        // never having signed in.
        await setToken(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const value = useMemo<AuthSessionValue>(
    () => ({
      session: user ? { user } : null,
      user,
      loading,
      signIn: async (email, password) => {
        const res = await apiFetch<AuthResponseBody>('/api/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email, password }),
        });
        await setToken(res.token);
        setUser(res.user);
      },
      signUp: async (name, email, password) => {
        const res = await apiFetch<AuthResponseBody>('/api/auth/signup', {
          method: 'POST',
          body: JSON.stringify({ name, email, password }),
        });
        await setToken(res.token);
        setUser(res.user);
      },
      signOut: async () => {
        await setToken(null);
        setUser(null);
      },
    }),
    [user, loading],
  );

  return <AuthSessionContext.Provider value={value}>{children}</AuthSessionContext.Provider>;
}

export function useAuthSession(): AuthSessionValue {
  const ctx = useContext(AuthSessionContext);
  if (!ctx) throw new Error('useAuthSession must be used within an AuthSessionProvider');
  return ctx;
}
