import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

// The client-side Supabase client. It uses the ANON key — safe to ship in the
// bundle because Row-Level Security, not key secrecy, is what keeps one user out
// of another's data. Every query made through this client is scoped to the
// signed-in user by RLS via the session JWT. The service_role key (which bypasses
// RLS) never has an EXPO_PUBLIC_ prefix and so never reaches this bundle.
//
// The anon key and URL come from EXPO_PUBLIC_ env vars: only that prefix is
// inlined into the client bundle by Expo. The service key deliberately has no
// such prefix, so it can never leak here.
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // Fail loudly at startup rather than letting every auth/query call fail with a
  // cryptic error later — matching the app's "surface, never hide" rule.
  throw new Error(
    'Supabase not configured: set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in .env',
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Native persists the session in AsyncStorage; web uses supabase-js's default
    // (localStorage). detectSessionInUrl only matters on web (magic-link/OAuth
    // redirects) and must be off on native, which has no URL to parse.
    storage: Platform.OS === 'web' ? undefined : AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === 'web',
  },
});
