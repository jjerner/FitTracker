# FIX-3 + FIX-5: Open Food Facts foods saved as your own (issues #122, #124)

## Goal

Nobody can plant fake nutrition under a real barcode for other users: an Open Food Facts (OFF) food you scan or pick is saved as **your own** row, and scans only match your own rows. Picking a barcode-less OFF hit reuses your earlier copy instead of saving a new row every time.

## Files to touch

- `supabase/migrations/0023_foods_insert_own_only.sql` (new). Exact SQL is under "Needs from the user".
- `src/lib/foods.ts`
  - `getFoodByBarcode(userId, barcode)`: add `.eq('created_by', userId)`. Drop the `.order(...)`/`.limit(1)`, because `foods_barcode_owner_key` allows at most one own row per barcode, so `.maybeSingle()` is enough. Rewrite the comment: "Your own food with this barcode. Shared rows are never used, because anyone could have planted them (FIX-3)."
  - `upsertOffFood(userId, off)`: add `created_by: userId` to `row`.
    - Barcode branch: keep insert-and-ignore-`23505`. The read-back changes from `.is('created_by', null)` to `.eq('created_by', userId)`. Update the comment, since the reason it gives (shared rows have no owner) no longer holds.
    - No-barcode branch (FIX-5): first look for `.eq('created_by', userId).eq('source', 'off').is('barcode', null).eq('name', off.name)`, then brand `off.brand == null ? .is('brand', null) : .eq('brand', off.brand)`, then `.limit(1).maybeSingle()`. If a row comes back, return it. If not, insert as today (`row` now carries `created_by`).
- `src/app/(tabs)/food/scan.tsx`: import `useSession` from `../../../context/AuthProvider`, the same way `search.tsx` does. Pass `session?.user.id as string` to `getFoodByBarcode` and `upsertOffFood`.
- `src/app/(tabs)/food/search.tsx` `handleSelect`: pass `session?.user.id as string` to `upsertOffFood`. Change the line-139 comment from "the first save sticks for everyone" to "the first save sticks".
- `src/lib/__tests__/upsertOffFood.test.ts`: rewrite for the new behaviour (see Test plan).
- `docs/PROJECT_NOTES.md`:
  - line 50: next free number becomes `0024`.
  - line 52: replace the "anyone can insert a fake shared OFF row" accepted risk with: OFF foods are saved per user (0023). Old shared OFF rows stay readable for old diary entries, but scans never pick them.
  - line 59: delete it. It explains skipping updates of ownerless rows, which no longer applies.

## Reuse

- `mapFoodRow` and the `supabase` client in `foods.ts`.
- The existing insert-and-ignore-`23505` pattern in `upsertOffFood`.
- `useSession` the way `search.tsx` uses it. `createCustomFood` already takes `userId` and sets `created_by`, so follow that.
- RLS select policy 0014 (shared or own) stays as it is.

## Acceptance criteria

- [ ] After 0023, inserting a `foods` row with `created_by` null or another user's id is refused (RLS).
- [ ] A scanned OFF product is saved with `source = 'off'` and `created_by` = you, then opens.
- [ ] Scanning it again opens the same row with no OFF network call.
- [ ] A barcode that only has an old shared row (no own row) is fetched from OFF and saved as your own copy. The shared row is never opened by a scan.
- [ ] Picking a "Branded products" hit with a barcode saves your copy the first time and opens that same row on later picks.
- [ ] Picking a barcode-less branded hit twice gives one row, not two (FIX-5).
- [ ] If you already have a **custom** food with that barcode, picking the branded hit opens your custom food. The insert hits `23505` on `(barcode, you)` and the read-back returns your row. No error, and no second row. A scan never gets this far, because `getFoodByBarcode` finds the custom food first.
- [ ] Old diary entries, recents and favourites that point at shared OFF rows still show and open.
- [ ] Recipe (`?recipe=1`) and `meal` params behave as before in scan and search.
- [ ] `npx tsc --noEmit`, `npx expo lint`, `npx jest` pass.

## Test plan

- Unit, `src/lib/__tests__/upsertOffFood.test.ts`. Extend the mock so `select` chains `eq`/`is`/`limit`/`maybeSingle`/`single`, `insert` chains `.select().single()`, and the inserted row is recorded.
  1. Barcode, insert OK: the inserted row has `created_by: 'u1'`. The read-back filters `['eq','created_by','u1']` and never `['is','created_by',null]`.
  2. Barcode, `23505`: returns the own row read back.
  3. Barcode, other error (`42501`): throws.
  4. No barcode, an own OFF row with the same name and brand exists: returns it, and there is no insert.
  5. No barcode, no match: inserts with `created_by: 'u1'` and returns the new row.
  6. No barcode, `brand: null`: the lookup uses `is('brand', null)`.
  7. `getFoodByBarcode('u1', '123')` filters `['eq','created_by','u1']`.
- SQL check after the paste: `select policyname, with_check from pg_policies where tablename = 'foods' and cmd = 'INSERT';` should return exactly one row, `created_by = auth.uid()`.
- Web (test account): the camera and branded OFF search can't run on web (CORS). Only check that Food search, "My foods" and opening an old diary entry still work with no console errors.
- Phone test issue (`phone-test` label):
  1. Scan a product you've logged before. It opens and logs fine. Scan it again: it opens fast.
  2. Search for a branded product and pick it twice. The second time opens the same food, and it shows under "My foods".
  3. Find a branded hit without a barcode, pick it twice, then check "My foods". It is listed once.
  4. From a recipe's "Add ingredient": scan and pick a branded hit. Both open in recipe mode.
  5. Open a diary entry from before the update. It still opens.

## Risk

🔴 changes existing. It changes the shared `foods` insert policy and how scan and search save and find OFF foods.

## Needs from the user

1. ~~Confirm 0022 is pasted.~~ Confirmed applied (2026-10-24). Without 0022, the old table-wide `foods_barcode_key` would refuse your own copy of any barcode that already has a shared row.
2. Paste `supabase/migrations/0023_foods_insert_own_only.sql` into the Supabase SQL editor **after** the `eas update`. Ship order: merge → `eas update` → paste 0023.

```sql
-- OFF foods are saved per user now (FIX-3). A shared row could be planted by anyone with fake
-- nutrition under a real barcode. Existing shared rows stay readable (0014) for old entries.
drop policy "Users can insert shared OFF foods or their own" on public.foods;
create policy "Users can insert their own foods"
  on public.foods for insert
  to authenticated
  with check (created_by = auth.uid());
```

The new JS works with the 0022 policy and with 0023, because both allow own inserts. Pasting 0023 last gives phones time to pick up the update: phones still on the old JS can't save *new* OFF foods after the paste (their shared insert is refused) until they pick up the update. Old JS can still open barcodes that already have a shared row.

No app build needed.

## Decisions

- Products you logged **before** this change: your first scan or pick after it makes a new own copy. Search can then show the item twice under "My foods" (the old shared row through your log history, plus the new copy). Custom servings and the favourite star on the old shared row don't carry over to the copy. **Accepted by the user** (2026-10-24): no carry-over code.

## Out of scope

- Deleting or cleaning up existing (maybe fake) shared OFF rows.
- Moving old diary entries, favourites or servings from shared rows to own copies.
- Any UI change (no "from Open Food Facts" label, no chooser between your custom food and the OFF version).
- An offline fallback to shared rows on first scan (accepted: the first scan needs internet).
- Matching barcode-less foods case-insensitively or by nutrition. An exact name + brand match is enough.
- Locking default-serving editing on own OFF copies (accepted side effect).
