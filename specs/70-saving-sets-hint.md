# 70: Hint about how sets save (issue #70)

## Goal

On the active workout screen, a small tip behind an ⓘ next to the elapsed timer explains that each set saves when you tick it, how to change one, and that you can leave and come back. New users see it open. Once closed it stays closed, and ⓘ opens it again.

## Files to touch

- `src/lib/settings.ts`: add a device-only setting, same style as rest vibration.
  - `const SETS_HINT_KEY = 'settings.setsHintOpen';`
  - `getSetsHintOpen(): Promise<boolean>` returns `(await AsyncStorage.getItem(SETS_HINT_KEY)) !== 'closed'`, so it is open when nothing is stored yet.
  - `setSetsHintOpen(open: boolean)` stores `'open'` or `'closed'`.
- `src/hooks/useSetsHint.ts` (new): a copy of `useRestVibration.ts` with query key `['setsHintOpen']`. Return `{ open: query.data, setOpen: saveMutation.mutate }`. Do **not** default `open` to anything, because `undefined` means "still loading".
- `src/app/(tabs)/workouts/active.tsx`:
  - In `ActiveWorkout`, call `const setsHint = useSetsHint();` together with the other hooks, **before** the `if (isLoading || !log)` early return.
  - Replace the bare `<ElapsedClock … />` with a row: `<View style={styles.clockRow}>` holding `<ElapsedClock />` and a `Pressable` with an `AppText` "ⓘ" in `colors.primary`. Tapping it calls `setsHint.setOpen(!setsHint.open)`. The Pressable gets `hitSlop` up to 48 dp, `accessibilityRole="button"`, `accessibilityLabel="How sets are saved"` and `accessibilityState={{ expanded: setsHint.open === true }}`.
  - Under the row, render the box only when `setsHint.open === true`. This means no box while the setting loads, so there is no flash. The box is a `View` (`styles.hint`): row layout, `backgroundColor: colors.primaryBg`, `borderRadius: radius.md`, `padding: spacing.md`, `gap: spacing.sm`, `marginBottom: spacing.lg`. Inside it: `<AppText variant="small" style={{ flex: 1, color: colors.text }}>` with the text below, then a `Pressable` "✕" (`hitSlop`, `accessibilityRole="button"`, `accessibilityLabel="Close tip"`) that calls `setsHint.setOpen(false)`.
  - Text, word for word: "Each set saves when you tick it. Tap the green tick again to change a set. You can leave and come back any time."
  - Styles: move the margins from `subtitle` to the new `clockRow` (`flexDirection: 'row'`, `alignItems: 'center'`, `gap: spacing.sm`, `marginTop: spacing.xs`, `marginBottom: spacing.lg`). `subtitle` keeps only `color: colors.textSecondary`. When the box is open, `clockRow` uses `marginBottom: spacing.sm` so the box sits close under the timer. `ElapsedClock` itself stays the same, so only the clock re-renders every second.
- `src/theme.ts`: add `primaryBg: '#dbeafe'` next to `primary` / `primaryLight`. This is the light-blue tint, the same idea as `successBg` and `warningBg`.
- `docs/design-system.md`: add `ⓘ` to the glyph exception list (line 54). Under Colour, add one line: "`primaryBg` is a light-blue tint for info boxes (tips), with `text` on it."

## Reuse

- The `getRestVibration`/`setRestVibration` and `useRestVibration` pattern (AsyncStorage + react-query), copied as-is.
- `AppText`, plus the `colors`, `spacing` and `radius` tokens.
- The ✕ close pattern from Home's update banner (`Pressable` + `hitSlop` + `accessibilityLabel`).

## Acceptance criteria

- [ ] With nothing stored (fresh device or cleared site data), starting a workout shows the timer line "m:ss elapsed ⓘ" and, under it, the light-blue box with the exact text and a ✕.
- [ ] Tapping ✕ closes the box. Tapping ⓘ while the box is open also closes it.
- [ ] Tapping ⓘ while the box is closed opens it.
- [ ] Whatever was chosen last is kept after leaving the workout, starting a new workout, and reloading or restarting the app.
- [ ] Once closed, the box never shows for even a moment when the screen opens (no flash while the setting loads).
- [ ] The state is kept per device and does not depend on the account.
- [ ] No other text about re-opening the tip. Ticking, the green ✓ and editing a set work exactly as before.
- [ ] Both ⓘ and ✕ have 48 dp tap areas and TalkBack labels. The text wraps at large font sizes and is not cut off.
- [ ] No raw hex in `active.tsx`. `npx tsc --noEmit` and `npx expo lint` pass.

## Test plan

