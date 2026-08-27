import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Replaces Supabase's session storage (AsyncStorage on native, localStorage on
// web) now that there's no SDK managing it — the JWT from /api/auth/login|signup
// is the whole session, so persisting it here is all AuthSession needs.
const TOKEN_KEY = 'fitcheck_auth_token';

export async function getToken(): Promise<string | null> {
  if (Platform.OS === 'web') return localStorage.getItem(TOKEN_KEY);
  return AsyncStorage.getItem(TOKEN_KEY);
}

export async function setToken(token: string | null): Promise<void> {
  if (Platform.OS === 'web') {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
    return;
  }
  if (token) await AsyncStorage.setItem(TOKEN_KEY, token);
  else await AsyncStorage.removeItem(TOKEN_KEY);
}

// Thin fetch wrapper for the /api/** data routes: attaches the bearer token and
// turns a non-2xx response into a thrown Error carrying the server's message,
// so callers can keep using try/catch the same way they did around supabase-js
// calls. Never invents a fallback value on failure.
export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(path, { ...options, headers });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const message = typeof body?.error === 'string' ? body.error : `Request failed (${res.status})`;
    throw new Error(message);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}
