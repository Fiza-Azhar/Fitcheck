import { Session, User } from '@supabase/supabase-js';

export interface AuthSessionValue {
  // The live Supabase session, or null when signed out. Persisted across cold
  // starts (AsyncStorage on native, localStorage on web) and kept in sync via
  // onAuthStateChange.
  session: Session | null;
  user: User | null;
  // True only until the persisted session has been restored on first mount. The
  // tab gate shows a splash while this is true so it never flashes the login
  // screen at an already-signed-in user.
  loading: boolean;
  // All three reject on failure — callers surface the message, nothing is faked.
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}
