# Real AI Item Photo Analysis (Groq Vision) — Design

**Date:** 2026-07-15
**Status:** Approved for planning

## Goal

The Add Item screen (`app/(tabs)/add.tsx`) already has real photo capture/picking (camera + gallery, via `expo-image-picker` and `PhotoSourceSheet`), but the "AI analysis" step is fake: it always shows the same hardcoded `SUGGESTED` object (`'Rust Corduroy Overshirt'`, category `top`, etc.) regardless of the photo, and none of the review-form fields are editable.

Replace this with real Groq vision analysis: send the captured photo to Groq, get back a suggested `name` and `category`, pre-fill an editable form with them, and let the user correct them before saving. On any AI failure, fall back to an empty/generic editable form rather than blocking the user — consistent with the silent-fallback pattern already used for outfit suggestions.

Scope is limited to `name` and `category`. `color`, `pattern`, `formality`, `seasons`, and `occasions` keep their current fixed defaults from `SUGGESTED` and remain non-editable — out of scope for this pass.

A persistent database is explicitly **out of scope** for this feature; wardrobe state stays in-memory via `WardrobeContext` as today. Database design is a separate, later project.

## Architecture & data flow

```
app/(tabs)/add.tsx
   │ photo picked (camera/gallery), base64: true now requested
   ▼
lib/itemAnalysis.ts → analyzeItemPhoto(base64)   (NEW — AI attempt + fallback)
   │ tries real AI first, catches all failures
   ▼
POST /api/analyze-item                            (NEW Expo Router API route)
   │ reads GROQ_API_KEY from .env (already configured for outfits feature)
   ▼
Groq chat completions API (vision model)
```

- This reuses the exact architectural pattern established for outfit suggestions (`docs/superpowers/specs/2026-07-15-groq-outfit-ai-design.md`): a thin server-side proxy route holds the key, a client module owns the AI-vs-fallback decision, no UI toggle.
- `lib/itemAnalysis.ts` is a new, separate file from `lib/ai.ts` — `lib/ai.ts` stays outfits-only (single responsibility per file).

## Backend: `app/api/analyze-item+api.ts`

Expo Router API route, `POST` only. Same file-naming convention and request/response model as `app/api/outfits+api.ts`.

**Request:** `{ imageBase64: string }` — a JPEG base64 string (no `data:` prefix; the route adds it when building the Groq request), captured from `ImagePicker`'s `asset.base64` field.

**Behavior:**
1. If `process.env.GROQ_API_KEY` is unset → `503 { error: 'no_key' }`.
2. If `imageBase64` is missing, empty, or exceeds Groq's 4MB base64 image limit → `400 { error: 'bad_request' }`.
3. Call Groq chat completions with model `meta-llama/llama-4-scout-17b-16e-instruct`, `response_format: { type: 'json_object' }`, an image content part built as `data:image/jpeg;base64,<imageBase64>`, and a prompt instructing: identify the single clothing item in the photo, respond with strict JSON `{"name": "...", "category": "top" | "bottom" | "footwear"}` — name is a short, natural garment description (e.g. "Navy Blazer"), category must be exactly one of the three values.
4. Parse the response; validate `name` is a non-empty string and `category` is one of the three allowed values. Reject anything else.
5. Respond `200 { name: string, category: Category }`, or `502 { error: 'groq_failed' }` on any call/parse/validation failure.

This mirrors the outfits route's error-status contract exactly (`503`/`400`/`502`), so the client's single-catch fallback pattern is reusable without new conventions.

## Frontend: `lib/itemAnalysis.ts` (new)

```ts
async function analyzeItemPhoto(base64: string): Promise<{ name: string; category: Category; source: 'ai' | 'dummy' }>
```

- POSTs `{ imageBase64: base64 }` to `/api/analyze-item` with an abort timeout (~8s, matching the outfits client).
- On success: returns `{ name, category, source: 'ai' }` from the validated response.
- On any failure (non-ok status, network error, timeout, malformed JSON): returns the generic fallback `{ name: '', category: 'top', source: 'dummy' }`. The empty name renders as a placeholder in the `TextInput` ("New Item" placeholder text, not a pre-filled value) so it's visually obvious the user needs to type a real name.
- Reuses `OutfitSource`-style thinking but does not need the `ai`/`dummy` distinction surfaced in the UI for this feature (no badge requirement was requested) — the `source` field exists for consistency/debuggability but the Add Item screen does not need to render it.

## Frontend: `app/(tabs)/add.tsx` changes

- `pickSource` requests `base64: true` in both `launchCameraAsync` and `launchImageLibraryAsync` calls.
- `analyse()` becomes async: after a photo is picked, call `analyzeItemPhoto(asset.base64)`, store the result (`{ name, category }`) in new state, then move to `'ready'` phase. The existing `Spinner` (already shown during `'analysing'` phase) covers this wait — no new loading UI needed.
- The `'ready'` phase form changes from static `Text`/`Chip` display of the hardcoded `SUGGESTED` to:
  - **Name:** a `TextInput` pre-filled with the AI-suggested (or empty/fallback) name, placeholder `"New Item"`, editable.
  - **Category:** three tappable pills reading "Top" / "Bottom" / "Footwear" (styled like the existing filter/toggle pills in `FilterTabs`/Shop Check), one selected at a time, defaulting to the AI-suggested (or fallback) category.
  - **Everything else** (color swatch chip, pattern, formality, seasons) keeps rendering from the fixed `SUGGESTED` secondary fields exactly as today — not edited by this change.
- `save()` now builds the saved `Garment` from the edited name/category plus the unchanged secondary fields from `SUGGESTED`, and the picked photo.

## New types/interfaces

Per the project's mandatory types/interfaces separation:

- `interfaces/item-analysis.ts` → `AnalyzeItemRequestBody { imageBase64: string }`, `AnalyzeItemResponseBody { name: string; category: Category }`, `AnalyzeItemResult { name: string; category: Category; source: OutfitSource }` (reuses the existing `OutfitSource` type — `'ai' | 'dummy'` — from `types/outfit-source.ts`, since it's already the right shape; renaming it feels premature for two call sites, but if a third AI feature ever needs this it should be renamed to something source-neutral like `AiSource` at that point).

No new `types/*` file is needed — `Category` already exists in `types/garment.ts`.

## Error handling & edge cases

- No key, Groq down, bad/unparseable response, timeout, oversized image: all collapse to the same fallback path via the catch-all in `lib/itemAnalysis.ts`. No bespoke per-failure handling, matching the outfits feature's convention.
- Groq free-tier rate limits: treated as just another failure → fallback, no retry logic.
- If the user denies camera/gallery permission: unchanged existing behavior (`Alert` shown, flow doesn't proceed) — not touched by this feature.
- Image size: `quality: 0.8` (already set) keeps typical phone photos well under Groq's 4MB base64 cap in practice; the route's `400` guard is the safety net if a particular photo is unusually large, rather than adding client-side image compression (`expo-image-manipulator`) as a new dependency — YAGNI unless real-world testing shows this triggering often.

## Out of scope

- Editable color, pattern, formality, seasons, occasions.
- A persistent database — wardrobe state stays in-memory via `WardrobeContext`, exactly as today.
- Any visible "AI-powered" vs "fallback" indicator on this screen (unlike the Outfits screen, this wasn't requested here).
- Client-side image compression/resizing beyond the existing `quality: 0.8` picker option.
- Retry UI on failure — silent fallback only.
