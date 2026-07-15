# Real AI Outfit Suggestions (Groq) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a real Groq-backed AI path for the Today's Outfits screen, with the existing dummy `generateOutfits` as an automatic silent fallback.

**Architecture:** A new Expo Router API route (`app/api/outfits+api.ts`) is the only code that talks to Groq and the only place `GROQ_API_KEY` exists. A new client module `lib/ai.ts` POSTs the wardrobe to that route, maps returned garment ids back to in-memory `Garment` objects, and falls back to the unmodified `lib/matching.ts` dummy on any failure. `app/(tabs)/outfits.tsx` becomes async (spinner while loading) and shows a small source badge per card.

**Tech Stack:** Expo ~54 (Router API routes, `web.output: "server"`), React Native 0.81, TypeScript strict, Groq chat completions API (`llama-3.3-70b-versatile`, `response_format: json_object`).

**Spec:** `docs/superpowers/specs/2026-07-15-groq-outfit-ai-design.md`

## Global Constraints

- **Expo v54** — consult https://docs.expo.dev/versions/v54.0.0/ before using any Expo/RN API. Do not invent APIs.
- **`lib/matching.ts` must not be modified.** It stays the single dummy source of truth.
- **NO TESTS.** Do not create test files or add jest. Verify with `npx tsc --noEmit`, `npx expo lint`, and manual run. (Project rule; overrides TDD defaults.)
- **Types/interfaces separated (mandatory).** No inline `type`/`interface` declarations anywhere. Type aliases go in `types/`, interfaces in `interfaces/`, imported via `@/types/*` and `@/interfaces/*`.
- **TypeScript strict — no `any`.** Use `unknown` + type guards for external JSON.
- **Native RN primitives only** in components; all colors/spacing/radii from `constants/design.ts`; never hardcode a hex in a component.
- **The API key must never reach the client bundle.** No `EXPO_PUBLIC_` prefix, no key in app code.
- **Git:** commit locally after each task. Do NOT push.

---

## File Structure

```
app.json                      MODIFY: web.output "static" → "server"
.gitignore                    MODIFY: add .env
.env.example                  CREATE: template with GROQ_API_KEY=
types/outfit-source.ts        CREATE: OutfitSource
interfaces/ai.ts              CREATE: AiOutfitPick, OutfitsRequestBody, OutfitsResponseBody, GetOutfitsResult, GroqChatResponse
app/api/outfits+api.ts        CREATE: POST handler → Groq proxy (server-side only)
lib/ai.ts                     CREATE: getOutfits() — AI attempt + dummy fallback
app/(tabs)/outfits.tsx        MODIFY: async load, Spinner, source badge
```

---

## Task 1: Config + types/interfaces foundation

**Files:**
- Modify: `app.json` (web section, line 25-28)
- Modify: `.gitignore` (local env files section, line 33-34)
- Create: `.env.example`
- Create: `types/outfit-source.ts`
- Create: `interfaces/ai.ts`

**Interfaces:**
- Consumes: `Garment` from `@/interfaces/garment`, `Outfit` from `@/interfaces/outfit` (existing).
- Produces: `OutfitSource`, `AiOutfitPick`, `OutfitsRequestBody`, `OutfitsResponseBody`, `GetOutfitsResult`, `GroqChatResponse` — used by Tasks 2, 3, 4.

- [ ] **Step 1: Enable server output in `app.json`**

Change the `web` block (currently `"output": "static"`):

```json
    "web": {
      "output": "server",
      "favicon": "./assets/images/favicon.png"
    },
```

This is required for Expo Router API routes to be served (per Expo v54 docs, `web.output: "server"` generates a server bundle alongside the client bundle).

- [ ] **Step 2: Ignore `.env` in `.gitignore`**

The file currently only ignores `.env*.local`. Update the local env files section:

```
# local env files
.env
.env*.local
```

- [ ] **Step 3: Create `.env.example`**

```
# Copy this file to .env and paste your Groq API key (get one free at https://console.groq.com)
GROQ_API_KEY=
```

(`.env.example` IS committed; the real `.env` never is.)

- [ ] **Step 4: Create `types/outfit-source.ts`**

```ts
export type OutfitSource = 'ai' | 'dummy';
```

- [ ] **Step 5: Create `interfaces/ai.ts`**

```ts
import { Garment } from '@/interfaces/garment';
import { Outfit } from '@/interfaces/outfit';
import { OutfitSource } from '@/types/outfit-source';

export interface AiOutfitPick {
  topId: string;
  bottomId: string;
  shoesId: string;
  score: number;   // 0..100
  reason: string;
}

export interface OutfitsRequestBody {
  items: Garment[];
}

export interface OutfitsResponseBody {
  outfits: AiOutfitPick[];
}

export interface GetOutfitsResult {
  outfits: Outfit[];
  source: OutfitSource;
}

// Minimal shape of Groq's chat completion response (OpenAI-compatible).
export interface GroqChatResponse {
  choices: { message: { content: string } }[];
}
```

