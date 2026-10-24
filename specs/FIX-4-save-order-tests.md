# FIX-4 Test the add-then-delete order in saveRecipe and saveTemplate

Issue #123.

## Goal

Two unit tests that lock in "insert new items first, delete old ones after" when editing a recipe or a routine, so a failed save never leaves it empty.

## Files to touch

- `src/lib/__tests__/saveOrder.test.ts` (new). One file, one `jest.mock('../supabase')` for both functions:
  - The fake `supabase.from(table)` returns a chainable query that records `[table, method]` for each call (`update`, `select`, `insert`, `delete`, `eq`, `not`, `in`) and can be awaited. Awaiting a chain that has `insert` resolves `{ data: null, error: mockInsertError }`; a `select` of `workout_template_exercises` without `insert` resolves `{ data: [{ id: 'old-1' }], error: null }` (old rows must exist, or a swapped `saveTemplate` would skip its delete); anything else resolves `{ data: null, error: null }`.
  - Also mock `../reminders` and `../pendingSets` like `upsertOffFood.test.ts` (foods.ts imports them).
  - Test 1: `saveRecipe('user-1', { id: 'meal-1', name, portions: 1, items: [one item] })` with `mockInsertError = { code: 'X' }` rejects with `{ code: 'X' }`; the recorded calls contain an `insert` on `saved_meal_items` and no `delete` on any table.
  - Test 2: `saveTemplate({ id: 'tpl-1', userId: 'user-1', name, exercises: [one exercise] })` with the same insert error rejects with `{ code: 'X' }`; the recorded calls contain an `insert` on `workout_template_exercises` and no `delete` on any table.

## Reuse

- The mock style of `src/lib/__tests__/upsertOffFood.test.ts` (`mock`-prefixed module variables, `jest.mock('../supabase', ...)`).
- `SavedMealItem` / `WorkoutTemplateExercise` types from `src/types/domain` for the one fixture item each (cast with `as` where fields don't matter, as that test does with `OffFood`).

## Acceptance criteria

- [ ] Test 1 and Test 2 pass on the current code.
- [ ] Each test fails if its function's delete step is moved before its insert step (check by swapping locally, then revert).
- [ ] No change to `src/lib/foods.ts` or `src/lib/workouts.ts`.
- [ ] `npx jest src/lib/__tests__/saveOrder.test.ts`, `npx tsc --noEmit`, `npx expo lint` pass.

## Test plan

- Unit: the two tests above, plus the swap check from the acceptance criteria.
- In the app: nothing to click through; no app code changes.

## Risk

🟢 add-on: only adds a test file; no app code changes.

## Needs from the user

None. No SQL, no new APK, nothing to ship.

## Open questions

None.

## Out of scope

- Tests for creating a new recipe/routine (no `id`) and its cleanup delete.
- Tests for the delete step failing (leaves duplicates) or for the happy path.
- Any change to the save functions themselves.
