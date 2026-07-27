# Supabase Auth + Per-User Wardrobes & Image Storage — Design

**Date:** 2026-07-24
**Status:** Approved design, ready for implementation planning
**Motivation:** The browser extension must show suggestions for the *logged-in
user's* wardrobe (same email → their profile). That requires real accounts,
persisted sessions, and per-user data isolation — which the app does not have yet.

---

## 1. Problem

Today the app fakes auth and stores one shared wardrobe:

- `lib/AuthSession.tsx` is an in-memory `signedIn` flag — no accounts, no
  persistence, no credential check. Every cold start returns to `/login`.
- The `garments` table has **no owner column**; `lib/server/db.ts` talks to it with
  the Supabase **service_role key**, which bypasses RLS — a single-user model.
- Item photos live on the **local server disk** (`.data/`), served by
  `/api/images/[id]`. They exist only on the developer's machine.

For a per-user product (and an extension that logs in by email), we need: real
Supabase Auth, per-user rows via RLS, and cloud image storage.

## 2. Decisions (confirmed)

| Decision | Choice |
|---|---|
| Auth mechanism | **Supabase Auth** (email/password) |
| Data access | **Direct `@supabase/supabase-js` client + RLS** (retire server DB routes for garments) |
| Per-user isolation | `userId` column on `garments` + RLS policies keyed to `auth.uid()` |
| Image storage | **Supabase Storage** (per-user access via storage policies) |
| Existing demo garments | **Clear the table** on migration |
| Email confirmation | **Off** for the demo (re-enable for production) |

Rationale for keeping everything in Supabase: one Auth/RLS model governs both the
garment rows and the image files, so per-user isolation is enforced in a single,
consistent place, and the extension reuses the same login with no extra credentials.

## 3. Architecture

### 3.1 Supabase client (new, shared)

`lib/supabase.ts` — a single `@supabase/supabase-js` client created with the
**anon (publishable) key**, which is safe to ship in the client bundle. Session
persistence uses a platform-appropriate storage adapter:

- **Native (iOS/Android):** `@react-native-async-storage/async-storage`.
- **Web:** default `localStorage`.

Config comes from public env vars: `EXPO_PUBLIC_SUPABASE_URL`,
`EXPO_PUBLIC_SUPABASE_ANON_KEY`. The `EXPO_PUBLIC_` prefix is required for the value
to reach the client bundle. The existing server-only `SUPABASE_SERVICE_KEY` is
unchanged and stays out of the bundle.

### 3.2 Auth session (rewrite of the placeholder)

`lib/AuthSession.tsx` keeps its public shape but backs it with Supabase:

```
AuthSessionValue {
  session: Session | null
  user: User | null
  loading: boolean            // true until the initial session is restored
  signIn(email, password): Promise<void>
  signUp(name, email, password): Promise<void>
  signOut(): Promise<void>
}
```

- On mount: `supabase.auth.getSession()` restores a persisted session; subscribe to
  `onAuthStateChange` to stay in sync.
- `signIn` → `supabase.auth.signInWithPassword`.
- `signUp` → `supabase.auth.signUp` (name stored in user metadata).
- `signOut` → `supabase.auth.signOut`.
- Errors are surfaced to the screens (thrown/returned), never swallowed — matching
  the project's "failures stay visible" rule.

### 3.3 Screen wiring (UI already exists)

- `app/(auth)/login.tsx` / `signup.tsx`: call the real functions, add a submitting
  state and an inline error message; on success `router.replace('/')`.
- `app/(tabs)/_layout.tsx`: while `loading`, render a splash/spinner; if no
  `session`, `Redirect href="/login"`; otherwise render tabs.

### 3.4 Data model & RLS

`supabase/schema.sql` gains ownership and security:

```sql
alter table public.garments
  add column "userId" uuid not null references auth.users(id) default auth.uid();

alter table public.garments enable row level security;

create policy "own garments - select" on public.garments
  for select using ("userId" = auth.uid());
create policy "own garments - insert" on public.garments
  for insert with check ("userId" = auth.uid());
create policy "own garments - update" on public.garments
  for update using ("userId" = auth.uid());
create policy "own garments - delete" on public.garments
  for delete using ("userId" = auth.uid());
```

