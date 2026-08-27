---
name: fitcheck-design-system
description: Use when building or editing any Fitcheck screen or component — enforces the palette, the types/interfaces separation, and the "never fake anything" rules.
---

# Fitcheck Design System

Fitcheck is an **Expo v54 app with a real backend**. Garment/wishlist/shop-check data lives in **Neon Postgres**, one `userId` column per table, scoped by application code — every `app/api/**+api.ts` data route decodes the caller's JWT (`lib/server/auth.ts`) and filters by that id. The client never talks to the database directly: it calls the API routes with a bearer token via `lib/apiClient.ts`.

History: frontend-only prototype (reversed 2026-07-17) → single-user `node:sqlite` + local-disk backend → per-user Supabase Auth + RLS + Storage (2026-07-24) → **Neon Postgres + hand-rolled JWT auth** (this branch, `feat/neon-migration`), dropping Supabase entirely. See `docs/superpowers/specs/2026-07-24-supabase-auth-and-per-user-storage-design.md` for the superseded design.

## Rules

- Native RN only: `<View>`, `<Text>`, `<Pressable>`, `<ScrollView>`, `<TextInput>`, `StyleSheet`. No web/CSS/img/div/hover.
- Import all colors/spacing/radii/shadows from `constants/design.ts`. Never hardcode a hex in a component.
- **No inline `type`/`interface`.** Types live in `@/types/*`, interfaces in `@/interfaces/*`, one file per module. Import them.
- **Never invent data to fill a gap.** No dummy fallbacks, no plausible placeholder values, no fake timers standing in for real work. If something fails, the UI says so and offers a retry — see `EmptyState` with `tone="error"`, and how the auth screens surface real API errors (`lib/authErrors.ts`).
  - This rule is the whole point of the original rewrite. `lib/ai.ts` used to swallow every failure and return fake outfits, disguising a dead Groq integration as a working feature for weeks. A wrong answer that looks right costs more than an error.
- **The client only ever talks to `/api/**` routes**, never to Neon directly — `DATABASE_URL` is a real DB credential and must never carry an `EXPO_PUBLIC_` prefix or reach the bundle. `lib/apiClient.ts` attaches the bearer token; `lib/db.ts` (the Neon client) and `lib/server/auth.ts` (JWT sign/verify) are imported only from `app/api/**+api.ts`.
- **Every data route re-derives the userId from the JWT** (`requireAuth` in `lib/server/auth.ts`) and filters by it in SQL — never trust a userId the client sends in a body.
- Garment vocabulary lives in `constants/garment.ts` — one source of truth for the add form, the Groq validators, and rendering. Groq output is validated server-side by `parseAnalysis`/validation before it reaches the client; the add form gates saving on required fields.
- The Expo API routes (`analyze-item`, `outfits`, `remove-bg`, `auth/*`, `garments`, `wishlist`, `shop-checks`) bundle to one file with only Node built-ins, and **dynamic imports are unsupported** — use Node built-ins and global `fetch`.
- Garment `imageUrl`/`cutoutUrl` are **base64 data URIs** built server-side in `app/api/garments+api.ts` from the row's `imageData`/`cutoutData` text columns. Null falls back to the garment colour — never a fake image.
- Wardrobe state lives in `lib/WardrobeContext.tsx` — a cache over the API, not the source of truth. It reloads per-user when the auth session changes and empties on sign-out. Read/write via `useWardrobe()`.
- `lib/matching.ts` holds `shopMatches` only. `generateOutfits` was deleted with the fallback.
- No unit tests, at the user's direction; verify with `npx tsc --noEmit`, `npx expo lint`, and driving the real app.
- **Never commit without explicit permission.**

## AI models (Groq)

- Outfits: `openai/gpt-oss-120b` (previously `llama-3.3-70b-versatile`, discontinued by Groq).
- Vision: `qwen/qwen3.6-27b` — Groq's current vision model. The previous one (`meta-llama/llama-4-scout-17b-16e-instruct`) was a preview model Groq **removed from the API**, which broke item analysis until it was swapped. Vision ids are volatile — if analysis fails, check `GET /openai/v1/models` and https://console.groq.com/docs/vision. Model ids are single constants in their routes.
- Asked for more outfits than the wardrobe supports, the model repeats combinations; `validatePicks` dedupes and returns fewer.

## Palette

ivory `#F7F1E8` bg · off-white `#FAF9F6` surface · near-black `#1A1A1A` text · gold `#D4AF37` accent · beige `#F5F5DC` chip. Retheme history: terracotta/charcoal → navy/periwinkle → this, all on 2026-07-29. **Navy `#0E2036` and periwinkle `#7A70ED` were removed at the user's request — don't reintroduce them or anything derived from them.**

- `accent` gold is a **fill** colour: 1.9:1 on ivory. Anything *drawn* in it — links, focus rings, spinners, the active tab icon — uses `accentDeep` `#7A6019` instead (5.3:1). `accentSoft` `#F0E6C4` is the gold tint behind badges.
- `onFill` `#FAF9F6` is the label colour on any filled surface (dark buttons, dark garment tiles) — never a raw `'#FFFFFF'` in a component.
- `danger` `#C0453C` for destructive actions (the delete swipe). Green `#4F8A5B` / amber `#C98A2E` still carry Shop Check verdicts — amber sits close to the gold accent, so keep the two apart on screen.
- `scrim` / `hairline` are the ink at low alpha — use them instead of `rgba(0,0,0,…)`.

**Buttons use their own scale**, exported as `button` from the same file. Its entries name palette colours rather than repeating hexes, so a fill and the surface it matches can't drift. Every fill ships with its label colour; use them as a pair.

| variant | fill | label | used for |
|---|---|---|---|
| `primaryBg` / `primaryTxt` | `#1A1A1A` | `#FAF9F6` | main action, selected pill/tab |
| `secondaryBg` / `secondaryTxt` + `outline` | `#FAF9F6` | `#1A1A1A` | outlined and ghost buttons, unselected tabs |
| `tertiaryBg` / `tertiaryTxt` | `#D4AF37` | `#1A1A1A` | gold icon buttons (the Add-photo ＋) |
| `neutralBg` / `neutralTxt` | `#F5F5DC` | `#1A1A1A` | unselected option pills |
| `dangerBg` / `dangerTxt` | `#C0453C` | `#FAF9F6` | destructive (delete swipe) |

Gold stays off button *labels and lines* — `accentDeep` carries the tab bar tint, spinners, the input focus ring and links.
