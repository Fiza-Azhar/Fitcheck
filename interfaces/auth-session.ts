export interface AuthSessionValue {
  // In-memory only: true once the user taps Sign In / Create Account this run.
  // There is no real auth backend yet, so nothing is persisted — every cold
  // start returns to the login screen.
  signedIn: boolean;
  signIn: () => void;
  signOut: () => void;
}
