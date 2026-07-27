# Keyboard-Aware Input UX — Design

**Date:** 2026-07-27
**Status:** Implemented — see PR #3
**Motivation:** Signing in and filling out the Add Item form is visibly janky. On
Android the form *snaps* to a new position when the keyboard opens, the focused
field can end up hidden behind the keyboard, and there is no next-field flow or
password-manager autofill. The text fields themselves have no focus feedback at all.

---

## 1. Problem

Six concrete defects, all in code that exists today:

1. **Android keyboard avoidance is a no-op.** `components/fitcheck/AuthScreen.tsx`
   uses `behavior={Platform.OS === 'ios' ? 'padding' : undefined}`. With `undefined`,
   `KeyboardAvoidingView` does nothing on Android. The screen relies solely on the
   manifest's `android:windowSoftInputMode="adjustResize"`, which shrinks the window
   in one step.
2. **That window shrink fights `justifyContent: 'center'`.** The auth scroll content
   is vertically centred (`AuthScreen.tsx` `styles.scroll`). When `adjustResize`
   changes the viewport height, the centre point moves and the entire form jumps to a
   new position with no interpolation. This is the jank the user reported.
3. **Nothing scrolls the focused field into view.** On `app/(auth)/signup.tsx` (four
   fields), focusing *Confirm Password* leaves it behind the keyboard.
4. **The Add Item form has no keyboard handling whatsoever.** `app/(tabs)/add.tsx`
   renders a bare `ScrollView`. Its *Name* and *Pattern* inputs sit above a *Save to
   wardrobe* button that the keyboard covers completely.
5. **No field-to-field flow and no autofill.** No `returnKeyType`/`onSubmitEditing`
   chain, and no `autoComplete`/`textContentType`, so password managers cannot
   recognise the email or password fields.
6. **`AuthField` has no focus state.** Tapping into an input produces no visual
   change — no border, label, or surface transition.

Additionally, the bottom tab bar has no `tabBarHideOnKeyboard`, so on Android it is
pushed up above the keyboard on the Add screen.

## 2. Decisions (confirmed)

| Decision | Choice |
|---|---|
| Keyboard mechanism | **`react-native-keyboard-controller`** (native dev build accepted) |
| Scope | **Input UX only** — avoidance, auto-scroll, focus animation, field chaining, autofill, tab bar |
| Focus animation driver | **Reanimated 4** (already installed, 4.1.1) |
| Android soft input mode | **Keep `adjustResize`** |
| Tab bar vs keyboard | **`tabBarHideOnKeyboard: true`** |
| Spec committed to git | **Yes** — committed alongside the implementation in PR #3 |

### 2.1 Why not Reanimated's `useAnimatedKeyboard`

The obvious zero-dependency route was `useAnimatedKeyboard`, since Reanimated 4.1.1
is already a dependency. It is **deprecated in Reanimated 4**; the Reanimated docs
recommend migrating to `react-native-keyboard-controller` (citing persistent iOS
bugs), and Expo's SDK 54 keyboard-handling guide independently recommends the same
library for anything beyond the basic case. Building new work on a deprecated hook
was rejected.

### 2.2 Why not `softwareKeyboardLayoutMode: "pan"`

Expo's keyboard guide offers `"pan"` as one way to stop a bottom tab bar riding up
with the keyboard. It is **incompatible with this design**:
`react-native-keyboard-controller` requires `android:windowSoftInputMode="adjustResize"`
(already set in `android/app/src/main/AndroidManifest.xml`). Switching to `"pan"`
would break keyboard tracking. `tabBarHideOnKeyboard: true` achieves the same result
without touching the soft input mode.

### 2.3 Accepted cost

These screens will require a **development build**. `react-native-keyboard-controller`
contains native code and does not run in Expo Go. This is already the project's
workflow — a prebuilt `android/` directory exists and `npm run android` maps to
`expo run:android`. One rebuild is required after install.

## 3. Architecture

### 3.1 Provider (`app/_layout.tsx`)

`<KeyboardProvider>` wraps the `<Stack>`, inside the existing `ThemeProvider` /
`AuthSessionProvider` / `WardrobeProvider` nesting, so every screen — auth and tabs —
is covered by one provider.

The app sets `edgeToEdgeEnabled: true` in `app.json`. `KeyboardProvider` exposes
Android translucency options for this case.

**Resolved during implementation (verified, not assumed): pass no translucency props.**
Expo installed `react-native-keyboard-controller@1.18.5` (its SDK 54 pin, not latest).
Reading its source, the provider computes:

