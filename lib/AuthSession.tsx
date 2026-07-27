import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { AuthSessionValue } from '@/interfaces/auth-session';
import { supabase } from '@/lib/supabase';

// Gates the tabs behind the login screen. Backed by real Supabase Auth: the
// session is restored from storage on mount and kept live via onAuthStateChange,
// so a signed-in user survives cold starts. Failures reject rather than resolve
// to a fake signed-in state — the screens surface the message.
const AuthSessionContext = createContext<AuthSessionValue | null>(null);

export function AuthSessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Restore any persisted session first, then flip loading off so the gate can
    // decide. getSession reads storage; it does not hit the network.
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    // Stay in sync with sign-in / sign-out / token-refresh from anywhere.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const value = useMemo<AuthSessionValue>(
    () => ({
      session,
      user: session?.user ?? null,
      loading,
      signIn: async (email, password) => {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      },
      signUp: async (name, email, password) => {
        // Name is kept in user metadata; there is no separate profiles table yet.
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { name } },
        });
        if (error) throw error;
      },
      signOut: async () => {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
      },
    }),
    [session, loading],
  );

  return <AuthSessionContext.Provider value={value}>{children}</AuthSessionContext.Provider>;
}

export function useAuthSession(): AuthSessionValue {
  const ctx = useContext(AuthSessionContext);
  if (!ctx) throw new Error('useAuthSession must be used within an AuthSessionProvider');
  return ctx;
}
