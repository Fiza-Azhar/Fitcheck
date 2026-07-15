# Real AI Outfit Suggestions (Groq) — Design

**Date:** 2026-07-15
**Status:** Approved for planning

## Goal

Fitcheck's "Today's Outfits" screen currently uses a hardcoded dummy pairing algorithm (`lib/matching.ts#generateOutfits`). Add a real AI-backed suggestion path using Groq's free-tier LLM API, while keeping the existing dummy algorithm fully intact as an automatic fallback — so the app works identically to today with no API key configured, and upgrades transparently to real AI once one is added.

Scope is limited to outfit pairing (`generateOutfits`). `shopMatches` (Shop Check screen) stays dummy-only; out of scope.

## Architecture & data flow

```
app/(tabs)/outfits.tsx
   │ useEffect on mount / items change
   ▼
lib/ai.ts → getOutfits(items)            (NEW — orchestrates AI + fallback)
   │ tries real AI first, catches all failures
   ▼
POST /api/outfits                        (NEW Expo Router API route, server-side only)
   │ reads GROQ_API_KEY from .env
   ▼
Groq chat completions API
```

- `lib/matching.ts` is **not modified**. It remains the single source of dummy-fallback truth (`generateOutfits`, `shopMatches` both untouched).
- `lib/ai.ts` (new) is the only place that decides AI-vs-dummy. The backend route has no knowledge of dummy logic — it's a thin Groq proxy.
- No visible toggle in the UI: the app always attempts real AI first and falls back to dummy silently on any failure (no key, network error, bad response, timeout, rate limit).

## Backend: `app/api/outfits+api.ts`

Expo Router API route (Expo v54 file-based server route — consult https://docs.expo.dev/versions/v54.0.0/ per AGENTS.md before implementing), `POST` only.

**Request:** `{ items: Garment[] }` — the full wardrobe from `WardrobeContext`.

**Behavior:**
1. If `process.env.GROQ_API_KEY` is unset → respond `503 { error: 'no_key' }` without calling Groq.
2. Build a compact text prompt listing each garment's `id, name, category, color, formality, pattern, seasons, occasions`. Text-only — no images sent.
3. Instruct the model to return strict JSON: an array of up to 3 objects `{ topId, bottomId, shoesId, score, reason }`, using only ids from the submitted list, one top + one bottom + one footwear per outfit, `score` 0–100, `reason` ≤ 12 words.
4. Call Groq's chat completions endpoint with model `llama-3.3-70b-versatile`, `response_format: { type: 'json_object' }`.
5. Parse the response. Validate every referenced id exists in the submitted items and each outfit has exactly one top/bottom/footwear. Drop invalid outfits.
6. Respond `200 { outfits: AiOutfitPick[] }`, or `502 { error: 'groq_failed' }` on any call/parse/validation failure.

The route returns ids, not full `Garment` objects — the client maps ids back to garments it already holds in memory, so the model never has to correctly echo full objects.

## Frontend: `lib/ai.ts` (new)

```ts
async function getOutfits(items: Garment[]): Promise<{ outfits: Outfit[]; source: OutfitSource }>
```

- POSTs `{ items }` to `/api/outfits` with an abort timeout (~8s).
- On success: maps each `AiOutfitPick` back to full `Garment` objects by id from `items`, builds `Outfit[]` matching the existing shape, returns `source: 'ai'`.
- On any failure (503/502/network error/timeout/unparseable JSON/all outfits invalid): returns `generateOutfits(items)` from the unmodified `lib/matching.ts`, `source: 'dummy'`.
- This is the only place fallback logic lives — one dummy implementation, reused rather than duplicated server-side.

## Frontend: `app/(tabs)/outfits.tsx` changes

- Currently calls `generateOutfits(items)` synchronously during render. Becomes an async effect: on mount and whenever `items` changes, set phase to `loading` → call `getOutfits(items)` → store `{ outfits, source }` → set phase to `ready`.
- While loading: reuse the existing `Spinner` component (already used on Add Item) with label `"Asking AI for outfit ideas…"`.
- Each outfit card gets a small badge (built from the existing `Chip` component/pattern, not a new component) reading `"AI-powered"` (accent-tinted) when `source === 'ai'`, or `"Prototype match"` (muted) when `source === 'dummy'` — gives a visible signal during a demo that real AI is actually being called.

## New types/interfaces

Per the project's mandatory types/interfaces separation:

- `interfaces/ai.ts` → `AiOutfitPick { topId: string; bottomId: string; shoesId: string; score: number; reason: string }`
- `types/outfit-source.ts` → `type OutfitSource = 'ai' | 'dummy'`

## Error handling & edge cases

- No key, Groq down, bad/unparseable response, timeout, or fewer than one top+bottom+shoe in the wardrobe: all collapse to the same dummy path via the catch-all in `lib/ai.ts`. No bespoke handling per failure mode.
- Groq free-tier rate limits: treated as just another failure → dummy fallback, no retry logic.
- The fallback guarantees the app behaves identically to today (visually and functionally) with no `.env` present, so it's safe to build and verify structurally before a real key is added.

## Setup

- `.env` at project root: `GROQ_API_KEY=...` (confirm `.gitignore` excludes `.env`; add the entry if missing). No `EXPO_PUBLIC_` prefix — that would bundle the key into the client build, which must never happen.
- Expo Router API routes read `process.env` server-side automatically.
- Obtaining a Groq key (console.groq.com) is a manual step for the user, outside this implementation.

## Out of scope

- `shopMatches` / Shop Check screen — stays dummy-only.
- Any UI toggle to force dummy vs AI mode.
- Retry logic, streaming responses, or caching AI results across sessions.
- Sending garment images to a vision model — text metadata only.