```js
navigationBarTranslucent: IS_EDGE_TO_EDGE || navigationBarTranslucent,
statusBarTranslucent:     IS_EDGE_TO_EDGE || statusBarTranslucent,
preserveEdgeToEdge:       IS_EDGE_TO_EDGE || preserveEdgeToEdge,
```

`IS_EDGE_TO_EDGE` comes from `react-native-is-edge-to-edge`, which on Android returns
true if either the `RNEdgeToEdge` TurboModule is present **or**
`DeviceInfo.getConstants().isEdgeToEdge === true`. `react-native-edge-to-edge` is *not*
a dependency here, but the second path applies: Expo's `edgeToEdgeEnabled: true` sets
that native constant. All three props therefore resolve to `true` on their own.

Passing them explicitly would be redundant, and hardcoding `statusBarTranslucent` would
silently become wrong if edge-to-edge were ever disabled. So they are omitted, with a
comment in `app/_layout.tsx` recording why.

### 3.2 Auth chrome (`components/fitcheck/AuthScreen.tsx`)

Replace the `KeyboardAvoidingView` + `ScrollView` pair with a single
`KeyboardAwareScrollView`:

```tsx
<KeyboardAwareScrollView
  contentContainerStyle={styles.scroll}
  bottomOffset={spacing.xl}
  keyboardShouldPersistTaps="handled"
  keyboardDismissMode="on-drag"
>
```

Key point: **`justifyContent: 'center'` is kept**. `KeyboardAwareScrollView`'s
default `mode="insets"` creates room for the keyboard by extending the scrollable
area through content insets rather than reflowing layout. Content height is therefore
unchanged when the keyboard appears, the centre point does not move, and the library
animates *scroll offset* instead — which is frame-synced to the keyboard on both
platforms. This fixes defect 2 without sacrificing the centred composition that the
screen is designed around.

`bottomOffset={spacing.xl}` (24) keeps the focused field clear of the keyboard rather
than flush against it, fixing defect 3. `keyboardDismissMode="on-drag"` adds
swipe-to-dismiss.

`KeyboardAvoidingView` and `Platform` imports are dropped if otherwise unused.

### 3.3 Animated focus state (`components/fitcheck/AuthField.tsx`)

A Reanimated shared value tracks focus progress, driven by the `TextInput`'s
`onFocus`/`onBlur`:

```text
focus = useSharedValue(0)
onFocus  → focus.value = withTiming(1, { duration: 180 })
onBlur   → focus.value = withTiming(0, { duration: 180 })
```

`useAnimatedStyle` + `interpolateColor` maps that progress onto:

- the input wrapper's `borderColor`: `colors.border` → `colors.accent`
- the label's `color`: `colors.muted` → `colors.accent`

The wrapper becomes an `Animated.View` and the label an `Animated.Text`.

**Border colour is animated, not border width.** Animating width would change the
row's layout on every focus change and reintroduce exactly the kind of jitter this
work removes. `borderWidth` stays pinned at 1.

All colour values come from `constants/design.ts`. No hex literal is introduced.

The existing show/hide password state and eye toggle are unchanged.

### 3.4 Field chaining and refs

Each `AuthField` accepts a `ref` that it forwards to its inner `TextInput`. React
19.1 passes `ref` as an ordinary prop to function components, so `forwardRef` is not
needed.

Chains, with the last field submitting the form:

- **Login:** Email → Password → submit
- **Signup:** Full Name → Email → Password → Confirm Password → submit
- **Add Item:** Name → Pattern

Non-terminal fields get `returnKeyType="next"`, with `onSubmitEditing` focusing the
next ref and `submitBehavior="submit"` so the keyboard stays up between fields.

Terminal field behaviour differs by screen, deliberately:

- **Login / Signup:** `returnKeyType="go"`, `onSubmitEditing` calls the screen's
  existing `enter` handler. Pressing Go submits the form.
- **Add Item:** `returnKeyType="done"`, which **only dismisses the keyboard**. It must
  *not* trigger save — *Pattern* is followed by Category / Formality / Seasons /
  Occasions pickers, and `canSave` requires a season and an occasion to be chosen. The
  user has more to do after the last text field, so submitting there would either fail
  the `canSave` guard or be a confusing no-op.

The auth screens' `AuthField` receives these through the props added in §3.8. The Add
screen uses bare `TextInput`s (not `AuthField`), so its refs and props are applied
directly to those elements — no interface change is needed for it.

### 3.5 Autofill attributes

