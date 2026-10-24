# UX-125: Food page fits on one screen (issue #125)

## Goal

On a normal phone the Food page (date row, summary card, all 4 collapsed meal cards) fits without scrolling. To get there, the summary card gets a compact layout: a small calorie ring on the left and the three macro bars stacked on the right. Home's "Today's food" card uses the same shared piece.

Rough numbers: today the page is about 770–780 pt tall and the summary card about 278 of that (ring 160 + "left" line + a row of bars underneath). The compact card is about 175, so the page comes to about 670 pt, which fits the roughly 700 pt of room.

## Files to touch

- `src/components/CalorieRing.tsx`
  - `RING_SIZE` 160 → 110, `RING_STROKE` 14 → 10. The ring's middle (number, "of X kcal"), the "X kcal left / over" line under it, the colours and `a11yLabel` stay exactly as they are.
  - Add and export `NutritionSummary({ totals, goals })`. `totals` is `{ calories, protein, carbs, fat }` (what `sumEntries` returns) and `goals` is `NutritionGoals | null | undefined`. It renders a row: `<CalorieRing eaten={totals.calories} goal={goals?.caloriesKcal ?? null} />` on the left, and on the right a column (`flex: 1`, `gap: spacing.sm`) with `MacroBar` Carbs / Protein / Fat (same props as the screens pass today). The row uses `flexDirection: 'row'`, `alignItems: 'center'`, `gap: spacing.lg`.
  - `macro` style: drop `flex: 1`. It was for the old side-by-side row and would squash the bars in a column.
  - Drop `export` from `CalorieRing` and `MacroBar`, since after this change nothing outside the file uses them.
- `src/app/(tabs)/food/index.tsx`: in `DiaryContent`, the summary `Card` holds only `<NutritionSummary totals={totals} goals={goals} />`. Drop `gap: spacing.lg` from that Card's inline style (it has one child now) and keep `marginBottom`. Remove the `macroList` style and switch the import to `NutritionSummary`.
- `src/app/(tabs)/home.tsx`: replace the `foodRow` `View` (ring + `macroList`) with `<NutritionSummary totals={totals} goals={goals} />`. Remove the now unused `foodRow` and `macroList` styles and switch the import.

## Reuse

- `CalorieRing` and `MacroBar` as they are (SVG ring, over/under colours, bars, a11y label). Only the size and the parent layout change.
- `spacing` tokens from `src/theme.ts`. No new colours or font sizes.
- `Card` on Food and the existing hand-made `styles.card` Pressable on Home stay as they are.

## UX/UI

**Flow.** Nothing new to tap. Food tab → see today's summary and all four meals at once. Home → "Today's food" card → tap → Food tab (as today).

**Screens and parts.** One shared `NutritionSummary` is used on Food (inside the existing `Card`) and on Home (under the "Today's food" title, inside the existing tappable card). It reuses `CalorieRing` and `MacroBar`. No new colours, text sizes or spacing steps.

- Row: ring block on the left, bars column on the right. `gap: spacing.lg` (16) between them.
- Ring block: ring 110 pt, stroke 10. The number (28/700) and "of X kcal" (13 grey) sit in the middle. The "X kcal left" line (14/600) sits under the ring with `spacing.sm` (8) between them. The block is as wide as the ring, or wider only if the "left/over" line needs it.
- Bars column: `flex: 1`, so it takes all remaining width (about 170 pt at 360 width, about 200 at 390). Order top to bottom: Carbs, Protein, Fat, with `spacing.sm` between them. Each one is: the label (14/600), then "value/goal g" (13 grey, tabular numbers), then a 6 pt bar 4 pt below. The bar spans the full column width.
- Vertical alignment: `alignItems: 'center'`. The whole ring block (ring plus "left" line) and the bars column are centred on each other. The bars column is about 150 pt tall and the ring block about 137, so neither one sets a big empty gap.
- Card height: about 183 pt (16 padding + ~151 content + 16), down from about 280. The Snack card's bottom moves from about 795 to about 700 at 390x844, which clears the tab bar.

**States.** Words and colours are the same as today. Only the layout changes.

- Loading: as today (Home shows a spinner in the card, and Food keeps its own loading).
- No calorie goal: an empty grey ring, the number with "kcal" under it, and no "left" line. The ring block is then just the 110 pt ring, and it stays centred against the bars.
- No macro goal: that bar shows the label and "value g" only, with no track. If no macro has a goal, the column is about 120 pt tall and stays centred.
- Over the calorie goal: the ring is full and red, and the line reads "X kcal over" in red.
- Over a macro goal: the bar is full in blue, and the text shows e.g. "160/140 g" (no red, as today).
- Long numbers at 360 width: the ring's hole is 90 pt wide. "of 1945 kcal" (about 72 pt) and a four-digit eaten number (about 64 pt) fit. A line like "12450 kcal over" may make the ring block slightly wider than the ring, and the bars column shrinks to match. Bar lines such as "1234/245 g" fit in about 170 pt.
- a11y: the ring stays one element with the same label ("X of Y calories eaten, Z left/over" or "X calories eaten"). The bars are read as plain text, as today. On Home the whole card is still the button.

