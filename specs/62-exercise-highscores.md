# 62 Exercise highscores

## Goal

Add a volume record and a best weight for each rep count (1–12) to the exercise detail page, and show a volume 🏆 line in the active workout. Everything is worked out from logged working sets. No SQL.

## Files to touch

- `src/lib/records.ts`
  - `setsVolume(sets: WorkoutSet[]): number`: sum of `weightKg × reps` over `workingSets(sets)`. Use `Number(... ?? 0)` like `setOneRM`.
  - `bestVolume(sessions: ExerciseSession[]): number`: highest `setsVolume(s.sets)` over sessions (0 if none).
  - `export type RepBest = { reps: number; weightKg: number; startedAt: string }`.
  - `repBests(sessions: ExerciseSession[]): RepBest[]`: for each rep count r = 1..12, the heaviest working set with `reps >= r` and `weightKg > 0`. A set with more than 12 reps counts for all 12 rows. If two sets tie on weight, the earliest workout wins (the day the record was first set). Returns only rows that have a set, in order 1, 2, 3 … (the rows are always 1..N with no gaps).
  - `NewRecords` gets `volume: boolean`. `findNewRecords` sets it to `Math.round(setsVolume(sets)) > Math.round(bestVolume(earlier))`. The "needs earlier working sets" rule stays the same: no history means all three are `false`.
