# AU-1: Scanning a barcode you already saved (issue #86)

## Goal

Scanning a barcode that is already in `foods` (your own custom food or the shared OFF copy) opens that food. A custom food one user saved with a barcode no longer blocks other users or the OFF copy of that barcode.

## Files to touch

- `supabase/migrations/0022_foods_barcode_per_owner.sql` (new): swap the table-wide `foods_barcode_key` for "one barcode per owner". The exact SQL is under "Needs from the user".
- `src/lib/foods.ts`
  - New `getFoodByBarcode(barcode): Promise<Food | null>`: `.from('foods').select('*').eq('barcode', barcode).order('created_by', { nullsFirst: false }).limit(1).maybeSingle()`. RLS only shows shared rows and your own, so at most 2 rows match. Your own row sorts first.
  - `upsertOffFood` (barcode branch): replace `.upsert(row, { onConflict: 'barcode', ignoreDuplicates: true })` with `.insert(row)`, and ignore an error whose `code === '23505'` (the barcode is already saved). Add `.is('created_by', null)` to the read-back so it returns the shared row and not your own custom row with the same barcode. Keep the name and signature, so callers do not change.
- `src/app/(tabs)/food/scan.tsx` `handleScanned`: call `getFoodByBarcode` first. If it finds a row, use its id. If not, do what the code does today (OFF lookup, then custom-food/new or `upsertOffFood`). Both cases end in the existing `router.replace` to the food screen, with the `recipe`/`meal` params unchanged.
- `docs/PROJECT_NOTES.md`: set the next free migration number to `0023`. Rewrite the gotchas on lines 58–59: barcode uniqueness is now a partial index per owner, so `upsertOffFood` inserts and ignores `23505` instead of using an upsert.

## Reuse

- `mapFoodRow`, plus the existing `supabase` client in `foods.ts`.
- The existing `router.replace` food-screen URL and the custom-food URL in `scan.tsx`. Do not add a new navigation helper.
- RLS policy from 0014 (`created_by is null or created_by = auth.uid()`) does the "shared + own" filtering. No extra filter needed in the lookup.

## Acceptance criteria

- [ ] Migration 0022 runs cleanly on the live data. Afterwards `foods_barcode_key` is gone and `foods_barcode_owner_key` exists.
- [ ] User A scans a barcode that is not in OFF, creates a custom food, then scans the same barcode again. The saved custom food opens, not "create custom food".
- [ ] User B then scans the same barcode, gets "create custom food", and saving works. B can log it.
- [ ] Scanning a barcode whose shared OFF row already exists opens that row without calling OFF.
- [ ] Scanning a new OFF barcode still saves the shared row and opens it. This also works when the scanning user (or another user) already has a custom food with that barcode, with no "Lookup failed".
- [ ] Tapping a "Branded products" search result still opens the food, both the first time and when the row already exists.
- [ ] Recipe mode (`?recipe=1`) and `meal` params behave as before in every scan branch.
- [ ] `npx tsc --noEmit`, `npx expo lint` and `npx jest` pass.

## Test plan

- Unit: add `src/lib/__tests__/upsertOffFood.test.ts`, mocking `../supabase` the way `reminders.test.ts` does.
  - (a) The insert returns `{ error: { code: '23505' } }`: the function still returns the row read back, and that read filters `created_by is null`.
  - (b) The insert returns any other error: the function throws.
- After pasting the SQL, run this check in the Supabase SQL editor: `select indexname from pg_indexes where tablename = 'foods';` It should list `foods_barcode_owner_key` and no `foods_barcode_key`.
- Web (`npx expo start --web`, test account): the camera and branded search can't run on web, so only check that the Food tab, search and custom-food/new still load with no console errors.
- Phone test issue (`phone-test` label), steps:
  1. Account A: scan a product that isn't in OFF (or any barcode OFF lacks), create a custom food, then scan it again. It should open the saved food.
  2. Account B (test account): scan the same barcode, create and log it. Saving should work.
  3. Scan a normal OFF product twice. It should open both times, and the second scan should be fast.
  4. Repeat step 1 from a recipe's "Add ingredient" scan. The food should open in recipe mode.

## Risk

🔴 changes existing. It changes a shared `foods` constraint and `upsertOffFood`, which both scan and search use.

## Needs from the user

Ship order: run `eas update` **first**, then paste the SQL. The new JS works with the old and the new schema. The old JS's `onConflict: 'barcode'` stops working once the old constraint is gone, so phones that haven't restarted onto the update can't add OFF foods until they do.

Paste `supabase/migrations/0022_foods_barcode_per_owner.sql` into the Supabase SQL editor:

```sql
-- One barcode per owner (AU-1). The old foods_barcode_key allowed each barcode once in the whole
-- table, so one user's private custom food blocked every other user and the shared OFF copy.
-- Partial (barcode is not null): Livsmedelsverket rows and many custom foods have no barcode, and
-- NULLS NOT DISTINCT would make all of those clash. Can't fail on existing data: the old
-- constraint was stricter (each barcode at most once).
create unique index foods_barcode_owner_key
  on public.foods (barcode, created_by) nulls not distinct
  where barcode is not null;

alter table public.foods drop constraint foods_barcode_key;
```

## Decisions

- **Partial index, not the issue's table constraint.** `unique (barcode, created_by) nulls not distinct` without a `where` treats every SLV row (barcode NULL, created_by NULL) as a duplicate of every other, so the migration would fail.
- **One index with `NULLS NOT DISTINCT`** keeps the shared OFF row unique per barcode (its `created_by` is NULL). It needs Postgres 15+, which Supabase has used since 2023. On an older version the paste fails with an error and changes nothing, because the index is created before the drop.
- **`upsertOffFood` inserts and ignores `23505` instead of upserting.** A partial index can't be a PostgREST `onConflict` target (see the PROJECT_NOTES gotcha). Ignoring the duplicate does the same job as `ignoreDuplicates`. `23505` can only come from this index, because `id` is random and `slv_number` is NULL for OFF rows.
- **`upsertOffFood` leaves `created_by` NULL, as it does today.** RLS insert allows `source = 'off'`, and the shared row stays shared.
- **The read-back adds `.is('created_by', null)`.** One user can now see their own row and the shared row for the same barcode, and `.single()` would fail on two rows.
- **The scan lookup prefers your own row** (`order created_by nulls last, limit 1`), because what you made yourself is what you expect to see. At most 2 rows are visible, so this is cheaper than handling `maybeSingle` with several rows.
- **A shared OFF row found by the lookup skips the OFF network call.** Today the flow ends on that same row anyway (the upsert ignores duplicates), so this is only faster.
- **No lookup added to search.** Search already hides OFF hits whose barcode you own (`search.tsx:112`), and the `upsertOffFood` fix covers the rest.
- **Keep the name `upsertOffFood`.** Renaming it would touch callers for no user gain.
- **Migration 0022.** `specs/3.4b-drop-sets.md` keeps 0021, which doesn't conflict, so that spec is not edited.

## Open questions

None.

## Out of scope

- Merging or cleaning up existing hidden custom foods that hold a barcode. They stay as they are and simply stop blocking others.
- Choosing between your custom food and the OFF version when both exist. The lookup picks yours, and there is no chooser UI.
- The "anyone can insert a fake shared OFF row" risk (#35).
- Changing the custom-food form text ("Barcode X wasn't found").
- Editing or "claiming" shared rows.
