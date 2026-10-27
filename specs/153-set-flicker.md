# 153: Set row flickers when ticked (issue #153)

## Goal

Ticking ✓ on a set turns that row into a done row right away, with no gap. Un-ticking turns it back into an editable row right away, with no moment where it shows twice.

## Why it happens

`ExerciseCard` (`src/app/(tabs)/workouts/active.tsx`) only shows done sets that come from the `['workoutLog', logId]` query (plus the offline queue).
- Tick (`handleDone`, ~line 518): the draft row is removed, then the log is refetched. Until the new log arrives, the set is in neither list, so the row is gone.
- Un-tick (`handleUndo`, ~line 553): a draft row is added, then the log is refetched. Until the new log arrives, the set is in both lists, so it shows twice.

Moving `setDrafts` to after `await onChanged()` does not fix this. React Query tells the screen about new data in a later tick, so there would still be one frame where the row is wrong.

## Fix (chosen approach)

Keep two small lists inside `ExerciseCard` and update them **in the same synchronous block** as `setDrafts`. React then draws both changes in one render.
- `addedSets: WorkoutSet[]` holds sets ticked on this card that the log may not have yet.
- `hiddenIds: Set<string>` holds ids of sets deleted on this card that the log may still have.

The card shows `logExercise.sets` without hidden ids, plus added sets whose id is not already in the log and not hidden. When the refetched log arrives with the same id, the row keeps its `key={set.id}`, so React keeps the same row instead of swapping it.

**Why not write the set into the query cache?** `setQueryData` reaches the screen through React Query's notify step, which runs a tick later. That is the same timing problem as now. It would also have to reach into the parent's log shape and undo itself on delete. Local state in the card is smaller and updates in the same render. Neither list ever needs clearing: set ids are new UUIDs and are never reused, and a swap remounts the card anyway (its `key` includes the exercise id).

## Files to touch

- `src/lib/records.ts`: add a pure helper next to `setLabels` / `matchingSet`:
  ```ts
  // Sets to show: the log's sets, minus ones deleted here, plus ones ticked here that the log doesn't have yet.
  export function shownSets(logSets: WorkoutSet[], added: WorkoutSet[], hidden: Set<string>): WorkoutSet[]
  ```
  Return `[...logSets.filter(s => !hidden.has(s.id)), ...added.filter(s => !hidden.has(s.id) && !logSets.some(l => l.id === s.id))]`.
- `src/lib/__tests__/records.test.ts`: tests for `shownSets` (see Test plan).
- `src/app/(tabs)/workouts/active.tsx`, `ExerciseCard` only:
  - Add `const [addedSets, setAddedSets] = useState<WorkoutSet[]>([]);` and `const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());`.
  - Replace `const doneSets = logExercise.sets;` with `const doneSets = shownSets(logExercise.sets, addedSets, hiddenIds);`. Everything below it (`lastDone`, `types`, labels, records, `waitingCount`, the Remove button, `handleSwap`, rendering) then uses the merged list without further edits.
  - `handleDone`: put `setAddedSets((prev) => [...prev, { id, setNumber, weightKg, reps, durationS, distanceM, setType }])` (taken from `payload`, the same shape the parent builds for pending sets) directly next to the existing `setDrafts(filter)` line, with no `await` between the two. Do this for both the saved and the queued path; the id check removes the duplicate with the pending copy. Leave `await onChanged()`, `onSetDone()` and `savingKey` exactly as they are.
  - `handleUndo`: after `deleteSetEverywhere` succeeds, call `setHiddenIds((prev) => new Set(prev).add(set.id))` directly next to the existing `setDrafts(prepend)`, with no `await` between them. Then `await onChanged()` as now.
  - `handleDeleteSet`: after `deleteSetEverywhere` succeeds, call the same `setHiddenIds(...)` before `await onChanged()`. This is needed, not polish: without it, a set still in `addedSets` would come back after its delete.

## Reuse

- The parent's pending-set merge (~line 182, dedupe by id against the log) is the same pattern.
- `deleteSetEverywhere`, `onChanged`, `queueSet` and `onSetDone` stay as they are.
- The `src/lib/records.ts` + `records.test.ts` home for pure set helpers.

## Acceptance criteria

- [ ] Ticking ✓ on a draft row: in the same frame, the row shows as a done row (green ✓, values, label) where the draft was. It never disappears, even on a slow connection.
- [ ] Un-ticking a done row: in the same frame, the done row is gone and an editable row with its numbers appears at the top of the drafts. The set is never shown twice.
- [ ] Deleting a done set with ✕ → Delete removes the row and it does not come back.
- [ ] Ticking a set and then un-ticking or deleting it before the reload finishes leaves no ghost row.
- [ ] Offline (or no answer within 8 s): the set shows as done and the "saved on your phone" line appears, as before. It is shown once, not twice. It sends later as before.
- [ ] The rest timer starts, or doesn't start (drop steps, first card of a superset, cardio), exactly as before.
- [ ] Set labels (W / 1 / 2 / ↓), "Previous", suggestions, the 🏆 line and the next set's number are right immediately after a tick.
- [ ] No visual change anywhere.
- [ ] `npx tsc --noEmit`, `npx expo lint` and the jest tests pass.

## Test plan

- Unit (`records.test.ts`), `shownSets`:
  - Added set not in the log → appended after the log's sets.
  - Added set already in the log → shown once.
  - Hidden id → left out whether it is in the log, in added, or both.
  - Empty added and hidden → returns the log's sets unchanged.
- Web (`npx expo start --web --port 8081`, test account from `.env.test.local`). Turn on Chrome DevTools network throttling ("Slow 4G" or slower) so the gap shows today:
  1. Start an empty workout and add an exercise. Tick set 1. The row turns done in place with no blink. Tick set 2 and check its label and number.
  2. Un-tick set 2. It becomes an editable row at once and is never shown twice. Tick it again.
  3. Tick a set and un-tick it straight away, before the reload finishes. Exactly one editable row is left.
  4. Delete a done set with ✕. It goes and stays gone.
  5. Set DevTools to Offline and tick a set. After about 8 s it shows done once with the "saved on your phone" line. Go back online; the line goes away and the set is still shown once.
  6. Add a template exercise with a rest time. Tick a set and check that the rest timer starts as before.
  7. Check the console for errors (duplicate key warnings in particular). Discard the test workout.
- Phone: no phone-test issue needed. This is JS timing only, and web with throttling shows it. If the user does a phone check anyway: tick and un-tick quickly on mobile data.

## Risk

🔴 changes existing: it changes how the active workout screen builds its done-set list, which feeds labels, records, suggestions and set numbers.

## Needs from the user

None. No SQL and no APK build. Ships with `eas update`.

## Open questions

None.

## Out of scope

- Optimistic writes into the React Query cache (see "Why not" above).
- Letting the next ✓ be tapped before the reload finishes (`savingKey` stays as is).
- Faster or fewer refetches, and any change to other places that refetch (swap, remove, link, notes).
- Any visual change: animations, spinners, row styling.
- The parent's offline/pending merge and `usePendingSync`.
