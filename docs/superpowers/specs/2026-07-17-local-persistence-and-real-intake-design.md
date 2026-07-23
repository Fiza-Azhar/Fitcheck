# Local Persistence + Real Item Intake — Design

**Date:** 2026-07-17
**Status:** Awaiting review

## Goal

Turn Fitcheck from a prototype with fake data into a working app: a real database behind a local server, real photos stored on disk, and real Groq vision analysis on the Add Item screen. When this ships, every garment in the app is one the user actually photographed, the wardrobe survives app restarts, and no fake data is presented as real.

Success criterion: the user photographs ten real garments, force-quits the app, reopens it, and sees all ten with AI-assigned attributes — and the Outfits tab produces suggestions grounded in those real attributes.

## Context: this is project 1 of 4

The original request bundled four independent projects. They are being specced and built one at a time:

1. **Persistence + real intake** ← this spec
2. **Server deployment** (the `origin` fix; see Risks)
3. **Browser shopping extension**
4. **Shop tab redesign** (blocked on 3 — the extension defines what a "product" is)

## Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Where data lives | Local server + local DB | No hosting cost, no accounts. Real client/server shape, so hosting later is a deploy, not a rewrite. |
| Database | `node:sqlite` | **Settled 2026-07-17 without needing the spike.** The machine has no MongoDB and no Docker, so Mongo meant a ~300MB server install with admin rights *before* any app code ran — and only then would the bundling risk get tested. `node:sqlite` is verified working on Node v24.13.0 today. Hidden behind `lib/server/db.ts`, so Mongo remains a one-file swap. |
| Images | Local files on the server | No Cloudinary. Removes the only cloud dependency besides Groq. |
| Background removal | Out of scope | Cloudinary's add-on is closed to new accounts (see Rejected alternatives). |
| AI failure behavior | Real error + retry | The silent dummy fallback actively hid a live bug for weeks (see Background). |
| First launch | Empty wardrobe + designed empty states | "No dummy data" means none. |
| Demo content | User populates via the real flow | Persistence makes seeding a usage problem, not a code problem. |
| AI extraction scope | All garment fields, editable | Fixed defaults would poison outfit suggestions (see Section 3). |
| UI scope | Fill gaps, polish within existing design system | The palette in `constants/design.ts` is coherent; the gaps are where the app looks unfinished. |

## Background: two bugs found while designing this

Both are relevant because they justify decisions above.

**1. The Groq key was in the wrong file.** `GROQ_API_KEY` was set in `.env.example` (not loaded by Expo) while `.env` (loaded) had an empty value. So `process.env.GROQ_API_KEY` was always `undefined`, `app/api/outfits+api.ts` always returned `503 no_key`, and the outfits AI had — as far as we can tell — never run successfully. Fixed on 2026-07-17 by moving the key to `.env` and blanking `.env.example`.

**2. The silent fallback hid bug 1.** `lib/ai.ts` catches every failure and returns `generateOutfits(items)`. The app looked like it worked. This is the direct evidence for removing the fallback: a fake result that looks real is worse than an error, because it costs debugging time later.

## Architecture

```
Phone (Expo Go, over LAN)              Dev machine (expo start, Node 24)
  index.tsx  ┐
  add.tsx    ┼── fetch('/api/…') ──►  app/api/*+api.ts
  outfits.tsx┘                            │
                                          ├─► lib/server/db.ts      → wardrobe records
                                          ├─► lib/server/images.ts  → .data/images/<id>.jpg
                                          └─► Groq API (vision + outfits)
```

`WardrobeContext` stops being the source of truth. Today it holds `useState(GARMENTS)` — it becomes a cache over the server, fetching on mount and refetching after mutations.

### API surface

| Route | Purpose | Status |
|---|---|---|
| `GET /api/garments` | List the wardrobe | New |
| `POST /api/garments` | Create one (photo as base64) | New |
| `DELETE /api/garments/[id]` | Remove one | New |
| `GET /api/images/[id]` | Serve a stored photo | New |
| `POST /api/analyze-item` | Groq vision analysis | New (supersedes the 2026-07-15 spec) |
| `POST /api/outfits` | Groq outfit suggestions | Exists; fallback removed |

### Storage layer

All database access hides behind `lib/server/db.ts`, exposing `list()`, `create(garment)`, `remove(id)`. API routes never import a driver directly. This is what makes the Mongo-vs-SQLite spike outcome a one-file change instead of a rewrite.