- [ ] **Step 6: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add app.json .gitignore .env.example types/outfit-source.ts interfaces/ai.ts
git commit -m "feat: add server output config and AI suggestion types"
```

---

## Task 2: Backend API route — Groq proxy

**Files:**
- Create: `app/api/outfits+api.ts`

**Interfaces:**
- Consumes: `Garment` from `@/interfaces/garment`; `AiOutfitPick`, `OutfitsRequestBody`, `GroqChatResponse` from `@/interfaces/ai`.
- Produces: HTTP endpoint `POST /api/outfits`. Success: `200 { outfits: AiOutfitPick[] }`. Errors: `503 { error: 'no_key' }`, `400 { error: 'bad_request' }`, `502 { error: 'groq_failed' }`. Task 3 depends on exactly these statuses/shapes.

Notes for the implementer:
- Expo Router API routes: a file `app/api/outfits+api.ts` serves `/api/outfits`. Export `export async function POST(request: Request)` returning a `Response`. Standard Web `Request`/`Response` — no imports needed for those. Server routes see all `process.env` vars from `.env` in development (no `EXPO_PUBLIC_` prefix needed or wanted).
- Groq is OpenAI-compatible: `POST https://api.groq.com/openai/v1/chat/completions` with `Authorization: Bearer <key>`. With `response_format: { type: 'json_object' }` the prompt MUST contain the word "JSON" and the model returns a single JSON object (not a bare array) in `choices[0].message.content`.

- [ ] **Step 1: Create `app/api/outfits+api.ts`**

```ts
import { Garment } from '@/interfaces/garment';
import { AiOutfitPick, OutfitsRequestBody, GroqChatResponse } from '@/interfaces/ai';

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.3-70b-versatile';

function isPick(v: unknown): v is AiOutfitPick {
  if (typeof v !== 'object' || v === null) return false;
  const p = v as Record<string, unknown>;
  return (
    typeof p.topId === 'string' &&
    typeof p.bottomId === 'string' &&
    typeof p.shoesId === 'string' &&
    typeof p.score === 'number' &&
    p.score >= 0 && p.score <= 100 &&
    typeof p.reason === 'string'
  );
}

// Keep only picks whose ids exist in the wardrobe with the right category per slot.
function validatePicks(raw: unknown, items: Garment[]): AiOutfitPick[] {
  if (!Array.isArray(raw)) return [];
  const byId = new Map(items.map((g) => [g.id, g]));
  return raw.filter(isPick).filter((p) => {
    return (
      byId.get(p.topId)?.category === 'top' &&
      byId.get(p.bottomId)?.category === 'bottom' &&
      byId.get(p.shoesId)?.category === 'footwear'
    );
  }).slice(0, 3);
}

function buildPrompt(items: Garment[]): string {
  const catalogue = items
    .map(
      (g) =>
        `id=${g.id} | ${g.name} | category=${g.category} | color=${g.color} | ` +
        `formality=${g.formality}/5 | pattern=${g.pattern} | ` +
        `seasons=${g.seasons.join(',')} | occasions=${g.occasions.join(',')}`,
    )
    .join('\n');
  return (
    `Here is a wardrobe:\n${catalogue}\n\n` +
    `Suggest up to 3 outfits that pair well (color harmony, similar formality, shared occasions). ` +
    `Each outfit uses exactly one category=top, one category=bottom and one category=footwear item, by id. ` +
    `Respond with a JSON object of this exact shape and nothing else: ` +
    `{"outfits":[{"topId":"...","bottomId":"...","shoesId":"...","score":85,"reason":"..."}]} ` +
    `where score is 0-100 (how well the outfit works) and reason is a short explanation of max 12 words.`
  );
}

export async function POST(request: Request): Promise<Response> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return Response.json({ error: 'no_key' }, { status: 503 });
  }

  let items: Garment[];
  try {
    const body = (await request.json()) as OutfitsRequestBody;
    items = body.items;
    if (!Array.isArray(items) || items.length === 0) throw new Error('empty');
  } catch {
    return Response.json({ error: 'bad_request' }, { status: 400 });
  }

  try {
    const groqRes = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        temperature: 0.4,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: 'You are a fashion stylist. You only reply with JSON.' },
          { role: 'user', content: buildPrompt(items) },
        ],
      }),
    });
    if (!groqRes.ok) throw new Error(`groq status ${groqRes.status}`);

    const data = (await groqRes.json()) as GroqChatResponse;
    const parsed = JSON.parse(data.choices[0].message.content) as Record<string, unknown>;
    const outfits = validatePicks(parsed.outfits, items);
    if (outfits.length === 0) throw new Error('no valid outfits');

    return Response.json({ outfits });
  } catch {
    return Response.json({ error: 'groq_failed' }, { status: 502 });
  }
}
```

