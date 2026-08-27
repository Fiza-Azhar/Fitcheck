export interface AuthUser {
  id: string;
  email: string;
  name: string;
}

export interface SignupRequestBody {
  name: string;
  email: string;
  password: string;
}

export interface LoginRequestBody {
  email: string;
  password: string;
}

// Shared by /api/auth/signup and /api/auth/login — the token is stored on the
// client and sent back as a Bearer header on every data route.
export interface AuthResponseBody {
  token: string;
  user: AuthUser;
}

export interface MeResponseBody {
  user: AuthUser;
}

export interface AuthSessionValue {
  // Mirrors the old Supabase-backed shape (`session`/`user`/`loading`) so the
  // tab gate and WardrobeContext didn't need to change when auth was rewritten.
  session: { user: AuthUser } | null;
  user: AuthUser | null;
  // True only until a persisted token has been checked against /api/auth/me, so
  // the tab gate never flashes the login screen at an already-signed-in user.
  loading: boolean;
  // All three reject on failure — callers surface the message, nothing is faked.
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}
