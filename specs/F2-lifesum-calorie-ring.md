# F2 – Lifesum-style calorie ring (no calories burned)

Issue: jjerner/FitTracker#9. Beta feedback 2026-10-10 (`beta_test_feedback_2026-10-17.md` line 15): "Calorie ring: show the same info as Lifesum's ring, but without calories burned."

## Goal

Make the daily calorie summary look and read like Lifesum's: big "X kcal left" in the ring, "Eaten" shown next to it, macro bars underneath. No burned calories.

## Today

`src/components/CalorieRing.tsx` exports two components:

- `CalorieRing({ eaten, goal })`: a 120 px SVG ring, 12 px stroke. It fills green as `eaten / goal`, turns red (`colors.danger`) when over. The middle shows `|goal - eaten|` plus "kcal left" / "kcal over". With no goal it shows eaten plus "kcal" and an empty ring.
- `MacroBar({ label, value, goal })`: a "Protein 80/150g" line with a thin bar under it (no bar if there is no goal).

Both are used the same way in two places: the ring on the left, and Protein/Carbs/Fat bars stacked to its right.

- `src/app/(tabs)/home.tsx:110-117` ("Today's food" card, `foodRow` style)
- `src/app/(tabs)/food/index.tsx:287-294` (diary top card, `totalsCard` style)

So the ring already shows "kcal left". What Lifesum has that we don't: "Eaten" shown as its own number, a bigger centered ring, and the macros in a row underneath instead of beside it.

## Proposal (smallest version)

```
   Eaten            [  ring  ]           Goal
   1 240 kcal       [  860   ]           2 100 kcal
                    [kcal left]
   Carbs 120/250g   Protein 80/150g   Fat 40/70g
   [=====-----]     [=====-----]      [=====-----]
```

- Add the "Eaten" and "Goal" side labels inside `CalorieRing`, so both screens get them with no copy-paste. Lifesum's "Burned" slot becomes "Goal" (or stays empty, see open questions).
- Make the ring bigger (for example 150 px). It stays one size everywhere.
- In both screens, put the ring row on top and the three `MacroBar`s below it in one row (`flexDirection: 'row'`, each bar `flex: 1`). Use Lifesum's order: Carbs, Protein, Fat.
- Keep how it works today: it fills as you eat, turns red with "kcal over" when you pass the goal, and with no goal it shows eaten kcal only and hides the side labels.

## Files to touch

- `src/components/CalorieRing.tsx`: change the `CalorieRing` layout to a row with Eaten, the ring and Goal. Bump `RING_SIZE` and the center font size. `MacroBar` stays as it is unless open question 4 changes its text.
- `src/app/(tabs)/home.tsx`: change `foodRow` / `macroList` from side-by-side to stacked (ring row, then a row of macros). Reorder the macros.
- `src/app/(tabs)/food/index.tsx`: the same for `totalsCard` / `macroList`.

## Reuse

- `CalorieRing` and `MacroBar` as they are (the SVG ring, the over/under colors, the bars).
- `colors` and `spacing` from `src/theme`.
- `react-native-svg` is already installed. No new dependency.

## Acceptance criteria

- [ ] With a goal set, the Food tab and Home show: "Eaten N kcal" on the left, the ring with "X kcal left" in the middle, the goal on the right (or empty, per the decision), and Carbs/Protein/Fat bars in one row below.
- [ ] The ring fills in proportion to eaten / goal. Over the goal it is red and says "X kcal over".
- [ ] With no calorie goal, the ring shows eaten kcal only, with no "left" and no side labels. Macros with no goal show their text without a bar (same as today).
- [ ] Nothing mentions burned calories.
- [ ] The layout fits a narrow phone (about 360 dp wide) without wrapping or cutting off text.
- [ ] Tapping the Home card still opens the diary.
- [ ] `npx tsc --noEmit` and `npx expo lint` are clean.

## Test plan

- Unit tests: none. This is a layout-only change with no new logic (the left/over math stays as it is). If the left/over math gets moved into a helper, add a small test in `src/lib/__tests__/`.
- On web (test account from `.env.test.local`):
  1. Food tab: today with no entries shows 0 eaten and the ring empty with "goal kcal left".
  2. Log a food and check that Eaten goes up, "left" goes down and the ring fills.
  3. Log past the goal and check that the ring turns red and shows "kcal over".
  4. Clear the calorie goal in nutrition goals and check that only eaten kcal shows, with no side labels.
  5. Home: the same card looks the same, and tapping it opens the diary.
  6. Narrow the browser to about 360 px wide and check that nothing wraps badly.
  7. Check the console for errors.
- Phone: one look on a real device to check size and readability (add it to the HANDOVER phone list).

## Needs from the user

- The design decisions below.
- No SQL and no new build. JS only, so it ships with `eas update`.

## Open questions

1. What goes on the right of the ring where Lifesum shows "Burned": the goal ("Goal 2 100 kcal"), or nothing (only Eaten on the left)?
2. Should Home get the new layout too, or only the Food tab (Home keeps the compact side-by-side card)?
3. Macros: move them below the ring in a row (like Lifesum), or keep them stacked beside the ring?
4. Macro text: keep "120/250g" (eaten/goal), or show Lifesum's "130g left"?
5. Macro order: Lifesum's Carbs, Protein, Fat, or keep today's Protein, Carbs, Fat?
6. Ring size: bigger (about 150 px), or keep 120 px?
7. Over the goal: keep today's full red ring with "X kcal over", or something else?

## Out of scope

- Burned calories, exercise calories and step data.
- Rings per macro, or macros drawn as small rings.
- Animating the ring.
- Weekly or other non-daily views.
- Any change to how goals are set or stored.

## Decisions (2026-10-18) – replaces the design above where they differ

User: "show eaten/goal – today it only shows how far off you are." Design picked by UI + UX review, approved by the user:
- Ring 160 dp, stroke 14, centred, green (`colors.success`); red (`colors.danger`) and full when over.
- Centre: big eaten number (28 bold, tabular-nums), under it "of 2 100 kcal" (13, muted). No side "Eaten"/"Goal" columns.
- One small line under the ring: "860 kcal left" (14 semibold, colors.text) or "140 kcal over" (colors.danger).
- No goal: eaten + "kcal", empty track, no left line.
- Macros in a row of three below the ring, each flex 1, order **Carbs, Protein, Fat**; label above "120/250 g", bar below.
- Same component and size on Home and the Food tab. Home card stays tappable.
- Accessibility: one label on the ring ("1240 of 2100 calories eaten, 860 left"), inner texts hidden from screen reader.