Data lives in a gitignored `.data/` directory: the database (SQLite file, or Mongo's own storage) plus `.data/images/<id>.jpg`. Deleting `.data/` resets the app to first-launch state — the mechanism for testing empty states.

Persisted garment record: `id`, `name`, `category`, `color`, `formality`, `pattern`, `seasons`, `occasions`, `wearCount`, `imageFilename`, `createdAt`.

### Image flow

Photo picked → base64 → `POST /api/analyze-item` (attributes only, nothing stored) → user reviews/edits the form → `POST /api/garments` with the edited fields **plus the same base64** → server writes `.data/images/<id>.jpg` → record stores the filename → `GET /api/images/<id>` serves the bytes.

The photo is therefore uploaded twice: once to analyze, once to save. Accepted deliberately — the alternative is server-side temp files with orphan cleanup for photos the user abandons at the review step. Over a LAN this costs nothing; revisit only if it hurts once deployed.

**Interface change:** `interfaces/garment.ts` currently types `image: ImageSourcePropType | null`, a shape that exists only to support `require('@/assets/images/…')` from the dummy data. It becomes `imageUrl: string | null`. Consumers (`GarmentTile`, `GarmentCard`, `MatchBadge`, `add.tsx`) pass `{ uri: imageUrl }` to `<Image>`. `app/(tabs)/shop.tsx` needs a one-line change (`image: null` → `imageUrl: null`) despite otherwise being out of scope.

**`imageUrl` is absolute, and the server does not build it.** `<Image>` in React Native cannot resolve a relative path the way a browser can — `/api/images/x` would fail on the phone while working on web. The API returns the bare `id`/filename; the client composes the absolute URL against the same base it uses for `fetch`. This keeps the server ignorant of how clients reach it, which is what makes project 2 (deployment) a config change rather than a data-model change.

## Section 3: AI extraction covers all garment fields

The superseded 2026-07-15 spec limited Groq to `name` and `category`, keeping `color`, `pattern`, `formality`, `seasons`, `occasions` at the fixed defaults from `SUGGESTED` in `add.tsx`. Under that design every garment ever saved would be `#B5643C`, formality 3, solid, autumn/winter, casual+office — regardless of the photo.

That is dummy data, and it breaks the outfits feature specifically: `app/api/outfits+api.ts` builds its prompt from exactly those fields. Identical fake attributes across every item make meaningful outfit reasoning impossible, while still producing confident-looking output.

So `POST /api/analyze-item` returns the full garment shape:

```
{ name, category, color, pattern, formality, seasons[], occasions[] }
```

Server-side validation rejects anything malformed: `category` ∈ {top, bottom, footwear}, `color` matching `#RRGGBB`, `formality` an integer 1–5, `seasons`/`occasions` non-empty arrays of known values. A response failing validation is an error, not a silently-corrected result.

Every field lands in an **editable** review form. The AI proposes; the user decides.

## UI/UX work

Within the existing `constants/design.ts` system (warm sand `#F7F1E8`, terracotta accent `#C56B4A`, existing spacing/radii/type scales). No visual redesign.

- **Empty states** — Wardrobe ("add your first item"), Outfits ("add 3+ items across tops, bottoms and shoes"). Designed, not blank.
- **Editable review form** in Add Item — replaces read-only `Chip`s showing fake values. Name input, category pills, color swatch, formality, seasons, occasions.
- **Real loading** — the `analysing` phase is a `setTimeout(1500)` lie today. It becomes a real request that can be slow.
- **Error + retry** — Outfits and analysis, replacing silent fallback.
- **Delete an item** — no way to remove a garment exists today. Persistence makes this mandatory.
- **Save feedback** — haptics and confirmation, since saving now does something real that can fail.

## Configuration

**`GROQ_API_KEY`** — the only secret. Free at console.groq.com. Covers vision and outfits.

**`MONGODB_URI`** — only if the spike succeeds. `mongodb://localhost:27017/fitcheck`. No account, no key.

No Cloudinary, no auth provider, no hosting account.

## Risks

| Risk | Impact | Mitigation |
|---|---|---|
| ~~`mongodb` driver may not bundle in Expo API routes~~ | ~~Blocks the DB choice~~ | **Retired 2026-07-17.** Mongo was dropped before the spike ran — no local server, no Docker. The bundling question is now moot but remains recorded: Expo bundles everything except Node built-ins into one file with no dynamic imports, and the driver does conditional `require`s for optional deps (`kerberos`, `snappy`, `aws4`). Anyone revisiting Mongo must resolve this first. |
| No automated tests | Regressions land silently | **Accepted at user's explicit direction (2026-07-17).** Highest-exposure area is AI response validation in `analyze-item`: a bad validator corrupts every saved garment and only surfaces as poor outfit suggestions much later. First place to look when something is wrong. |
| `meta-llama/llama-4-scout-17b-16e-instruct` is a Groq **preview** model | Vision breaks without warning | Groq docs: preview models "may be discontinued at short notice." Model id lives in one constant. Accepted — it's the vision option available. |
| `node:sqlite` is experimental in Node 24 | API could change | Only used if the spike fails. Node version is pinned locally; the API surface needed (prepare/run/all) is small. |
| Native production builds can't reach `/api/*` | AI silently dead on device | Expo requires a deployed server + `origin` on the expo-router plugin. **Out of scope — this is project 2.** Dev (Expo Go over LAN) works, which is what this spec targets. Removing the fallback means this now fails loudly instead of silently. |
| `fitcheck-design-system` skill says "all AI is fake" | Will fight the implementation | Update the skill as part of this work. |

## Out of scope

- The browser extension, and any hosted/public API (project 3).
- Deployment and the `origin` config (project 2).
- Shop tab redesign (project 4) — receives only the mechanical `imageUrl` rename.
- Background removal / Cloudinary.
- Authentication and multi-user support. Single local user.
- Editing a garment after saving (delete + re-add is the workaround).
- `wearCount` tracking — the field persists but nothing increments it yet.

## Rejected alternatives

**Cloudinary + background removal.** Cloudinary's AI Background Removal add-on carries a deprecation notice, and per their docs "customers who created an account after 1st February 2026 can't subscribe to this add-on." A new account today cannot use it. The live replacement (`e_background_removal`) bills against a "special transformation count" whose free-tier coverage Cloudinary does not publish. Rejected as an unquantified cost and the only cloud dependency in an otherwise local build.

**Cloud DB with accounts.** Correct for the eventual extension, rejected for now: no hosting cost, no auth to build. Revisit at project 3.

**Keeping `generateOutfits` as an honest offline fallback.** Defensible — it's a real rule-based matcher — but rejected: it means maintaining two matching engines, and the fallback pattern just demonstrated its cost by hiding a live bug. `lib/matching.ts` survives for `shopMatches`; only the fallback path in `lib/ai.ts` goes.

**`better-sqlite3`.** Ruled out by Expo's bundler: native binaries can't bundle into API routes.

**Squashing git history / fresh repo.** Rejected after verifying no secret was ever committed. History is evidence of process, not a liability.
