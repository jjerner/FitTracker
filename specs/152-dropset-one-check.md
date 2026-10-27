# 152: A drop set has one ✓ (issue #152)

Built on top of #153 (PR #154, `addedSets` / `hiddenIds` / `shownSets`, see `specs/153-set-flicker.md`). Its no-flicker rule still holds: drafts leaving and done rows appearing (or the other way round) happen in one synchronous block, with no `await` between them.

## Goal

A drop set (a working set plus its ↓ rows) is ticked and un-ticked as one unit, with a single ✓ on its top row. Rows can no longer be saved out of order and get mixed up.

## Rules (from the approved decisions)

- A row shows a ✓ unless it is a ↓ row. Exception: a ↓ **draft** row shows a ✓ when the row above it is done. That only happens to the first draft row when there are done sets (`i === 0 && doneSets.length > 0`).
- Done ↓ rows never show a ✓.
- A ✓ saves its own row and then the ↓ draft rows directly below it, top to bottom. Those rows have no ✓ of their own, so this is the only way they get saved.
- Un-ticking a done row's ✓ un-ticks that row and the done ↓ rows directly below it.
- ✕ still deletes one row, as now.

## Files to touch

- `src/lib/records.ts`: add one pure helper next to `dropGroups`:
  ```ts
  // Row `index` plus the ↓ rows directly below it.
  export function withDrops(types: SetType[], index: number): number[]
  ```
  It walks forward from `index + 1` while `types[j] === 'drop'`.
- `src/lib/__tests__/records.test.ts`: tests for `withDrops` (see Test plan).
- `src/app/(tabs)/workouts/active.tsx`, `ExerciseCard` only:
  - **`handleDone(draft, index)` → saves the group.**
    - `const rows = withDrops(types, index).map((j) => drafts[j - doneSets.length])`. Every index after `index` is a draft, because `index` is a draft.
    - Work out each row's values first, from its own `suggestion(j)`, the same way as now. If the top row has no values, `return` as now and save nothing. If a ↓ row has no typed value and no suggestion, skip it: it is not saved, and it is removed with the rest of the group (decided).
    - Set numbers: the n-th saved row gets `(lastDone?.setNumber ?? 0) + n` (n = 1, 2, …), so they run in a row with no gaps. A skipped row does not use up a number.
    - Save the rows one after the other, top first, using the current `addSet` + 8 s timeout → `queueSet` code. Move it into a small local `save(payload)` that returns `saved`, so the loop can reuse it. Once one row is queued, queue the rest directly without calling `addSet`. This avoids an 8 s wait per row with no signal, and nothing gets lost.
    - After the loop, in one synchronous block: `setDrafts` removes the group's draft keys, and `setAddedSets` appends every saved or queued payload. Then `await onChanged()` if any row was saved, as now.
    - Rest timer: `if (!isCardio && !pairedWithNext) onSetDone()`, once. The `types[index + 1] !== 'drop'` check goes away: the group always runs up to the next row that isn't a ↓, so the check would always be true.
    - `savingKey` stays on the tapped row's key, so the spinner shows on that one ✓.
  - **`handleUndo(set)` → `handleUndo(index)` un-ticks the group.**
    - `const group = withDrops(doneSets.map((s) => s.setType), index).map((j) => doneSets[j])`. This uses done types only, so ↓ drafts below are never part of it.
    - Delete with `deleteSetEverywhere`, **from the bottom row up**. If one delete fails, stop, show the existing "Could not undo" alert, and still apply the rows that were deleted. Going bottom-up means anything left undone is the top part of the group, and the rows that were deleted come straight back below it in the same order.
    - In one synchronous block: put drafts for the deleted rows back at the top of the drafts, in top-to-bottom order, each using the current number-to-text code and `set.setType`. Add their ids to `hiddenIds`. Then `await onChanged()` if anything was deleted.
  - **Done rows render**: if `set.setType === 'drop'`, show `<View style={styles.colCheck} />` instead of the ✓ `Pressable`, so the columns stay lined up. Otherwise `onPress={() => handleUndo(index)}`.
  - **Draft rows render**: if `type === 'drop' && !(i === 0 && doneSets.length > 0)`, show `<View style={styles.colCheck} />` instead of the ✓ `Pressable`.
  - Leave the badge `hitSlop` as it is. The ✓ buttons have no `hitSlop` and are 36 tall, so stacked ✓s cannot share tap area.

