# FIX-2 Offline sets from another account block finishing workouts

Issue #121.

## Goal

Sets waiting on the phone that the database refuses as "not yours" (RLS error 42501) get dropped, so Finish works for whoever is logged in now.

## Files to touch

- `src/lib/pendingSets.ts`
  - `doFlush` (~line 116): drop the set (`removePending`) and `continue` on code `42501` as well as on `23…` codes.
  - Comment above `flushPendingSets`: name "not yours (another account's set)" as a reason a set can never be saved, next to "the workout was deleted".
- `src/lib/__tests__/pendingSets.test.ts`
  - Remove the `['other code', … '42501']` row from the `it.each` "keeps the set and stops on a non-23 error". The network row stays.
  - Add a test: queue `set-a`, `set-b`; first upsert returns `{ code: '42501' }`, second `{ error: null }`. Expect `{ sent: true, allSent: true }`, both ids upserted, `set-a` no longer queued (same check style as the existing 23503 test).

## Reuse

- `removePending` and the existing `23…` drop branch in `doFlush`. Extend that one condition; no new helper.
- The existing 23503 test as the template for the new 42501 test.

## Acceptance criteria

- [ ] A queued set rejected with 42501 is removed from the queue.
- [ ] Flushing goes on to the next set, which is still sent.
- [ ] `flushPendingSets` returns `allSent: true` when the only failures were 42501 / 23….
- [ ] A network error (empty code) still keeps the set and stops (`allSent: false`).
- [ ] `npx jest src/lib/__tests__/pendingSets.test.ts`, `npx tsc --noEmit`, `npx expo lint` pass.

## Test plan

- Unit: the new 42501 test above; the network case in the `it.each` still passes unchanged.
- In the app (web): nothing visible changes; a quick check that an active workout still finishes normally is enough.
- Phone test issue (`phone-test`): log a set with no signal, log out, log in as another account, start a workout, tap Finish. Finish works (no "No connection"). Same after deleting an account and signing up again.

## Risk

🔴 changes existing: changes when offline sets are thrown away in shared sync code (`pendingSets.ts`).

## Needs from the user

None. No SQL, no new APK (JS only, ships with `eas update`).

## Open questions

None.

## Out of scope

- Flush with no session: it would also get 42501 and drop the user's own sets. Not handled; today flush only runs from the workout screen, which needs a login.
- Clearing the queue on logout or tagging queued sets with a user id. Not needed for the core fix.
- Any UI or message change on Finish.