- [ ] **Step 2: Typecheck + lint**

Run: `npx tsc --noEmit && npx expo lint`
Expected: PASS.

- [ ] **Step 3: Manual endpoint check (no key configured)**

With no `.env` present, start the dev server (`npx expo start`), then in another terminal:

```bash
curl -s -X POST http://localhost:8081/api/outfits -H "Content-Type: application/json" -d "{\"items\":[]}"
```

Expected: `{"error":"no_key"}` (HTTP 503) — proves the route is being served and the key gate works. Stop the dev server afterwards.

- [ ] **Step 4: Commit**

```bash
git add "app/api/outfits+api.ts"
git commit -m "feat: add Groq-backed /api/outfits API route"
```

---

## Task 3: Client orchestrator — `lib/ai.ts`

**Files:**
- Create: `lib/ai.ts`

**Interfaces:**
- Consumes: `POST /api/outfits` contract from Task 2; `OutfitsResponseBody`, `GetOutfitsResult` from `@/interfaces/ai`; `Garment`, `Outfit` (existing); `generateOutfits` from `@/lib/matching` (unmodified).
- Produces: `getOutfits(items: Garment[]): Promise<GetOutfitsResult>` — used by Task 4.

Notes for the implementer:
- Relative `fetch('/api/outfits')` works on native and web in development: Expo rewrites relative URLs to the dev server origin.
- Every failure mode (503 no key, 502 groq failure, network error, timeout, invalid ids) must collapse into the single catch → dummy fallback. No per-mode handling.

- [ ] **Step 1: Create `lib/ai.ts`**

```ts
import { Garment } from '@/interfaces/garment';
import { Outfit } from '@/interfaces/outfit';
import { OutfitsResponseBody, GetOutfitsResult } from '@/interfaces/ai';
import { generateOutfits } from '@/lib/matching';

const TIMEOUT_MS = 8000;

// Tries the real-AI backend first; on ANY failure returns the dummy
// generateOutfits result so the app behaves exactly like the prototype.
export async function getOutfits(items: Garment[]): Promise<GetOutfitsResult> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    let res: Response;
    try {
      res = await fetch('/api/outfits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }
    if (!res.ok) throw new Error(`api status ${res.status}`);

    const data = (await res.json()) as OutfitsResponseBody;
    const byId = new Map(items.map((g) => [g.id, g]));
    const outfits: Outfit[] = [];
    data.outfits.forEach((p, i) => {
      const top = byId.get(p.topId);
      const bottom = byId.get(p.bottomId);
      const shoes = byId.get(p.shoesId);
      if (!top || !bottom || !shoes) return;
      outfits.push({ id: `ai${i + 1}`, top, bottom, shoes, score: p.score, reason: p.reason });
    });
    if (outfits.length === 0) throw new Error('no valid outfits');

    return { outfits, source: 'ai' };
  } catch {
    return { outfits: generateOutfits(items), source: 'dummy' };
  }
}
```

- [ ] **Step 2: Typecheck + lint**

Run: `npx tsc --noEmit && npx expo lint`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add lib/ai.ts
git commit -m "feat: add getOutfits client with AI attempt and dummy fallback"
```

---

## Task 4: Outfits screen — async load, spinner, source badge

**Files:**
- Modify: `app/(tabs)/outfits.tsx` (full rewrite below)

**Interfaces:**
- Consumes: `getOutfits` from `@/lib/ai`; `GetOutfitsResult` from `@/interfaces/ai`; `useWardrobe`, `GarmentTile`, `Spinner` (existing, `Spinner` takes optional `label`); design tokens.
- Produces: final UI. No downstream consumers.

Notes for the implementer:
- `generateOutfits` is no longer imported here — the screen goes through `getOutfits` only; the dummy path lives inside `lib/ai.ts`.
- The badge is plain `<Text>` styled from design tokens (accent-tinted for AI, muted for prototype), following the same pattern as `WearBadge`. Do not modify `Chip` or create a new component file.
- `result === null` means loading. The effect re-runs when `items` changes (context array identity changes on add), showing the spinner again.

- [ ] **Step 1: Rewrite `app/(tabs)/outfits.tsx`**

```tsx
import { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useWardrobe } from '@/lib/WardrobeContext';
import { getOutfits } from '@/lib/ai';
import { GetOutfitsResult } from '@/interfaces/ai';
import { GarmentTile } from '@/components/fitcheck/GarmentTile';
import { Spinner } from '@/components/fitcheck/Spinner';
import { colors, radii, spacing, shadow, type } from '@/constants/design';