## Reuse

- `deleteSetEverywhere`, `queueSet`, `addSet`, `suggestion`, `onChanged`, `onSetDone`, `savingKey` and the #153 `addedSets` / `hiddenIds` lists.
- `styles.colCheck` (an empty 36-wide cell, already used in the table header) as the stand-in where there is no ✓.
- The `records.ts` + `records.test.ts` home for pure set helpers.

## Acceptance criteria

- [ ] Draft drop set `1, ↓, ↓`: only row `1` has a ✓. Tapping it saves all three in order (set numbers in a row, values from what was typed or suggested), shows them as done in one go with no blink, and starts the rest timer once.
- [ ] Done drop set: only the top row has a green ✓, and the ↓ rows have none. Tapping it brings back all its rows as editable rows at the top of the drafts, in the same order with the same numbers, all in one go.
- [ ] Tick `1` with no ↓ rows, then add a ↓ row under it: that ↓ row has its own ✓ and saves directly under set 1. A second ↓ row added under that one has no ✓ until the one above it is done.
- [ ] A ↓ row left empty with no suggestion is not saved, and it disappears when its drop set is ticked.
- [ ] TalkBack reads the ✓ labels and hints from the UX/UI section; the empty ✓ cell on ↓ rows is not focusable.
- [ ] An empty top row with no suggestion: tapping ✓ does nothing, as now.
- [ ] Offline or no answer within 8 s while ticking a group: every row shows as done once, the "saved on your phone" count matches the number of rows, and they send later in the right order. There is one 8 s wait, not one per row.
- [ ] ✕ on a single done or draft row deletes only that row, as now.
- [ ] Normal and warm-up sets, cardio cards and supersets (no rest after the first card) behave exactly as before.
- [ ] `npx tsc --noEmit`, `npx expo lint` and the jest tests pass.

## Test plan

- Unit (`records.test.ts`), `withDrops`:
  - `['normal', 'normal']`, index 0 → `[0]`.
  - `['normal', 'drop', 'drop', 'normal']`, index 0 → `[0, 1, 2]`. Index 1 → `[1, 2]`. Index 3 → `[3]`.
  - `['warmup', 'drop']`, index 0 → `[0, 1]` (a stray ↓ goes with the row above it).
  - Last row → `[last]`.
- Web (`npx expo start --web --port 8081`, test account from `.env.test.local`, a throwaway workout):
  1. Add an exercise and make rows `1, ↓, ↓` with the badge. Check that only row 1 has a ✓. Fill the values, tick, and check that all three go done at once, with the timer starting once (add a template exercise with a rest time to see it).
  2. Un-tick the top ✓. All three come back editable, in order and with their numbers. Tick again.
  3. Tick a plain set, add a ↓ under it, check that it has a ✓, and tick it. It shows done under the set, with no ✓.
  4. Repeat step 1 with DevTools set to Offline: there is one ~8 s wait, all rows show done once, and the waiting line counts 3. Go back online and reload; the order is the same.
  5. ✕ on one done ↓ row deletes only that row.
  6. A cardio exercise still ticks as before. Check the console for errors (duplicate keys). Discard the workout.
- Phone: none needed. This is JS only and web covers it.

## Risk

🔴 changes existing: it changes how ticking and un-ticking works on the active workout screen, the core logging flow.

## Needs from the user

None. No SQL and no APK build. Ships with `eas update`.

## UX/UI

Approved mockup: ↓ rows lose their ✓; the top row's ✓ does the whole drop set. Nothing else on the card changes. Reuses `ExerciseCard` rows, `styles.check` / `checkDone` / `rowDone` / `colCheck` and the existing `ActivityIndicator`. No new components, colours or sizes.

