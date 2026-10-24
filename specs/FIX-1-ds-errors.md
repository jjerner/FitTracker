# FIX-1 – Chart console errors, cut-off chart label, weight range, password message colour

Issue: jjerner/FitTracker #118. Build only Decisions 1-4. Item 5 (aria-selected) is dropped.

## Goal

Fix four small bugs: the red chart errors on web, the last chart date being cut off, the weight box accepting silly values, and the low-contrast "Password changed." text.

## Files to touch

- `package.json` / lockfile: `npx expo install react-native-gifted-charts` (1.4.78 → latest, 1.4.81). The diff must only bump `react-native-gifted-charts` (and its `gifted-charts-core`). If it changes `react-native-svg` or `expo-linear-gradient` (native), stop and tell the user: that would need a new APK.
- `src/app/_layout.tsx` (only if the 7 errors are still there after the update): at module level, on web in dev only, drop `console.error` calls whose first argument is a string that contains `Unknown event handler property`. Pass everything else through unchanged:
  ```ts
  // gifted-charts passes RN responder props to DOM elements on web; React warns once per prop.
  if (Platform.OS === 'web' && __DEV__) {
    const original = console.error;
    console.error = (...args) => {
      if (typeof args[0] === 'string' && args[0].includes('Unknown event handler property')) return;
      original(...args);
    };
  }
  ```
  (React prints these warnings in dev only, so production web has none to filter.)
- `src/app/(tabs)/progress.tsx`
  - Weight chart (line ~160): add `endSpacing={20}` and pass `width={chartWidth - 20}`. Reason: with `adjustToWidth`, gifted-charts sets `endSpacing` to 0, so the last point sits on the right edge and its label is clipped. Taking the same 20 px off `width` keeps the chart the same total size (no sideways scroll). If 20 px is not enough for "24/10" at font size 10, raise both by the same amount.
  - Line 113: `const isValid = parsed >= 20 && parsed <= 400;` (NaN, Infinity, `''` → 0 and negatives all fail this, so the `input !== ''` and `> 0` checks go).
- `src/app/(tabs)/workouts/exercises/[exerciseId].tsx` (line ~135): same chart fix: `endSpacing={20}`, `width={width - 130}`.
- `src/app/(tabs)/profile/password.tsx` line 132: `colors.success` → `colors.successDark`.

## Reuse

- `colors.successDark` in `src/theme.ts` (already used by `Button` success and Home resume button).
- gifted-charts' own `endSpacing` prop. No custom label component.
- `Platform` from `react-native` (already used the same way in `recipe.tsx`, `delete-account.tsx`).

## Acceptance criteria

- [ ] `react-native-gifted-charts` is on 1.4.81; no native package versions changed in `package.json`.
- [ ] Web console shows none of the 7 "Unknown event handler property" errors on Progress (weight chart) or the exercise detail chart. Other `console.error` output still appears.
- [ ] If the update alone fixed the errors, no filter is added.
- [ ] Last x-axis date label shows in full (e.g. "24/10") on both charts; no sideways scroll appeared.
- [ ] Weight box: `19.9`, `400.1`, `1e999`, `abc`, `0`, `-5` and empty keep Log disabled. `20`, `400`, `80,5` and `80.5` enable it and save.
- [ ] "Password changed." uses `colors.successDark`.
- [ ] `npx tsc --noEmit` and `npx expo lint` pass.

## Test plan

- Unit: none (one-line range check, prop changes and a colour swap).
- Web (test account from `.env.test.local`): open Progress with at least 2 weigh-ins. Check the console and the last date label. Switch range tabs. Type each weight value from the list above and watch the Log button. Log one valid weight. Open Workouts → an exercise with 2+ workouts, check the chart's last label and the console, and switch Weight / Est. 1RM. Profile → Password: change it and check the green message (then change it back).
- Phone test issue (`phone-test` label): after the library update, both charts still draw the same (lines, dots, 7-day average line, y-axis), the last date label is not cut off, and the charts still scroll/respond to touch as before.

## Risk

🔴 changes existing: it updates a shared chart library and touches the root layout (if the filter is needed), though each change is tiny.

## Needs from the user

- None for SQL or a new APK build (gifted-charts is pure JS; confirm from the `package.json` diff, see Files to touch).
- Run the phone test issue after `eas update`.

## Open questions

None.

## Out of scope

- Item 5, `aria-selected` on web tabs/chips (dropped by the user).
- Patching gifted-charts or hiding warnings on native / any other warnings.
- A database check for weight range (app-side only, no SQL).
- Other weight inputs (goals, workout sets) and other places using `colors.success`.
- Showing the last data point's label when the every-Nth label pattern skips it.
