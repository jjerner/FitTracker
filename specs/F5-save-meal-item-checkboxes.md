# F5 – "Save as meal": pick which items to save

Source: `beta_test_feedback_2026-10-17.md` line 14.

## Goal

The "Save as meal" popup lists the foods that will be saved, each with a checkbox (all ticked at the start), so the user can leave some out before saving.

## Files to touch

- `src/app/(tabs)/food/index.tsx` (only file)
  - New state next to `savingMeal`: `excluded: Set<string>` (entry ids the user unticked). Storing the *unticked* ids means "all ticked" is the empty default with no setup work.
  - Where the popup opens (`onSaveMeal={setSavingMeal}`), also clear `excluded`. Easiest: a small `openSaveMeal(mealType)` that does `setSavingMeal(mealType); setExcluded(new Set())`.
  - Work out `saveCandidates` = entries of `savingMeal` with `foodId != null` (same filter `saveMealFromEntries` uses; quick-add entries cannot be saved, so they are not shown). `selected` = candidates whose id is not in `excluded`.
  - In the modal, between the name `TextInput` and the Save button: a list of `saveCandidates`, one row each: tappable `Pressable` with a tick box + `foodName` + `Math.round(caloriesKcal)} kcal`. Tapping toggles the id in `excluded` (same Set-toggle as `toggle()` in `DiaryContent`). Wrap the list in a `ScrollView` with `maxHeight` (~300) so a long meal does not push Save off screen.
  - `handleSaveMeal` passes `selected` instead of all meal entries.
  - Save button disabled (and `buttonDisabled` style) when the name is empty **or** `selected.length === 0`. No error popup needed.
  - Order: title, name input, item list, Save. Name stays first so `autoFocus` keeps working.

## Reuse

- `toggle()` Set pattern from `DiaryContent` in the same file.
- `styles.entryRow`, `entryName`, `entryCalories`, `buttonDisabled` in the same file.
- Tick look: `✓` text in a small bordered box, like `check` / `checkDone` in `src/app/(tabs)/workouts/active.tsx` (copy the 2–3 style lines, no shared component).
- `saveMealFromEntries` in `src/lib/foods.ts` unchanged (it already takes any list of entries).
- No new dependency.

## Acceptance criteria

- [ ] Opening "Save as meal" shows every food in that meal (entries from a saved-meal group shown as their single foods), all ticked.
- [ ] Quick-add entries (no food) are not in the list.
- [ ] Tapping a row unticks/reticks it; the tick is visible and the row has `accessibilityRole="checkbox"` + `accessibilityState={{ checked }}`.
- [ ] Save only stores the ticked foods; opening the saved meal in Saved meals shows exactly those, in diary order.
- [ ] With nothing ticked, Save is greyed and does nothing.
- [ ] Closing and reopening the popup (same or other meal) starts with all ticked again.
- [ ] A meal with many foods: list scrolls, Save stays visible.
- [ ] `npx tsc --noEmit` and `npx expo lint` pass.

## Test plan

- Unit tests: none (UI state only; `saveMealFromEntries` unchanged). Tests live only in `src/lib/__tests__`.
- Web click-through (test account from `.env.test.local`):
  1. Log 3 foods + 1 quick-add to Lunch. Open Lunch, tap "Save as meal".
  2. Check 3 rows shown, all ticked, quick-add missing.
  3. Untick one, type a name, Save. Go to Saved meals: meal has 2 foods.
  4. Reopen popup: all ticked again. Untick all: Save greyed.
  5. Check the console for errors.

## Needs from the user

None.

## Open questions

None.

## Decisions (user, 2026-10-18)

- Approved the clickable draft: tick box (green filled when ticked, empty when not) + food name + kcal per row; unticked rows greyed; Save label stays "Save".
- Quick-add rows hidden; tick boxes only (no amounts, no select all).

## Out of scope

- Changing amounts per item in the popup.
- Showing quick-add entries (disabled) in the list.
- Grouped/nested display of saved-meal groups inside the popup.
- "Select all / none" button.
- Batch-cooking recipes (separate feedback item).