**Flow**
- Tick: fill row 1 and its ↓ rows → tap row 1's ✓ → spinner on that ✓ → all rows turn green at once → rest timer starts once.
- Undo: tap the green ✓ on a done top row → that row and its ↓ rows come back as editable rows, same order and numbers.
- Late ↓: tick set 1, then add a ↓ under it → that one ↓ draft gets its own ✓ (it is the first row under the done rows).

**The empty ✓ cell**
- On every ↓ row without a ✓ (draft or done), the ✓ column is `<View style={styles.colCheck} />`: blank, same 36 width, no border, no grey box. Inputs and ✕ stay lined up with the rows above.
- Draft ↓ rows keep today's white background; done ↓ rows keep `rowDone` green. ✕ stays on every row.

**States**
- Idle: top ✓ looks like today (grey box, ✓).
- Saving: spinner in the top ✓ only (`savingKey` = tapped row). All other ✓s are disabled until the group is done, as today. No extra text.
- Saved: every saved row is green; the top row has the filled green ✓; ↓ rows have the blank cell.
- Offline / no answer in 8 s: rows show as done once; the existing "saved on your phone" line counts every row. No new words.
- Empty top row, no suggestion: tapping ✓ does nothing, as now.
- Empty ↓ row, no suggestion: not saved, removed with the group (decided).
- Undo fails partway: existing "Could not undo" alert; rows already undone come back as drafts.

**Words (TalkBack only, nothing new on screen)**

`N` = the row's set label (1, 2, …). "drop step" matches the existing ↓ badge label.

| Control | `accessibilityLabel` | `accessibilityHint` |
|---|---|---|
| Draft ✓, no ↓ rows below | `Mark set N done` | none |
| Draft ✓, ↓ rows below | `Mark set N done` | `Also saves its drop steps` |
| Draft ✓ on a ↓ row (late ↓) | `Mark drop step done` | none |
| Done ✓, no ↓ rows below | `Set N done` | `Tap to undo` |
| Done ✓, ↓ rows below | `Set N done` | `Tap to undo set N and its drop steps` |
| Empty ✓ cell on ↓ rows | none (plain `View`, not focusable) | |

All ✓ `Pressable`s get `accessibilityRole="button"`; while saving, the tapped one gets `accessibilityState={{ busy: true }}`, and the others `{ disabled: true }`. "↓ rows below" = `withDrops(...).length > 1` for that row.

**Wireframe** (Front Squat card; `[✓]` = grey box, `[■]` = filled green ✓, blank = empty ✓ cell)

```
Before tick                          After tick (rows green)
┌──────────────────────────────┐     ┌──────────────────────────────┐
│ Set Previous  kg   reps      │     │ Set Previous  kg   reps      │
│ [1]   —     [100] [5]  [✓] ✕ │     │  1    —      100   5   [■] ✕ │
│ [↓]   —     [ 80] [6]      ✕ │     │  ↓    —       80   6       ✕ │
│ [↓]   —     [ 60] [8]      ✕ │     │  ↓    —       60   8       ✕ │
│ [2]   —     [kg ] [reps][✓] ✕│     │ [2]   —     [kg ] [reps][✓] ✕│
│          + Add set           │     │          + Add set           │
└──────────────────────────────┘     └──────────────────────────────┘
```

## Open questions

None.

## Out of scope

- Ticking normal sets out of order, which already moves the ticked set above the earlier drafts. Only drop rows were reported.
- An orphan ↓ row with nothing above it, e.g. after its top set is deleted with ✕. As a draft it shows no ✓ until its badge is tapped back to a working set. As a done row it is left as is and can still be deleted with ✕.
- `queueSet` itself failing (the phone's storage throwing) partway through a group. Today a single set has the same gap. Rows already saved stay in the database and show after the next reload.
- Labels on the ✕ buttons (none today) and the ✓ tap size (36 tall, under 48): separate change. The ✓ labels are now in scope (see UX/UI).
- Any new visuals: no grouping lines, borders or animation.
