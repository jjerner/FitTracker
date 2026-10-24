# FIX-2 Offline sets from another account block finishing workouts

Issue #121.

## Goal

Sets waiting on the phone that the database refuses as "not yours" (RLS error 42501) get dropped, so Finish works for whoever is logged in now.

## Files to touch

- `src/lib/pendingSets.ts`
  - `doFlush` (~line 116): drop the set (`removePending`) and `continue` on code `42501` as well as on `23…` codes. For `42501`, drop only if `supabase.auth.getSession()` returns a session; with no session (signed out, token refresh failed) the request went out as anon, so keep the set and stop like "no signal".
  - Comment above `flushPendingSets`: name "not yours (another account's set)", only while signed in, as a reason a set can never be saved, next to "the workout was deleted".
- `src/lib/__tests__/pendingSets.test.ts`
  - Replace the `it.each` "keeps the set and stops on a non-23 error" with a plain `it('keeps the set and stops on a network error')` (the 42501 row goes).
  - Mock `supabase.auth.getSession`, resolving a session by default.
  - Add a test: queue `set-a`, `set-b`; first upsert returns `{ code: '42501' }`, second `{ error: null }`. Expect `{ sent: true, allSent: true }`, both ids upserted, `set-a` no longer queued (same check style as the existing 23503 test).
  - Add a test: 42501 with no session keeps the set and stops (`allSent: false`); the next flush sends it again.

## Reuse

- `removePending` and the existing `23…` drop branch in `doFlush`. Extend that one condition; no new helper.
- The existing 23503 test as the template for the new 42501 test.

## Acceptance criteria

- [ ] A queued set rejected with 42501 while signed in is removed from the queue.
- [ ] 42501 with no session keeps the set and stops (`allSent: false`).
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

- Clearing the queue on logout or tagging queued sets with a user id. Not needed for the core fix.
- Any UI or message change on Finish.