| Screen | Field | `autoComplete` | `textContentType` |
|---|---|---|---|
| Login | Email | `email` | `emailAddress` |
| Login | Password | `current-password` | `password` |
| Signup | Full Name | `name` | `name` |
| Signup | Email | `email` | `emailAddress` |
| Signup | Password | `new-password` | `newPassword` |
| Signup | Confirm Password | `new-password` | `newPassword` |

### 3.6 Add Item form (`app/(tabs)/add.tsx`)

The screen's `ScrollView` becomes a `KeyboardAwareScrollView` with
`bottomOffset={spacing.xl}` and the existing `keyboardShouldPersistTaps="handled"`
retained, so the *Name* and *Pattern* inputs and the *Save to wardrobe* button all
stay reachable while typing. Its two bare `TextInput`s are chained per §3.4 — *Name*
`"next"` → *Pattern* `"done"` (dismiss only, never save).

No focus animation is added here. These inputs are not `AuthField`s, and restyling the
Add form's inputs is outside the confirmed scope; §3.3 applies to the auth fields only.

The `useFocusEffect` reset behaviour, phase state machine, and save/validation logic
are untouched.

### 3.7 Tab bar (`app/(tabs)/_layout.tsx`)

`tabBarHideOnKeyboard: true` is added to the existing `screenOptions`.

### 3.8 Types (`interfaces/auth.ts`)

`AuthFieldProps` gains, all sourced from `TextInputProps` rather than hand-written
unions:

```ts
ref?: Ref<TextInput>;
returnKeyType?: TextInputProps['returnKeyType'];
onSubmitEditing?: TextInputProps['onSubmitEditing'];
autoComplete?: TextInputProps['autoComplete'];
textContentType?: TextInputProps['textContentType'];
```

Per the design system, no inline `type`/`interface` is declared in any component;
these live in `interfaces/auth.ts` and are imported. `AuthScreenProps` is unchanged.

## 4. Files touched

| File | Change |
|---|---|
| `package.json` | add `react-native-keyboard-controller` |
| `app/_layout.tsx` | wrap `Stack` in `KeyboardProvider` |
| `app/(tabs)/_layout.tsx` | `tabBarHideOnKeyboard: true` |
| `components/fitcheck/AuthScreen.tsx` | `KeyboardAwareScrollView` replaces `KeyboardAvoidingView` + `ScrollView` |
| `components/fitcheck/AuthField.tsx` | animated focus state, ref forwarding, new input props |
| `interfaces/auth.ts` | extend `AuthFieldProps` |
| `app/(auth)/login.tsx` | ref chain + autofill props |
| `app/(auth)/signup.tsx` | ref chain + autofill props |
| `app/(tabs)/add.tsx` | `KeyboardAwareScrollView` + chain two inputs |

## 5. Error handling

This change introduces no new failure modes: no network calls, no data access, no
parsing. The "never invent data" rule is unaffected — existing Supabase error surfacing
in `login.tsx` / `signup.tsx` and the `Alert` paths in `add.tsx` are untouched.

The one genuine risk is **misconfiguration**, not runtime failure: if the library's
native module is not linked (stale build) or the edge-to-edge props of §3.1 are wrong,
the symptom is a wrong keyboard offset or a non-functional provider. Both are caught by
driving the app on a device (§6) and neither produces silently wrong data.

## 6. Verification

Per the design system's standing direction, no unit tests. Verification is:

1. `npx tsc --noEmit` — clean.
2. `npx expo lint` — clean.
3. `npx expo run:android` — fresh native build, required for the new native module.
4. Drive the real app on device:
   - **Login:** tap Email → form rises smoothly with no snap; Email and Password both
     stay visible; border and label animate to terracotta on focus; Next moves to
     Password; Go submits; password manager offers to fill.
   - **Signup:** focusing *Confirm Password* — the worst case — scrolls it clear of the
     keyboard; the full four-field Next chain works.
   - **Add Item:** with a photo analysed, focusing *Name* and *Pattern* keeps both the
     input and *Save to wardrobe* reachable; the tab bar hides while the keyboard is up.
   - Swipe down over the scroll view dismisses the keyboard.

## 7. Out of scope

Explicitly excluded (scope confirmed as "input UX only"):

- Inline per-field validation. Password mismatch still surfaces only on submit.
- Disabled state on the primary button when fields are empty.
- Animated entrance or animated error reveal on the auth screens.
- Any change to the wardrobe, outfits, or shop screens.
- `KeyboardToolbar`. A native next/prev/done toolbar was considered and rejected in
  favour of the explicit ref chain (§3.4), which is deterministic, needs no extra
  theming to match the cream/charcoal palette, and adds no offset interaction with
  `KeyboardAwareScrollView`'s inset handling.
