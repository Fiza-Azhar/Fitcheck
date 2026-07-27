---
name: supabase-auth-rls
description: Use when touching Fitcheck auth, login/signup, sessions, per-user data, Row-Level Security, or Supabase Storage — including the browser extension that logs in with the same account.
---

# Supabase Auth + Per-User Data (Fitcheck)

Fitcheck uses **Supabase Auth + RLS + Storage** so every user sees only their own wardrobe. The mobile app and the (planned) browser extension are both just authenticated Supabase clients — same login, same rules, no shared secrets. Design: `docs/superpowers/specs/2026-07-24-supabase-auth-and-per-user-storage-design.md`.

## Core principle

**RLS, not key secrecy, is the security boundary.** The client ships the anon key; the database rejects any row or file that isn't the caller's. Never put the service_role key in the client to "make a query work" — that deletes the boundary.

## The client

- `lib/supabase.ts` builds the one client with `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY`. Only `EXPO_PUBLIC_`-prefixed vars reach the bundle.
- Session persists across cold starts: `AsyncStorage` on native, `localStorage` on web (`detectSessionInUrl` on web only). Requires `react-native-url-polyfill/auto`.

## Auth session

- `lib/AuthSession.tsx` restores the session with `getSession()` on mount and stays live via `onAuthStateChange`; exposes `session`, `user`, `loading`, `signIn`, `signUp`, `signOut`.
- Gate on `loading` first (splash), then `session` (redirect to `/login`) — see `app/(tabs)/_layout.tsx`. Never gate on `session` while still `loading`, or an already-signed-in user flashes the login screen.
- Auth calls reject on failure; screens map them via `lib/authErrors.ts` and show the reason. Never fake a signed-in state.

## Per-user data

- Every user-owned table has `"userId" uuid not null references auth.users(id) default auth.uid()`, RLS enabled, and four policies (`select/insert/update/delete`) all checking `"userId" = auth.uid()`.
- `default auth.uid()` means the client need not send `userId`; the app sets it explicitly on insert so the returned row is complete.
- Query through the RLS-scoped client (`lib/wardrobeApi.ts`) — no manual `userId` filtering. Reload per-user data when the auth user changes; clear it on sign-out (`lib/WardrobeContext.tsx`).

## Storage (images)

- Private bucket `garment-images`. Object paths are namespaced by uid: `${uid}/${id}.jpg`, `${uid}/${id}-cutout.png`. Storage policies allow access only where `(storage.foldername(name))[1] = auth.uid()::text`.
- Rows store the **path**, not a URL. Mint short-lived **signed URLs** at read time (`createSignedUrl`). Upload base64 with `decode` from `base64-arraybuffer`: `upload(path, decode(base64), { contentType })`.
- Upload the image **before** inserting the row, so a saved garment never points at a missing file. Cutout is best-effort: on failure, degrade to the original photo (null cutoutPath).

## Setup (Supabase dashboard, one-time)

Run `supabase/schema.sql` (drops + recreates garments, RLS, bucket, Storage policies). Disable **Confirm email** (Auth → Providers → Email) so demo signups get an immediate session. Paste the anon key into `.env`.

## Verify

`npx tsc --noEmit`, `npx expo lint`, then drive two accounts: each sees only its own items and images; the other's rows/files are unreachable even by guessed id.
