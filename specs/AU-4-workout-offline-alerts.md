# AU-4 – Alerts when workout actions fail offline

Issue: jjerner/FitTracker#89 (related: #70, not read: `gh` was not available to the spec writer)

## Goal

On the active workout screen, Finish, un-tick ✓, Swap, Remove and Add Exercise show "Check your connection and try again." when the network call fails, instead of failing silently with an unhandled promise rejection.

## Current state (checked per handler)

All five call `src/lib/workouts.ts` functions that `throw` the Supabase error. None change local state before the call, so no rollback is needed anywhere.

| Handler | Local state before the call? | Busy flag? |
|---|---|---|
| `handleFinish` | No | `isFinishing`, already reset in the existing `finally` |
| `handleUndo` | No. `setDrafts` runs after `deleteSetEverywhere` (it only runs if the delete succeeds). A set still waiting on the phone counts as success offline, which is correct | None |
| `handleSwap` | No. The picker closes itself (`SwapExercisePicker.select` calls `onSelect` then `close`, no await) | None |
| `handleRemoveExercise` | No | None |
| Add Exercise `onSelect` | No. `ExercisePicker` closes itself the same way | None |

## Files to touch

- `src/app/(tabs)/workouts/active.tsx` only:
  - `handleFinish`: add `catch { Alert.alert('Could not finish', 'Check your connection and try again.'); }` between the existing `try` and `finally`. Keep the `finally`.
  - `handleUndo`: wrap `await deleteSetEverywhere(set)` in `try/catch`; in catch show `'Could not undo'` + the same body and `return`. `setDrafts` and `onChanged` stay after it, like `handleDeleteSet` does today.
  - `handleSwap`: wrap the `if/else` (swap or insert) in `try/catch`; catch shows `'Could not swap'` and `return`.
  - `handleRemoveExercise`: wrap `removeExerciseFromLog`; catch shows `'Could not remove'` and `return`.
  - `ExercisePicker` `onSelect`: wrap `addExerciseToLog`; catch shows `'Could not add exercise'` and `return`.
  - In each, `refresh()` / `onChanged()` stays outside the `try`, after it (same shape as `handleDiscard`).

## Reuse

- The existing pattern and body text in `handleDiscard` and `handleDeleteSet`: `Alert.alert('Could not …', 'Check your connection and try again.')` then `return`.

## Acceptance criteria

- [ ] With the network off, each of the five actions shows an alert with body "Check your connection and try again." (phone, see Test plan).
- [ ] With the network off, none of the five leaves an "Uncaught (in promise)" error in the console (web).
- [ ] Finish offline: button returns from spinner to "Finish Workout"; screen stays on the active workout.
- [ ] Un-tick offline (a set that is already in the database): the set stays ticked; no new draft row appears.
- [ ] Un-tick of a set still waiting on the phone works offline as before (no alert, row goes back to a draft).
- [ ] Swap / Remove / Add offline: exercise list is unchanged.
- [ ] Online, all five behave exactly as before.
- [ ] Existing "No connection" alert when sets are still waiting at Finish is unchanged.
- [ ] `npx tsc --noEmit` and `npx expo lint` pass.

## Test plan

- Unit tests: none. The change is five `catch` blocks in a screen with no tests; no new logic.
- Web (`npx expo start --web --port 8081`, test account from `.env.test.local`): `Alert.alert` is a no-op in react-native-web (`static alert() {}`), so the alert itself cannot be seen on web. On web check, with DevTools Network set to Offline after the workout has loaded:
  - Finish: spinner stops, still on the active screen, no uncaught error in console.
  - Un-tick a saved set: stays ticked, no uncaught error.
  - Swap, Remove, Add Exercise: list unchanged, no uncaught error.
  - Back online: all five work.
- Phone (`phone-test` issue): airplane mode during a workout, tap each of the five, and check that each shows its "Could not …" alert with "Check your connection and try again."

## Risk

🟢 add-on: adds `catch` blocks only; success paths and state order are unchanged.

## Needs from the user

None. JS only, ships with `eas update`. No SQL, no new APK.

## Decisions

- No shared helper: each catch is one `Alert.alert` line plus `return`, matching the two existing copies in this file. A wrapper like `withAlert(fn)` would hide control flow (Finish needs its `finally`, the others need `return` before `onChanged`) and would save almost no lines.
- Different title per action ("Could not finish/undo/swap/remove/add exercise") with the same body: this follows the existing "Could not delete" style and tells the user which action failed.
- No rollback logic: no handler changes local state before its network call (table above).
- No new busy flags on Undo/Swap/Remove/Add: the issue is about silent failures, not double taps.
- `refresh()` / `onChanged()` stay outside the `try`: `invalidateQueries` does not throw by default, and this matches `handleDiscard`.
- The alert is checked on the phone, not on web: react-native-web's `Alert.alert` does nothing, and adding a web alert shim would change every alert in the app.

## Open questions

None.

## Out of scope

- A web fallback for `Alert.alert` (that is also why Discard and delete-set confirms do nothing on web today; that should be a separate item if wanted).
- Queuing Finish/Swap/Remove/Add offline the way ticked sets are queued.
- Partial failure in `insertExerciseAfter` (positions shifted but insert failed) leaves a gap in `position`. Order stays correct, so this is not fixed here.
- Double-tap guards on Undo/Swap/Remove/Add.
- Timeouts (an 8 s race like `handleDone`) for these calls. A slow network that never errors still just waits.