- Unit: none. The only logic is `!== 'closed'`, which is too small to need a test.
- Web (`npx expo start --web --port 8081`, test account from `.env.test.local`). On web, AsyncStorage is localStorage, so all of this can be tested there:
  1. Clear the `settings.setsHintOpen` localStorage key, then start an empty workout. The box is open and the text matches.
  2. Tap ✕. The box closes. Reload the page. The box stays closed and does not flash.
  3. Tap ⓘ. The box opens. Reload. It is still open. Tap ⓘ again. It closes.
  4. Add an exercise, tick a set, then tap the green ✓ to reopen it. This works as before.
  5. Check the ⓘ/✕ `aria-label`s and look for errors in the console.
  6. Discard the test workout.
- Phone: no phone-test issue needed, because nothing here depends on native code. If the next phone check happens anyway, do a quick look with TalkBack and a large font.

## Risk

🔴 changes existing: it changes the header area of the active workout screen and adds a theme colour.

## Needs from the user

None. No SQL and no new APK. JS only, ships with `eas update`.

## UX/UI

**Flow**
- New user: Workouts → start workout → the tip box is already open under the timer → reads it → ✕ (or ⓘ) → box gone for good on this phone.
- Later: tap ⓘ → box opens → ✕ or ⓘ → box closes. The last choice is remembered.

**Screens and parts**
- Changed: the header of the active workout screen only. The workout name, timer, set rows and buttons stay as they are.
- Reused: `AppText`, the `colors`/`spacing`/`radius` tokens, and the ✕ close pattern from Home's update banner.
- New: the ⓘ button next to the timer, the light-blue tip box (built in the screen, not a shared component), and the `primaryBg` colour token.

**Look**
- ⓘ: `AppText variant="label"` in `primary`, so it reads as "you can tap this" and is a bit bigger than the 14 px timer. Blue on the grey screen is about 4.7:1, which passes.
- Box: `primaryBg` fill, no border or shadow, `radius.md`, `spacing.md` padding. It is a quiet note, not a `Card`. The text is `small` in `text` (about 15:1 on the light blue). ✕ is `label` in `textSecondary`, at the top right of the box (`alignItems: 'flex-start'`), so it stays put when the text wraps.
- The box sits between the timer and the first exercise card, `spacing.lg` above the card, the same gap there is today.

**States**
- Setting still loading: ⓘ shows, the box does not (no flash).
- Open (first time, or after ⓘ): the box shows with the text below.
- Closed: only "m:ss elapsed ⓘ" shows.
- Error reading the setting: same as closed, and ⓘ still opens the box. No error text, because it's only a tip.
- Empty workout (no exercises yet): same as above. The box sits above "+ Add Exercise".

**Words** (only these)
- Tip: "Each set saves when you tick it. Tap the green tick again to change a set. You can leave and come back any time."
- TalkBack: ⓘ = "How sets are saved, button, expanded/collapsed"; ✕ = "Close tip, button".
- The box gets `accessibilityLiveRegion="polite"`, so TalkBack reads the tip out when ⓘ opens it.

**Touch and text size**
- ⓘ and ✕ each get `hitSlop` so the tap area is at least 48 × 48 dp. Nothing else on that line can be tapped, so the bigger areas don't steal taps.
- At large font sizes the tip text wraps inside the box (`flex: 1`) and the box grows taller. Nothing is cut off. The timer line is short, so ⓘ stays next to the timer.

**Wireframe** (phone width, box open)
```
┌─────────────────────────────────────┐
│ ← Workout                           │
├─────────────────────────────────────┤
│ Rest test                           │  heading
│ 12:04 elapsed  ⓘ                    │  small grey + blue ⓘ (48 dp tap)
│ ┌─────────────────────────────────┐ │
│ │ Each set saves when you tick  ✕ │ │  light-blue primaryBg box
│ │ it. Tap the green tick again to │ │  small, text colour
│ │ change a set. You can leave and │ │
│ │ come back any time.             │ │
│ └─────────────────────────────────┘ │
│ ┌─────────────────────────────────┐ │
│ │ Back Squat              ⇄ Swap  │ │  unchanged
│ │ ...                             │ │
```
Box closed: the same, without the blue box. The first card sits `spacing.lg` under "12:04 elapsed ⓘ", as it does today.

## Open questions

None.

## Out of scope

- Editing a set by tapping its row. The green ✓ stays the only way, as decided.
- Syncing the state per account, or a "reset tips" setting in Profile.
- A shared `InfoBox`/`Hint` component. Only one screen needs it (design-system rule 4: promote, don't predict).
- Any first-run tour or showing the tip anywhere else (templates, history).
- Changing the elapsed clock, rest timer or set rows.