**Words.** No changes: "of X kcal", "kcal", "X kcal left", "X kcal over", "Carbs", "Protein", "Fat", "value/goal g".

**Wireframe** (Food, 390 wide, goal set):

```
‹        Today        ›
┌─────────────────────────────────┐
│   ╭───────╮     Carbs           │
│  │   0     │    0/245 g         │
│  │of 1945  │    ▬▬▬▬▬▬▬▬▬▬▬▬▬▬  │
│  │  kcal   │    Protein         │
│   ╰───────╯     0/140 g         │
│ 1945 kcal left  ▬▬▬▬▬▬▬▬▬▬▬▬▬▬  │
│                 Fat             │
│                 0/45 g          │
│                 ▬▬▬▬▬▬▬▬▬▬▬▬▬▬  │
└─────────────────────────────────┘
┌─ Breakfast  Nothing logged  (+) ┐
┌─ Lunch      Nothing logged  (+) ┐
┌─ Dinner     Nothing logged  (+) ┐
┌─ Snack   Copy previous day  (+) ┐
```
("of 1945 kcal" stays one line in the app. It is split here only to fit the sketch.)

Home: the same block sits under "Today's food", and the rest of the card is unchanged.

## Acceptance criteria

- [ ] Web at a 390x844 viewport (Chrome device mode), test account, Food tab, all meals collapsed: the Snack card's bottom edge shows without scrolling. This holds with a calorie goal set and also with none.
- [ ] The summary card shows the ring (about 110 pt) on the left, with the eaten number and "of X kcal" inside it and "X kcal left" (or "X kcal over" in red) under it. Carbs / Protein / Fat are stacked on the right, each with its "value/goal g" line and bar.
- [ ] No text is cut off or overlapping inside the ring at 390 and at 360 width, with a four-digit goal (e.g. 2450).
- [ ] Without goals: the ring is empty with "kcal" under the number, there is no "left" line, and the bars show grams only with no track. That is the same behaviour as today.
- [ ] Home's "Today's food" card shows the same compact layout, and tapping it still opens the Food tab.
- [ ] TalkBack/a11y: the ring is still one element read as "X of Y calories eaten, Z left/over" (or "X calories eaten" with no goal). Check on web via the `aria-label` of the ring block.
- [ ] Opening a meal or seeing "Copy previous day" may make the page scroll. Scrolling still works.
- [ ] `npx tsc --noEmit` and `npx expo lint` pass. Nothing still imports `CalorieRing` or `MacroBar` from outside `CalorieRing.tsx`.

## Test plan

- Unit: none. This is a layout change with no new logic. The a11y label code is not touched.
- Web (`npx expo start --web --port 8081`, test account, 390x844 and then 360x800):
  1. Food tab, today. Check that the Snack card is fully visible without scrolling, and check the ring text and bars.
  2. Step back a day with ‹ to a day with entries, and to a day with an empty meal and "Copy previous day". The layout holds.
  3. Open a meal. The page scrolls normally.
  4. Home. The "Today's food" card has the same layout, and tapping it opens Food.
  5. Inspect the ring block's `aria-label`. Check the console for errors.
- Phone test issue (`phone-test` label): on the phone, open Food with all meals collapsed and check that it fits with no scrolling. Then turn the phone font size up one step and check that nothing in the ring is cut off.

## Risk

🔴 changes existing. It resizes a shared component and restructures the summary card on both Food and Home.

## Needs from the user

None. No SQL and no new app build (JS only, ships with `eas update`).

## Open questions

- Settled (design): keep the ring's middle text inside the hole (horizontal padding = stroke width), so at big font sizes it wraps instead of running over the stroke. Text is unchanged.
- Settled: "normal phone" in the Decisions means 390x844 (~700 pt of room). Smaller phones like 360x800 may still scroll a little; trimming spacing is out of scope.

## Out of scope

- Meal cards, the date row and the page padding stay unchanged (per the decision).
- Moving `CalorieRing`/`MacroBar` text onto `AppText`. That belongs to its own DS ticket.
- Moving Home's hand-made card onto `Card`.
- Changing the ring's text, colours or the a11y wording.
- Making expanded meals or "Copy previous day" fit without scrolling.
- Large font-size settings fitting on one screen. Text must not be cut off, but the page may scroll.
