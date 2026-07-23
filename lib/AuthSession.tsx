import { createContext, useContext, useMemo, useState, ReactNode } from 'react';
import { AuthSessionValue } from '@/interfaces/auth-session';

// Gates the tabs behind the login screen. This is a placeholder for real auth:
// the flag lives only in memory, so it is honest about not persisting a session —
// see the design system's "never fake anything" rule. When a real backend lands,
// signIn/signOut become the only things that change.
const AuthSessionContext = createContext<AuthSessionValue | null>(null);

export function AuthSessionProvider({ children }: { children: ReactNode }) {
  const [signedIn, setSignedIn] = useState(false);

  const value = useMemo<AuthSessionValue>(
    () => ({
      signedIn,
      signIn: () => setSignedIn(true),
      signOut: () => setSignedIn(false),
    }),
    [signedIn],
  );

  return <AuthSessionContext.Provider value={value}>{children}</AuthSessionContext.Provider>;
}

export function useAuthSession(): AuthSessionValue {
  const ctx = useContext(AuthSessionContext);
  if (!ctx) throw new Error('useAuthSession must be used within an AuthSessionProvider');
  return ctx;
}