Existing owner-less rows are deleted before the `NOT NULL` column is added (demo
data). `default auth.uid()` means the client never has to send `userId` — the row is
stamped with the caller's id automatically.

### 3.5 Garment access moves to the client

`lib/wardrobeApi.ts` is rewritten to use the Supabase client directly instead of
`fetch('/api/garments')`:

- `fetchGarments()` → `supabase.from('garments').select('*').order('createdAt', {ascending:false})`
- `createGarment(draft, image)` → upload image to Storage, then
  `supabase.from('garments').insert(...)`
- `deleteGarment(id)` → `supabase.from('garments').delete().eq('id', id)`

RLS scopes every query to the authenticated user automatically via the session JWT —
no manual `userId` filtering, and no way for the client to read another user's rows.

The server DB routes (`app/api/garments*`) and `lib/server/db.ts` are retired for
garment CRUD. The Groq routes (`/api/analyze-item`, `/api/outfits`) stay — they hold
the Groq key and touch no user data.

### 3.6 Image storage (Supabase Storage)

- **Bucket:** `garment-images` (private). One object per garment, path
  `${auth.uid()}/${garmentId}.jpg` (+ an optional `${...}-cutout.png`).
- **Storage policies:** a user may read/write/delete only objects whose first path
  segment equals their `auth.uid()`.
- **Record shape:** the garment row stores the **storage path(s)**, not a local
  filename. `imageUrl`/`cutoutUrl` are derived client-side from the path via a
  signed URL (private bucket) or a public URL if the bucket is made public.
- **Upload flow:** on add-item, the client uploads the photo (and, if produced, the
  cutout) to Storage, then inserts the garment row referencing the paths.
- **Background removal:** the existing `services/bg-removal` sidecar still produces
  the cutout before upload; only the storage destination changes (disk → Storage).

This makes images portable across machines — the key requirement for the extension
to render a user's wardrobe thumbnails anywhere.

## 4. How the extension reuses this (forward-looking)

The extension will create the **same** `@supabase/supabase-js` client with the anon
key, present a login (options page), and thereby obtain a session. From there:

- `supabase.from('garments').select()` returns *that user's* wardrobe (RLS).
- Signed Storage URLs render *that user's* thumbnails.
- `/api/analyze-item` still analyzes the product image.

No new backend, no shared secrets — the extension is just another authenticated
Supabase client. This is the entire reason auth is being built first.

## 5. Error handling

Consistent with the app's philosophy — surface, never fake:

| Failure | Behavior |
|---|---|
| Wrong credentials | Inline "Incorrect email or password" on the login screen. |
| Signup with existing email | Inline "An account with this email already exists." |
| Network/Supabase down | Inline "Can't reach the server — check your connection." |
| Session restore fails | Fall back to the login screen (no silent half-signed state). |
| Image upload fails | Item creation fails loudly; no orphan row without its photo. |

## 6. Reusable Claude skills (deliverable)

Two project skills capture the patterns this work establishes so future sessions
(and the extension work) stay consistent:

- **`fitcheck-conventions`** — the cross-cutting rules: "failures stay visible, never
  fake a fallback"; the client never holds the service key; the shared `Garment`
  shape is the contract between wardrobe items and shopping candidates.
- **`supabase-auth-rls`** — how this project does auth and per-user data: the anon-key
  client with platform session persistence, the `userId` + `default auth.uid()` +
  RLS-policy pattern, and the private-bucket-per-user Storage convention.

These are built with the `superpowers:writing-skills` discipline and live in the
repo's `.claude/skills/`.

## 7. Out of scope (later)

- Password reset / "Forgot Password?" flow (the link exists in UI; wire it later).
- OAuth providers (Google/Apple).
- Protecting the Groq routes behind auth (open for the demo).
- The browser extension itself — its design is already written; it depends on this.

## 8. Setup steps (one-time, Supabase dashboard)

1. Disable **Confirm email** (Auth → Providers → Email).
2. Create the private **`garment-images`** Storage bucket.
3. Run the schema migration (clear rows, add `userId`, enable RLS, add policies,
   add Storage policies).
4. Copy the **anon key** into `.env` as `EXPO_PUBLIC_SUPABASE_ANON_KEY`.
