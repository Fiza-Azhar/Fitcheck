---
name: fitcheck-design-system
description: Use when building or editing any Fitcheck screen or component — enforces the palette, the types/interfaces separation, and the "all AI is fake" prototype rules.
---

# Fitcheck Design System

Fitcheck is a **frontend-only Expo v54 mobile prototype**. No backend, persistence, or network.

## Rules
- Native RN only: `<View>`, `<Text>`, `<Pressable>`, `<ScrollView>`, `<TextInput>`, `StyleSheet`. No web/CSS/img/div/hover.
- Import all colors/spacing/radii/shadows from `constants/design.ts`. Never hardcode a hex in a component.
- **No inline `type`/`interface`.** Types live in `@/types/*`, interfaces in `@/interfaces/*`, one file per module. Import them.
- Garment images are `GarmentTile` placeholders (hex bg + name). No real image files.
- Every "AI" action is fake: `setTimeout` + a visible `Spinner` ("AI is analysing…").
- Wardrobe state lives in `lib/WardrobeContext.tsx`; read/write via `useWardrobe()`.
- Outfit + shop matching come from `lib/matching.ts` (currently dummy). Screens depend only on its return shape.
- No unit tests; verify with tsc + expo lint + manual run.

## Palette
cream `#F7F1E8` bg · charcoal `#2E2A26` text · terracotta `#C56B4A` accent · green `#4F8A5B` / amber `#C98A2E` for Shop Check.
