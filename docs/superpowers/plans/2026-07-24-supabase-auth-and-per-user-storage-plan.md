# Supabase Auth + Per-User Storage — Implementation Plan

**Date:** 2026-07-24
**Design:** [../specs/2026-07-24-supabase-auth-and-per-user-storage-design.md](../specs/2026-07-24-supabase-auth-and-per-user-storage-design.md)

Ordered so each phase leaves the app runnable and verifiable. Auth first, then
per-user data, then cloud images. The reusable Claude skills are created early
(Phase 0) because they guide the implementation that follows.

---

## Phase 0 — Reusable Claude skills + Supabase setup

**Goal:** capture conventions and prepare the backend before touching app code.

- [ ] Using `superpowers:writing-skills`, create `.claude/skills/fitcheck-conventions/`
      — the "failures stay visible", "client never holds the service key", and
      "shared Garment shape" rules.
- [ ] Using `superpowers:writing-skills`, create `.claude/skills/supabase-auth-rls/`
      — anon-key client + session persistence, `userId`/`default auth.uid()`/RLS
      pattern, private-bucket-per-user Storage convention.
- [ ] Supabase dashboard: disable **Confirm email**.
- [ ] Supabase dashboard: create private **`garment-images`** bucket.
- [ ] Add `EXPO_PUBLIC_SUPABASE_URL` + `EXPO_PUBLIC_SUPABASE_ANON_KEY` to `.env` and
      `.env.example` (anon key is public/safe; service key comment unchanged).

**Verify:** skills load in a fresh session; env vars present; bucket exists.

## Phase 1 — Supabase client

**Goal:** a single configured client the app can import.

- [ ] Install `@supabase/supabase-js` and
      `@react-native-async-storage/async-storage`.
- [ ] `lib/supabase.ts`: create the client with the anon key and a platform storage
      adapter (AsyncStorage native / localStorage web), `autoRefreshToken`,
      `persistSession`.

**Verify:** import the client in a scratch call; `supabase.auth.getSession()`
resolves without throwing.

## Phase 2 — Real AuthSession

**Goal:** replace the in-memory flag with a real, persisted session.

- [ ] Rewrite `lib/AuthSession.tsx` to expose `session`, `user`, `loading`,
      `signIn`, `signUp`, `signOut` backed by Supabase; restore on mount and
      subscribe to `onAuthStateChange`.
- [ ] Update `interfaces/auth-session.ts` to the new shape.

**Verify:** with a test account created in the dashboard, a scratch screen can
`signIn` and read back `session.user.email`; reload keeps the session.

## Phase 3 — Wire the auth screens + gate

**Goal:** login/signup actually authenticate; tabs gate on a real session.

- [ ] `login.tsx`: call `signIn`, add submitting + inline error states.
- [ ] `signup.tsx`: call `signUp` (pass name to metadata), validate password/confirm
      match, submitting + inline error states.
- [ ] `(tabs)/_layout.tsx`: splash while `loading`, `Redirect` to `/login` when no
      session.

**Verify:** sign up a new email → land in tabs; sign out → back to login; wrong
password → inline error; cold reload while signed in → stays in tabs.

## Phase 4 — Per-user garments (schema + RLS + client access)

**Goal:** each user reads/writes only their own garments.

- [ ] Migration in `supabase/schema.sql`: delete existing rows; add `userId uuid not
      null references auth.users default auth.uid()`; enable RLS; add the 4 policies.
- [ ] Rewrite `lib/wardrobeApi.ts` to use the Supabase client
      (`from('garments')…`) instead of `fetch('/api/garments')`.
- [ ] Remove/retire `app/api/garments*` routes and garment functions in
      `lib/server/db.ts` (keep Groq routes).
- [ ] Update `lib/WardrobeContext.tsx` if it assumed the old API.

**Verify:** two accounts each see only their own added items; direct query for
another user's row returns nothing (RLS enforced).

## Phase 5 — Images to Supabase Storage

**Goal:** photos live in the cloud, scoped per user, portable to the extension.

- [ ] Storage policies on `garment-images`: read/write/delete only where the first
      path segment == `auth.uid()`.
- [ ] Update the garment record shape to store the storage **path** (drop the
      local-filename assumption); adjust `interfaces/garment-record.ts` /
      `garment.ts` as needed.
- [ ] Add-item flow: upload photo (and cutout if produced by the bg-removal sidecar)
      to `${uid}/${garmentId}.*`, then insert the row referencing the paths.
- [ ] Derive `imageUrl`/`cutoutUrl` client-side via signed URLs (private bucket).
- [ ] Retire `/api/images/[id]` and `lib/server/images.ts` (or keep only if still
      needed by the bg-removal sidecar handoff).

**Verify:** add an item with a photo → it renders from a Storage URL; the object
appears under the user's folder; another user cannot fetch it.

## Phase 6 — End-to-end verification

**Goal:** confirm the whole per-user story before the extension depends on it.

- [ ] Fresh signup → add items with photos → sign out → sign in on another device/
      browser with the same email → same wardrobe and thumbnails appear.
- [ ] Second account is fully isolated (rows and images).
- [ ] Update `.env.example`, README, and the design's setup steps to match reality.

---

## Review gates

Stop for review after **Phase 3** (auth works end to end) and after **Phase 5**
(per-user data + images complete), before declaring the foundation ready for the
extension.

## Dependencies / preconditions

- Supabase project with the anon key available and the dashboard settings from
  Phase 0 applied.
- The bg-removal sidecar remains available if cutouts are expected.

## After this plan

The extension sub-project (already designed in
`portfolio-fitcheck-extension/docs/`) becomes buildable: it reuses this exact
Supabase client, auth, RLS, and Storage — no new backend.
