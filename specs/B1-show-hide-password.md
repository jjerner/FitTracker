# B1 – Show/hide password toggle

Issue: jjerner/FitTracker#11

## Goal

Let users see what they typed in password boxes on login, signup and forgot-password. Screen readers must announce the toggle properly.

## Current state (already mostly built)

`src/components/LabeledInput.tsx` already has a `password` prop. It hides the text and shows a "Show"/"Hide" text button on the right. All three password boxes already use it:
- `src/app/(auth)/login.tsx` (line ~57)
- `src/app/(auth)/signup.tsx` (line ~130)
- `src/app/(auth)/forgot-password.tsx` "New password" (line ~99)

What's missing: the toggle `Pressable` has no `accessibilityRole` or `accessibilityLabel`, so a screen reader just says "Show" with no context. The issue also says "eye", but today the toggle is the word Show/Hide (see Open questions).

## Files to touch

- `src/components/LabeledInput.tsx`, only the toggle `Pressable`:
  - add `accessibilityRole="button"`
  - add `accessibilityLabel={revealed ? 'Hide password' : 'Show password'}`
  - Only if the user picks the eye icon (Open question 1): swap the `<Text>` for a `SymbolView` (`expo-symbols`, already used in `src/app/(tabs)/profile/index.tsx` and `src/app/(tabs)/_layout.tsx`): `name={revealed ? { ios: 'eye.slash', android: 'visibility_off' } : { ios: 'eye', android: 'visibility' }}`, `tintColor={colors.primary}`, `size={22}`. Shrink `inputWithToggle` paddingRight from 64 to about 44. Remove `toggleText` style if it is no longer used.

No changes to the three auth screens.

## Reuse

- `LabeledInput` `password` prop (already there).
- `SymbolView` from `expo-symbols` plus `colors` from `src/theme` (only for the eye-icon option).

## Acceptance criteria

- [ ] Login, signup and forgot-password "New password" all hide the text by default and have a toggle (already true; must stay true).
- [ ] Tapping the toggle shows the text; tapping again hides it.
- [ ] Toggle has `accessibilityRole="button"` and a label that reads "Show password" when hidden and "Hide password" when shown.
- [ ] Non-password `LabeledInput`s (food, workouts, custom food) look and work as before.
- [ ] If eye icon chosen: icon is visible on Android and web, and the text never runs under it.
- [ ] `npx tsc --noEmit` and `npx expo lint` pass.

## Test plan

- Unit tests: none. This is a one-line prop change on a component with no tests.
- Web (`npx expo start --web --port 8081`, test account from `.env.test.local`):
  - Login: type a password, tap toggle, text shows; tap again, hidden. Log in still works.
  - Signup: same toggle check (don't submit).
  - Forgot password: send code to the test account, check toggle on "New password" (or just check the field shows once the code step is reached).
  - Inspect the toggle in DevTools: has `role="button"` and `aria-label` "Show password"/"Hide password".
  - Console has no errors.
- Phone list (HANDOVER.md): TalkBack reads "Show password, button". If eye icon chosen, the icon renders on Android.

## Needs from the user

- Answer to Open question 1.
- Shipping is JS-only: `eas update`, no SQL, no new APK.

## Open questions

1. Keep the existing "Show"/"Hide" text button (just add accessibility), or swap it for an eye icon as the issue says? The text version is already live and is the smaller change.
2. HANDOVER says signup and forgot-password are "for consistency (confirm)". All three already have the toggle. Is that OK, or should any of them not have it?

## Out of scope

- Profile has no password fields today (`src/app/(tabs)/profile/index.tsx` has name, goals and settings only). Change-password is item 5.7, not built here.
- No "confirm password" field, strength meter, or caps-lock warning.

## Decisions (2026-10-18)

- Swap the Show/Hide text for an eye icon (`SymbolView` from `expo-symbols`, as used elsewhere; check it renders on web, else use the app's existing fallback) **and** add `accessibilityRole="button"` + `accessibilityLabel` "Show password"/"Hide password".
- All three auth screens keep the toggle (as today).
