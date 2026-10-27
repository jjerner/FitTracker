# GOALS-6: Better maintenance estimate (jjerner/FitTracker#58)

## Goal

The maintenance card on Progress shows the average of the last 3 weekly estimates, so the number jumps around less from week to week. A hidden-by-default "Show history" link opens a small chart with one point per week for the last 12 weeks.

## Files to touch

- `src/lib/progress.ts`: add two pure functions below `estimateMaintenance`. Leave `estimateMaintenance` itself unchanged.
  ```ts
  export type WeeklyMaintenance = { date: string; estimate: MaintenanceEstimate };

  // One estimate per week: today's rule run with "today" set 0, 7, 14 … days back.
  // Oldest first. Weeks without enough data are left out.
  export function weeklyMaintenance(weights: BodyWeight[], days: DailyNutrition[], today: string, weeks: number): WeeklyMaintenance[]

  // Average of the weekly estimates from the last 3 weeks (date >= today − 14), rounded to 10 kcal.
  // `latest` is the newest of those weeks and feeds the detail line. Null when none of the 3 weeks has data.
  export function smoothedMaintenance(weekly: WeeklyMaintenance[], today: string): { kcal: number; latest: MaintenanceEstimate } | null

  // Chart label for a weekly point: "Now" for today, else "N weeks ago" ("1 week ago" for 1).
  export function weeksAgoLabel(date: string, today: string): string
  ```
  `date` is the "today" value used for that week (`addDays(today, -7 * i)`).
- `src/app/(tabs)/progress.tsx`, `MaintenanceCard`:
  - It takes a `chartWidth` prop, and `Progress()` passes it in the same way as for `WeightCard`.
  - `const weekly = useMemo(() => weeklyMaintenance(weights.data ?? [], days.data ?? [], todayLocalDate(), 12), [weights.data, days.data])`. This runs `estimateMaintenance` 12 times, so the memo keeps the "Show history" tap from running it all again. Then `const smoothed = smoothedMaintenance(weekly, todayLocalDate())`.
  - `!estimate` becomes `!smoothed`. The empty-state text stays the same.
  - The number and its accessibility label use `smoothed.kcal`.
  - New `small` line right under the number: "Smoothed over the last 3 weeks."
  - The "From N logged days…", trend change and skipped-days lines read from `smoothed.latest` (until now they read from `estimate`).
  - After "Your goal": a row (`flexDirection: 'row'`, `flexWrap: 'wrap'`, `justifyContent: 'center'`, `gap: spacing.xl`) holding the existing `TextLink` "Set goals ›" and a new `TextLink` "Show history" / "Hide history", toggling a `showHistory` state (default `false`). The history link shows only when `weekly.length >= 2`, because a chart with a single point is useless and the spacing math divides by `points − 1`. Without it, "Set goals ›" sits alone in the row, as today. (Order per the approved mockup, see UX/UI.)
  - When open, below the link row: a `View` with a hairline on top (`borderTopWidth: 1`, `borderTopColor: colors.surface`, `paddingTop: spacing.md`, the same line as `trackedRow`), holding a `LineChart` with one series, `weekly.map((w) => ({ value: w.estimate.kcal }))`, with no x-axis labels. Right under the chart, a small text row (`flexDirection: 'row'`, `justifyContent: 'space-between'`, `caption` text) with `weeksAgoLabel(weekly[0].date, today)` on the left and `weeksAgoLabel(weekly[last].date, today)` on the right. They sit in their own row, not on the x-axis, so they can't overlap the y-axis numbers. Use the same props as the weight chart's trend line: `color={colors.primary}`, `thickness={3}`, `height={160}`, `noOfSections={4}`, the same `spacing` formula and the same y-axis label style. The y-range is rounded out to the nearest 100 kcal, with 100 of headroom on each side, through `yAxisOffset`/`maxValue` as the weight chart does. Wrap it in a `View` with `accessible` and `accessibilityLabel={`Maintenance by week: ${kcal list} kcal`}`. Below it, a `caption`: "One point per week. Weeks without enough data are left out."
  - "Your goal" and "Set goals ›" keep their text and behaviour; only "Set goals ›" moves into the link row.
  - Add `useMemo` to the `react` import and the two new functions to the `progress` import. If `estimateMaintenance` is no longer used in this file, drop it from the import.
- `src/lib/__tests__/progress.test.ts`: new `describe` blocks (see Test plan).

## Reuse

- `estimateMaintenance` (the 28-day rule, the 14-day minimums and the half-logged skip), unchanged.
- `addDays` from `dateUtils`.
- `LineChart` from `react-native-gifted-charts`, `styles.axisLabel` and the weight chart's spacing formula, all in `progress.tsx`.
- `TextLink`, `AppText` (`small`, `caption`).
- Data: `useBodyWeights` already fetches 371 days and `useDailyNutrition` 365 days. The oldest weekly point needs 77 + 28 days, plus 6 more for its trend, so 111 days. No fetch change.

## UX/UI

Follows the mockup the user approved. Card stays slim (GOALS-7): the chart is closed by default. No new components.

**Flow:** Progress → maintenance card shows the smoothed number → tap "Show history" → chart opens under the links, link reads "Hide history" → tap it → chart closes. "Set goals ›" works as today (Goals screen, back arrow to Progress).

**Screens and parts:** only `MaintenanceCard` on Progress changes. Reused: `Card`, `AppText` (`heading`, `title`, `small`, `caption`), `TextLink` ×2, `LineChart` with the weight chart's trend-line props and `styles.axisLabel`, the `trackedRow` hairline (`colors.surface`). New: a centred row holding the two links, a text row under the chart for the week labels, and the `weeksAgoLabel` helper.