export default function OutfitsScreen() {
  const { items } = useWardrobe();
  const [result, setResult] = useState<GetOutfitsResult | null>(null);

  useEffect(() => {
    let cancelled = false;
    setResult(null);
    getOutfits(items).then((r) => {
      if (!cancelled) setResult(r);
    });
    return () => {
      cancelled = true;
    };
  }, [items]);

  const ai = result?.source === 'ai';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Text style={[type.title, styles.title]}>Today’s Outfits</Text>
      {result === null ? (
        <Spinner label="Asking AI for outfit ideas…" />
      ) : (
        <ScrollView contentContainerStyle={styles.body}>
          {result.outfits.map((o) => (
            <View key={o.id} style={styles.card}>
              <View style={styles.tiles}>
                <View style={styles.tile}><GarmentTile garment={o.top} height={90} /></View>
                <View style={styles.tile}><GarmentTile garment={o.bottom} height={90} /></View>
                <View style={styles.tile}><GarmentTile garment={o.shoes} height={90} /></View>
              </View>
              <View style={styles.meta}>
                <View style={styles.metaRow}>
                  <Text style={styles.score}>{o.score}% match</Text>
                  <Text style={[styles.badge, ai ? styles.badgeAi : styles.badgeDummy]}>
                    {ai ? 'AI-powered' : 'Prototype match'}
                  </Text>
                </View>
                <Text style={type.label}>{o.reason}</Text>
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  title: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  body: { padding: spacing.lg, gap: spacing.lg },
  card: { backgroundColor: colors.surface, borderRadius: radii.lg, padding: spacing.md, gap: spacing.md, ...shadow },
  tiles: { flexDirection: 'row', gap: spacing.sm },
  tile: { flex: 1 },
  meta: { gap: 2 },
  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  score: { fontSize: 16, fontWeight: '800', color: colors.accent },
  badge: { fontSize: 11, fontWeight: '700', borderRadius: radii.pill, paddingHorizontal: spacing.sm, paddingVertical: 3, overflow: 'hidden' },
  badgeAi: { color: colors.accent, backgroundColor: colors.accentSoft },
  badgeDummy: { color: colors.muted, backgroundColor: colors.chip },
});
```

- [ ] **Step 2: Typecheck + lint**

Run: `npx tsc --noEmit && npx expo lint`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add "app/(tabs)/outfits.tsx"
git commit -m "feat: load outfit suggestions via AI with dummy fallback badge"
```

---

## Task 5: End-to-end verification

- [ ] **Step 1: Static checks**

Run: `npx tsc --noEmit && npx expo lint`
Expected: both PASS.

- [ ] **Step 2: Smoke test WITHOUT a key (fallback path)**

Ensure no `.env` file exists. Run `npx expo start`, open the app, go to the Outfits tab. Confirm:
- Spinner "Asking AI for outfit ideas…" appears briefly.
- 2–3 outfit cards render exactly like before, each showing a muted "Prototype match" badge.
- Add an item on the Add tab, return to Outfits: spinner re-runs, cards still render (dummy path).
- Other tabs (Wardrobe, Add, Shop Check) behave exactly as before.

- [ ] **Step 3: Smoke test WITH a key (AI path) — requires user's key**

Copy `.env.example` to `.env`, paste a real `GROQ_API_KEY`, restart `npx expo start`. On the Outfits tab confirm:
- Cards show the accent "AI-powered" badge.
- Outfits reference real wardrobe items (one top, one bottom, one footwear each) with a sensible reason.
- Removing the key (delete `.env`, restart) restores the "Prototype match" behavior.

If no key is available at implementation time, mark this step as pending user verification and tell the user how to run it.

- [ ] **Step 4: Final commit (only if fixups were needed)**

```bash
git add -A
git commit -m "chore: verification fixups for AI outfit suggestions"
```

---

## Self-Review (against spec)

- Dummy kept fully intact, `lib/matching.ts` untouched → Global constraint + Task 3 (fallback import only). ✓
- Backend = Expo API route, key server-side only, `.env` at root → Tasks 1–2. ✓
- `503 no_key` / `502 groq_failed` / id-returning contract → Task 2. ✓
- Client maps ids → Garments, single catch-all fallback, ~8s timeout → Task 3. ✓
- Spinner + AI/Prototype badge on Outfits screen → Task 4. ✓
- Types/interfaces separation (`types/outfit-source.ts`, `interfaces/ai.ts`) → Task 1. ✓
- `.gitignore` gains `.env`; `.env.example` committed → Task 1. ✓
- Out of scope respected: `shopMatches`, Shop Check, retries, toggle — none touched. ✓
