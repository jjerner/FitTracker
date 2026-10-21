# AU-5 – Test for the offline set queue (`pendingSets`)

Issue: jjerner/FitTracker #90.

## Goal

Add one unit test file that locks in the two rules of `doFlush` in `src/lib/pendingSets.ts`: a set is dropped only on a `23…` database error, and any other error stops the flush and keeps the set. No production code changes.

## Files to touch

- `src/lib/__tests__/pendingSets.test.ts` (new). This is the only file.

## Reuse

- AsyncStorage: the library's own jest mock, the way its docs describe:
  ```ts
  jest.mock('@react-native-async-storage/async-storage', () =>
    require('@react-native-async-storage/async-storage/jest/async-storage-mock')
  );
  ```
  It ships with `@react-native-async-storage/async-storage` 2.2.0 (`jest/async-storage-mock.js`, needs `merge-options`, already installed). Nothing in the repo mocks it yet, and there is no jest setup file. Keep the mock in this test file only.
- Supabase: the same `jest.mock('../supabase', ...)` pattern as `reminders.test.ts`, with a `mock`-prefixed variable so jest's hoisting allows it:
  ```ts
  const mockUpsert = jest.fn();
  const mockFrom = jest.fn(() => ({ upsert: mockUpsert }));
  jest.mock('../supabase', () => ({ supabase: { from: mockFrom } }));
  ```
  Each upsert answer is set per test with `mockUpsert.mockResolvedValueOnce({ error: ... })`. An extra call that was not planned gets `undefined` and throws, so the test catches extra calls.
- Public API only: `queueSet`, `flushPendingSets`, `removePending`. No access to the private `doFlush`, `pending` or `STORAGE_KEY`.
- A small `set(id)` helper in the test file that builds a `PendingSet` (`logId: 'log-1'`, `logExerciseId: 'ex-1'`, `setNumber: 1`, `weightKg: 50`, `reps: 8`, `durationS: null`, `distanceM: null`).

## Test cases

Ids `set-a` and `set-b`. "Upsert ids" means `mockUpsert.mock.calls.map(([row]) => row.id)`.

1. **Sends a waiting set.** Queue A. Upsert answers `{ error: null }`.
   - Result is `{ sent: true, allSent: true }`.
   - `mockFrom` was called with `'workout_log_sets'`. `mockUpsert` was called once with a row that includes `{ id: 'set-a', log_exercise_id: 'ex-1', set_number: 1, weight_kg: 50, reps: 8, set_type: 'normal' }`, and options `{ onConflict: 'id', ignoreDuplicates: true }`.
2. **Not a `23…` error: keeps the set and stops** (`it.each` over two errors):
   - network: `{ message: 'TypeError: Network request failed', code: '' }` (what supabase-js returns when fetch fails),
   - server error with another code: `{ message: 'permission denied', code: '42501' }`.

   Queue A, then B. The first upsert answers with the error.
   - Result is `{ sent: false, allSent: false }`.
   - Upsert ids are `['set-a']` (B was not tried).
   - Then clear the mock, let the next two upserts answer `{ error: null }`, flush again: result `{ sent: true, allSent: true }`, upsert ids `['set-a', 'set-b']`. This proves A was kept.
3. **FK error `23503`: drops only that set and goes on.** Queue A, then B. A answers `{ error: { message: 'violates foreign key constraint', code: '23503' } }`, B answers `{ error: null }`.
   - Result is `{ sent: true, allSent: true }`.
   - Upsert ids are `['set-a', 'set-b']`.
   - Then clear the mock, let the next upsert answer `{ error: null }`, flush again: upsert ids are `['set-b']`. This proves A was dropped and B was kept. (Sent sets stay queued until `pruneSaved` sees them saved, so B coming back is expected.)

Setup:
- `beforeEach`: `mockUpsert.mockReset()` and `mockFrom.mockClear()`.
- `afterEach`: `await removePending('set-a')` and `await removePending('set-b')`. The queue lives in module memory across tests, and sent sets stay in it, so this keeps tests independent.

What each case guards:
- Drop on every error (instead of only `23…`): case 2 fails.
- Drop on any error that has a code: case 2 (`42501`) fails.
- Keep going after a non-`23` error instead of stopping: case 2 fails (B gets tried).
- Never drop, or stop on a `23…` error: case 3 fails.

## Acceptance criteria

- [ ] `src/lib/__tests__/pendingSets.test.ts` exists with the cases above and passes with `npm test`.
- [ ] It runs in CI (the existing `npm test` step in `.github/workflows/ci.yml`, no CI change needed).
- [ ] Changing `error.code?.startsWith('23')` to `true`, to `!!error.code`, or to `false`, or removing the `return { sent, allSent: false }`, makes at least one case fail. Check this by hand once, then revert.
- [ ] No change to `src/lib/pendingSets.ts` or any other production file.
- [ ] `npx tsc --noEmit` and `npx expo lint` pass.

## Test plan

- Unit: the cases above. Run `npm test`. Try the four mutations in the acceptance criteria one at a time and confirm a red test each time.
- App: nothing to click. No user-facing change, so no web check and no phone test.

## Risk

🟢 add-on. Adds a test file only; no production code changes.

## Needs from the user

None. No SQL, no build, no `eas update` needed (tests are not shipped).

## Decisions

- Use the library's own AsyncStorage jest mock, not a hand-written one: it already exists and does the job.
- Keep the mocks in the test file, no global jest setup file: only one test needs them.
- Check "kept" and "dropped" with a second flush instead of reading AsyncStorage: tests the behaviour through the public API, without depending on the private storage key.
- Reset state with `removePending` in `afterEach` instead of `jest.resetModules()`: public API, no module reloading.
- Add the `42501` case on top of the issue's three: without it, "drop on any coded error" would pass all tests, and that would break the "drop only on 23…" rule.
- Use `code: ''` for the network error: that is what supabase-js returns when fetch fails, so the test matches real life.
- No production change was needed: everything can be reached through `queueSet` / `flushPendingSets` / `removePending`.

## Open questions

None.

## Out of scope

- Tests for `usePendingSets`, `usePendingSync`, `pruneSaved` (the hooks and timers).
- The `inFlight` "only one flush at a time" guard, and broken or unreadable storage at load.
- The `setType` mapping (`warmup` / missing → `normal`), apart from the one check in case 1.
- Any change to the queue's rules or code.
