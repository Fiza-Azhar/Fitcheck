---
name: fitcheck-design-system
description: Use when building or editing any Fitcheck screen or component — enforces the palette, the types/interfaces separation, and the "never fake anything" rules.
---

# Fitcheck Design System

Fitcheck is an **Expo v54 app with a real local backend**. Expo Router API routes serve a `node:sqlite` database and item photos from a gitignored `.data/` directory; Groq provides vision analysis and outfit suggestions.

This file previously described a frontend-only prototype where "every AI action is fake" and dummy data was the rule. That was reversed on 2026-07-17 — see `docs/superpowers/specs/2026-07-17-local-persistence-and-real-intake-design.md`.

## Rules

- Native RN only: `<View>`, `<Text>`, `<Pressable>`, `<ScrollView>`, `<TextInput>`, `StyleSheet`. No web/CSS/img/div/hover.
- Import all colors/spacing/radii/shadows from `constants/design.ts`. Never hardcode a hex in a component.
- **No inline `type`/`interface`.** Types live in `@/types/*`, interfaces in `@/interfaces/*`, one file per module. Import them.
- **Never invent data to fill a gap.** No dummy fallbacks, no plausible placeholder values, no fake timers standing in for real work. If something fails, the UI says so and offers a retry — see `EmptyState` with `tone="error"`.
  - This rule is the whole point of the rewrite. `lib/ai.ts` used to swallow every failure and return fake outfits, which disguised a completely dead Groq integration (the API key was in the wrong file) as a working feature for weeks. A wrong answer that looks right costs more than an error.
- **Nothing untrusted enters the database.** Both Groq output and the client's edit form go through `parseGarmentDraft` in `lib/server/validation.ts`, which rejects rather than coerces. The garment vocabulary lives in `constants/garment.ts` — one source of truth for the validator, the DB and the form.
- **Only `lib/server/db.ts` knows a database exists.** API routes call `list/get/create/remove`. This keeps swapping SQLite for Mongo/Postgres a one-file change.
- Expo API routes bundle everything except Node built-ins into one file, and **dynamic imports are unsupported**. That rules out native packages (`better-sqlite3`) and drivers doing conditional requires (`mongodb`). Use Node built-ins.
- Garment photos are real files: `imageUrl` on `Garment` is **absolute**, composed client-side via `lib/apiBase.ts`. `<Image>` on native cannot resolve a relative path — a relative URL works on web and silently renders blank on a phone.
- Wardrobe state lives in `lib/WardrobeContext.tsx` — a cache over the server, not the source of truth. Read/write via `useWardrobe()`.
- `lib/matching.ts` holds `shopMatches` only. `generateOutfits` was deleted with the fallback.
- No unit tests, at the user's direction; verify with `npx tsc --noEmit`, `npx expo lint`, and driving the real app.
- **Never commit without explicit permission.**

## AI models (Groq)

- Outfits: `llama-3.3-70b-versatile` (production).
- Vision: `qwen/qwen3.6-27b` — Groq's current vision model. The previous one (`meta-llama/llama-4-scout-17b-16e-instruct`) was a preview model Groq **removed from the API**, which broke item analysis until it was swapped. Vision ids are volatile — if analysis fails, check `GET /openai/v1/models` and https://console.groq.com/docs/vision. Model ids are single constants in their routes.
- Asked for more outfits than the wardrobe supports, the model repeats combinations; `validatePicks` dedupes and returns fewer.

## Palette

cream `#F7F1E8` bg · charcoal `#2E2A26` text · terracotta `#C56B4A` accent · green `#4F8A5B` / amber `#C98A2E` for Shop Check.