**States:**
- Loading: spinner under the title (unchanged).
- Error: "Couldn't load your data. Try again later." (unchanged).
- Empty (none of the last 3 weeks has an estimate): the same `EmptyState` text as today and no link row, so no "Show history" (today's empty state has no "Set goals ›" either).
- Content, 1 weekly point: number, lines, "Your goal", "Set goals ›" alone. No "Show history".
- Content, 2+ weekly points: as below; history closed on every mount.

**Words:**
- Title: "Estimated maintenance"
- Number: "≈ 2380" + "kcal / day", written as today with no thousands space (TalkBack: "About 2380 kilocalories per day")
- New line (`small`): "Smoothed over the last 3 weeks."
- Existing lines, unchanged: "From N logged days and your weight trend (−0.4 kg) over N days.", "N days skipped (looked incomplete)", "Your goal: X kcal"
- Links: "Set goals ›", "Show history" / "Hide history"
- Week labels (text row under the chart, not on the x-axis): "11 weeks ago" (real age of the oldest point, so fewer if older weeks are missing) on the left, "Now" on the right ("1 week ago" if this week has no estimate)
- Caption (`caption`): "One point per week. Weeks without enough data are left out."
- Chart TalkBack: "Maintenance by week: 2410, 2390, … kcal"

**Wireframe** (open):
```
┌──────────────────────────────────────┐
│ Estimated maintenance                │
│ ≈ 2380  kcal / day                   │
│ Smoothed over the last 3 weeks.      │
│ From 24 logged days and your weight  │
│ trend (−0.4 kg) over 26 days.        │
│ 2 days skipped (looked incomplete)   │
│ Your goal: 2100 kcal                 │
│     Set goals ›     Hide history     │
│ ──────────────────────────────────── │
│ 2500 ┤                               │
│ 2400 ┤ •─•   •─•─•                   │
│ 2300 ┤    •─•      •─•─•─•           │
│ 2200 ┤                               │
│      11 weeks ago               Now  │
│ One point per week. Weeks without    │
│ enough data are left out.            │
└──────────────────────────────────────┘
```
Closed: the same card ending at the link row ("Show history"), no hairline, no chart.

## Acceptance criteria

- [ ] With data, the number is the average of the weekly estimates for "today", today − 7 and today − 14, leaving out the weeks with no estimate, rounded to 10 kcal.
- [ ] "Smoothed over the last 3 weeks." shows under the number.
- [ ] The detail and skipped-days lines come from the newest week that has an estimate. Rule: if this week has no estimate but an older one of the 3 does, the lines show that older week's numbers.
- [ ] If none of the 3 weeks has an estimate, the card shows the same empty state as today, with no history link, even when older weeks have data.
- [ ] "Show history" is hidden while the card has fewer than 2 weekly points. Tapping it shows the chart and caption, and the link text changes to "Hide history". Tapping again hides them. It starts closed every time the screen mounts.
- [ ] The chart has at most 12 points, oldest on the left, and leaves out weeks with no estimate.
- [ ] No new network requests (check Network on web), no SQL.
- [ ] `npx tsc --noEmit`, `npx expo lint` and `npx jest` pass.

## Test plan

- Unit (`progress.test.ts`, reusing the `span`/`food`/`weighIns` helpers from the `estimateMaintenance` block):
  - `weeklyMaintenance`: with enough data for all weeks, it returns `weeks` entries, oldest first, with dates `today − 7·(weeks−1)` … `today`. Each entry equals `estimateMaintenance(…, thatDate)`. With food logged only in the last 4 weeks, the older weeks are left out. With no data, it returns `[]`.
  - `weeksAgoLabel`: today gives "Now", 7 days back "1 week ago", 77 days back "11 weeks ago".
  - `smoothedMaintenance`: three weeks at 2000, 2100 and 2300 give 2130. Weeks older than today − 14 are ignored. A missing week is not counted as 0 (two weeks at 2000 and 2100 give 2050). If this week is missing, `latest` is the week before. With only older weeks, or `[]`, it returns `null`.
  - The existing `estimateMaintenance` tests stay and pass.
- Web (test account from `.env.test.local`): it has too little data for an estimate, so check only that Progress loads, the maintenance card shows the empty state with no "Show history" link, the Network tab shows no new requests, and the console has no errors.
- Phone (`phone-test` issue): on an account with 3+ weeks of food and weigh-ins, check:
  - the number and the "Smoothed over the last 3 weeks." line
  - "Show history" opens a chart with weekly points and the caption, and "Hide history" closes it
  - the chart fits inside the card, and the "N weeks ago" / "Now" labels under the chart are not clipped
  - TalkBack reads the chart label.

## Risk

🔴 changes existing: the number on the existing maintenance card changes from one 28-day estimate to a 3-week average.

## Needs from the user

None. Ships with `eas update`, with no migration and no new APK.

## Open questions

None. The case where this week has no estimate is settled above: the detail line comes from the newest week of the 3 that has one.

## Out of scope

- Half-logged days. GOALS-2 already skips them.
- Saving estimates, and any change to the 28-day window or the 14-day minimums.
- Range tabs, tooltips or a pressable point on the history chart, and a second series (such as intake or goal).
- Changing the empty-state text. It still says "within the last 4 weeks", which is enough to always get an estimate.
- Weighting the weeks differently (newer weeks counting more). It's a plain average.
- Reworking `weightTrend`, which is O(n²) and gets recomputed inside each of the 12 runs. The `useMemo` is enough for now. A shortcut comment isn't needed unless the card feels slow on the phone.
