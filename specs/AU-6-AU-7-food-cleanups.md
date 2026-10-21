# AU-6 + AU-7 – Food cleanups: shared `addDays`, shared `sumEntries`

Issues: jjerner/FitTracker #91 (AU-6), #92 (AU-7). One PR.

## Goal

Remove duplicated helper code in the Food diary and Home. No behaviour change.

## Files to touch

- `src/app/(tabs)/food/index.tsx`
  - AU-6: delete the local `addDays` (lines 45-49, comment included). Change the import on line 22 to `import { addDays, todayLocalDate } from '../../../lib/dateUtils';` (`localDateOf` is no longer used here).
  - AU-7: line 23 import adds `sumEntries`. Day totals (lines 122-132) become `const totals = useMemo(() => sumEntries(entries ?? []), [entries]);`. Per-meal sums (lines 298-306) become `const sums = sumEntries(mealEntries);`.
- `src/app/(tabs)/home.tsx` (AU-7): totals (lines 59-67) become `const totals = sumEntries(entries ?? []);`; add `import { sumEntries } from '../../lib/foods';`.
- `src/lib/foods.ts` (AU-7): add `sumEntries` right after `entryNutrition`:
  ```ts
  // Adds up kcal and macros of diary entries (fibre is not summed).
  export function sumEntries(entries: FoodLogEntry[]) {
    return entries.reduce(
      (acc, e) => ({
        calories: acc.calories + e.caloriesKcal,
        protein: acc.protein + e.proteinG,
        carbs: acc.carbs + e.carbsG,
        fat: acc.fat + e.fatG,
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );
  }
  ```
  `FoodLogEntry` is already imported there.
- `src/lib/__tests__/entryNutrition.test.ts` (AU-7): add a `describe('sumEntries')` block (the file already mocks Supabase/reminders/pendingSets).

## Reuse

- `addDays` in `src/lib/dateUtils.ts` (already used by Home, Progress, `progress.ts`, `useProgress`).
- The existing reduce body, moved as-is into `sumEntries`.
- Existing jest mocks in `entryNutrition.test.ts`.

## Verified

- `addDays`: the local copy and `dateUtils.addDays` have the same body (split date, `new Date(y, m-1, d+days)`, `localDateOf`). Only the variable names differ. Identical.
- Totals: Home, Food day totals and Food per-meal sums all add exactly `caloriesKcal`, `proteinG`, `carbsG`, `fatG` from a zero start. None round (rounding is done at display time and stays there), none sum fibre, and none null-check, because the four fields are typed `number` (non-null) on `FoodLogEntry`. Identical.

## Decisions

- Include the third copy (Food per-meal `sums`, `food/index.tsx:298`): it is an exact match in a file this PR already touches.
- Keep `useMemo` around the Food day totals: it is already there, and removing it would be an unrelated change.
- `sumEntries` takes a plain array and callers pass `entries ?? []`: this keeps the `?? []` where it already is, so the helper has no null handling.
- Return field names stay `calories/protein/carbs/fat`: the callers (`CalorieRing`, `MacroBar` props) read those names, so nothing else changes.
- Put `sumEntries` in `foods.ts` next to `entryNutrition`, as the roadmap asks. It is the home of the food maths.
- Add a small unit test (empty list gives zeros; two entries add up, fibre ignored): it is shared code that now feeds three totals. It costs two cases in a file that already has the mocks.
- No test for `addDays`: it is a pure delete-and-import, and `dateUtils.addDays` is already used in `progress.test.ts`.

## Acceptance criteria

- [ ] `food/index.tsx` has no local `addDays` and imports it from `lib/dateUtils`. `localDateOf` is no longer imported there.
- [ ] `sumEntries` is exported from `src/lib/foods.ts`, and these three places use it: Home totals, Food day totals and Food per-meal sums.
- [ ] No other `reduce` adding `caloriesKcal/proteinG/carbsG/fatG` remains in `src/app`.
- [ ] `npx tsc --noEmit`, `npx expo lint` and `npx jest` pass.
- [ ] Home ring and macros, Food day ring and macros, and meal kcal show the same numbers as before for the same day.

## Test plan

- Unit: `sumEntries([])` gives all zeros. Two entries (one with `fiberG` set) give the summed kcal/protein/carbs/fat and no fibre key.
- Web click-through (test account): Home shows today's ring and macros. On Food, check the day ring and macros and each meal's kcal for today. Press ‹ to go to yesterday: the label reads "Yesterday". Go back with › (disabled on today). Open the calendar and pick a date. The "Copy from yesterday" button still shows on an empty meal when yesterday had entries. Check the console for errors.
- No phone test needed.

## Risk

- AU-6: 🟢 add-on. It deletes a private copy and imports an identical shared function, so behaviour is unchanged.
- AU-7: 🔴 changes existing. It adds a shared helper that the Home and Food diary totals (core calorie numbers) now depend on, but the body is moved unchanged.

## Needs from the user

None.

## Open questions

None.

## Out of scope

- `food/index.tsx:427` group row (`entries.reduce(sum + caloriesKcal)`): it sums kcal only, so it is a different shape.
- `saved-meals.tsx:39` and `scaleSavedMealItems.test.ts:37`: they sum `entryNutrition(...).calories_kcal` over saved-meal items, which is a different input type and kcal only.
- `recipe.tsx:133` (sums a kcal array) and `progress.ts` / `progress.tsx` (averages): different shapes.
- The local `formatDay` in `food/index.tsx` is not duplicated elsewhere, so it stays.
- Any design-system restyling of Food screens (DS-3). This diff touches only the lines above, so the two should not conflict.