- `src/app/(tabs)/workouts/exercises/[exerciseId].tsx`
  - Third tile in `recordsRow`: `🏆 {Math.round(bestVolume(history))} kg` with the caption "Best volume". Same markup as the other two tiles.
  - A new `Card` in the list header, under the chart card, titled "Best for each rep count". One row per `repBests(history)` entry: `{reps} rep(s)`, `{weightKg} kg`, `formatDate(startedAt)` (the page's existing helper). Only shown for strength exercises that have at least one entry. Plain rows, not a card per row.
- `src/app/(tabs)/workouts/active.tsx` (around line 549)
  - `recordText` gets one more branch at the end: `records?.volume ? `🏆 New volume record: ${Math.round(setsVolume(doneSets))} kg``. Weight still wins. Order: weight → est. 1RM → volume (Open question 1, resolved), so today's lines stay the same.
- `src/lib/__tests__/records.test.ts`: the two existing `findNewRecords` `toEqual` checks get `volume`. Add the new tests listed below.

## Reuse

- `workingSets` (leaves out warm-ups), `findNewRecords` (the history rule), and the `bestOf` / `bestOfSessions` pattern, all in `records.ts`.
- The detail page's `record` / `recordsRow` / `recordLabel` styles and its `formatDate`.
- `Card` and `AppText` (variants `label` and `small`). Theme tokens only, no raw sizes or colours.
- The `session()` / `warmup()` test helpers in `records.test.ts`.

## Acceptance criteria

- [ ] Exercise detail (strength, with history) shows three 🏆 tiles: Heaviest weight, Best est. 1RM, Best volume. Best volume = the most `kg × reps` in one workout, warm-ups not counted.
- [ ] Detail page shows "Best for each rep count" with one row per rep count from 1 up to the highest reps logged (max 12). Each row shows the heaviest weight and the date.
- [ ] 100 kg × 5 is also the best for 1–4 reps unless a heavier set with fewer reps exists.
- [ ] Rep counts nobody has reached are not shown. A set with 15 reps fills rows 1–12.
- [ ] Warm-up sets never count toward volume, rep bests or the new 🏆 line.
- [ ] Cardio exercises look the same as before (no tiles, no rep list).
- [ ] In an active workout, once the done working sets add up to more volume than any earlier workout of that exercise, the 🏆 line says "🏆 New volume record: X kg". It doesn't show the first time you ever do an exercise.
- [ ] If a weight record and a volume record happen together, the line shows the weight record.
- [ ] The workout summary (`log/[logId].tsx`) and the Progress tab are unchanged.
- [ ] `npx tsc --noEmit`, `npx expo lint`, `npm test` pass.

## Test plan

Unit tests in `src/lib/__tests__/records.test.ts`:
- `setsVolume`: 100×5 + 80×8 = 1140; a warm-up adds nothing.
- `bestVolume`: picks the session with the highest total, and returns 0 for `[]`.
- `repBests`:
  - one set of 100×5 gives rows 1–5, all 100 kg, and no row 6;
  - adding 110×3 changes rows 1–3 to 110 and leaves 4–5 at 100;
  - 60×15 fills rows 1–12 and there is no row 13;
  - warm-ups and 0 kg sets are ignored;
  - on a weight tie, the older session's `startedAt` wins;
  - `[]` gives `[]`.
- `findNewRecords`:
  - volume is true when today's working sets beat the best earlier session total;
  - volume is false when they only tie, or when a warm-up is what pushes the total over;
  - volume is false with no earlier working sets;
  - weight and volume can both be true at once.

Click-through on web (test account from `.env.test.local`):
1. Workouts → Exercises → a strength exercise with history. Check the three tiles, the rep list (rows, weights and dates make sense), and that cardio looks the same as before.
2. Start a workout with that exercise. Log lighter sets with many reps until the total beats the old best, and check that "🏆 New volume record: X kg" appears. Then log a set heavier than the old best weight, and check that the line switches to "New personal record". No console errors.

No phone-only behaviour.

## Risk

🔴 changes existing. It changes shared record math in `src/lib/records.ts` (`NewRecords` is also used by the workout summary), the exercise detail page and the active workout card.

## Needs from the user

None. No SQL and no new APK build (JS only, ships with `eas update`).

## UX/UI

### Flow

- Workouts → Exercises → tap a strength exercise → see 3 🏆 tiles at the top, the chart, then "Best for each rep count", then the workout history (as today).
- Active workout → log sets → when today's working sets beat the best earlier volume, the 🏆 line under the exercise title says so. Nothing to tap.

### Screens and parts

- **Exercise detail** (`[exerciseId].tsx`), changed:
  - **Tiles, 2+1 layout.** Heaviest weight and Best est. 1RM stay side by side; Best volume goes on its own full-width row under them. Same tile markup (`record`, `AppText label` + `caption`). Why: 3 tiles in a row on a 360 dp phone leave about 66 dp of text per tile, and "🏆 12450 kg" doesn't fit. Build it as `recordsRow` with `flexWrap: 'wrap'` and each tile `flexGrow: 1, flexBasis: '40%'` (instead of `flex: 1`), so the third tile stretches. Same on wide web. The number stays a plain whole number like the workout summary's "Volume (kg)" (no "k" short form, no thousands space).
  - **New `Card` "Best for each rep count"**, under the chart card, above the history. Title `AppText label` (same as the chart title). Then one plain row per rep count, with a hairline `colors.border` line between rows (no line above the first row):
    - left: `{n} rep` / `{n} reps`, `body`, takes the free width (`flex: 1`)
    - middle: `{weightKg} kg`, `label`
    - right: date with the page's `formatDate` (`small`, grey)
    - Rows can't be tapped. Vertical padding `spacing.sm`. Each row is one `accessible` group, so TalkBack reads "5 reps, 100 kg, sön 18 okt." as a single item.
  - The list header now holds two cards. Wrap them in a `View` with `gap: spacing.md` so the space matches the history cards.
- **Active workout** (`active.tsx`): same 🏆 line (`labelSmall`, `warning` colour). Only the new text below is added. Priority: weight → est. 1RM → volume.
- Nothing new in `src/components/`. No new tokens.

### States

- **Loading:** the page's existing spinner. The new card never shows on its own while loading.
- **Empty:** the new card is hidden when `repBests` is empty (no working set with weight above 0 kg, e.g. bodyweight only). The tiles keep today's rule: shown when the exercise has at least one charted workout.
- **Cardio:** no tiles and no rep card. Looks the same as today.
- **Error:** no change. The page has no error state today, and adding one is out of scope.
- **Success (active workout):** "🏆 New volume record: 1250 kg". It shows as soon as the sum of the done working sets beats the earlier best, and goes away if a set is un-ticked and the sum drops back.

### Words

- Tile captions: "Heaviest weight", "Best est. 1RM", "Best volume"
- Card title: "Best for each rep count"
- Row: "1 rep", "2 reps" … "12 reps"; "100 kg"; date as on the history cards ("sön 18 okt.")
- Active workout: "🏆 New volume record: {X} kg"

### Wireframe (exercise detail, 360 dp phone)

```
┌─────────────────────────────────┐
│ ← Bench Press                   │
├─────────────────────────────────┤
│ ┌─────────────────────────────┐ │
│ │ ┌────────────┐┌────────────┐│ │
│ │ │🏆 67.5 kg  ││🏆 86 kg    ││ │
│ │ │Heaviest    ││Best est.   ││ │
│ │ │weight      ││1RM         ││ │
│ │ └────────────┘└────────────┘│ │
│ │ ┌──────────────────────────┐│ │
│ │ │🏆 540 kg                 ││ │
│ │ │Best volume               ││ │
│ │ └──────────────────────────┘│ │
│ │ (Weight) ( Est. 1RM )       │ │
│ │ Heaviest set per workout(kg)│ │
│ │ Best: 67.5 kg · 3 workouts  │ │
│ │ [ chart ]                   │ │
│ └─────────────────────────────┘ │
│ ┌─────────────────────────────┐ │
│ │ Best for each rep count     │ │
│ │ 1 rep     67.5 kg sön 18 okt│ │
│ │ ─────────────────────────── │ │
│ │ 2 reps    67.5 kg sön 18 okt│ │
│ │ ─────────────────────────── │ │
│ │ …  (rows 3–8 the same)      │ │
│ │ ─────────────────────────── │ │
│ │ 9 reps    55 kg   mån 12 okt│ │
│ └─────────────────────────────┘ │
│ ┌─────────────────────────────┐ │
│ │ sön 18 okt.                 │ │
│ │ Warm-up: 40 kg × 10  …      │ │
│ └─────────────────────────────┘ │
└─────────────────────────────────┘
```

(Test-account data: 67.5 × 8 fills rows 1–8; 55 × 9 adds row 9. The 100 kg × 1 warm-up is not counted.)

Active workout card, after the change:

```
│ Bench Press                 ✕ │
│ 🏆 New volume record: 1250 kg │
│  Set   kg    reps        ✓    │
```

## Open questions

1. Resolved: when an est. 1RM record and a volume record happen at the same time (with no weight record), est. 1RM wins. Order: weight → est. 1RM → volume (volume shows only when it's the only new record).

## Out of scope

- Highscores on the Progress tab.
- Record history (when each record was beaten before).
- Volume records in the workout summary highlights (`log/[logId].tsx`). It keeps ignoring the new `volume` flag.
- Rep counts above 12, and a date on the Best volume tile.
- Rep-count records during the active workout.
- Changing `logVolume` in `log/[logId].tsx` to use the new `setsVolume`. It's the same math, but that's a refactor nobody asked for.
- Any SQL, new tables or caching. Everything is computed from the history already loaded.
