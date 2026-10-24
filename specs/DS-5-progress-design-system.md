# DS-5 – Design system: migrate Progress screen

Issue: jjerner/FitTracker#67

## Goal

Move the rest of the Progress tab (`src/app/(tabs)/progress.tsx`) to the shared bricks and tokens (`AppText`, `Button`, `spacing`, `radius`) so it follows `docs/design-system.md`. Nothing about what the screen does changes. JS only.

## Decisions (owner, 2026-10-21)

1. **GOALS-7 (#61) first.** It moves the maintenance card below "Nutrition averages" and drops its pace chips and "Use X kcal as my goal" button. DS-5 is built after it merges and migrates only what's left. The (G7) rows are gone from the tables below.
2. **Card titles:** `heading` (20/600, header role).
3. **New `labelSmall` step** (14/600 `colors.text`) for table numbers and the active range tab. The tracked exercise's current weight uses the `heading` look with `accessibilityRole="text"` (not a heading).
4. **"Log" becomes the shared `Button`.** The "keep hand-made" example comes out of `docs/design-system.md`.

App-wide (all DS tickets):
- A. One look everywhere: grey `surface` screen + white `Card`s. Progress already has it.
- B. `labelSmall` 14/600 `colors.text` (see "Shared pieces").
- C. Destructive actions are quiet red text links (`TextLink tone="danger"`), not red filled buttons, and always confirm. Only exception: the Delete account screen. **Not used here:** Progress's only remove action is the small ✕ icon.
- D. New `success` Button variant (dark green #15803d, white text). **Not used here.**

## Shared pieces

Add each if it is not already on master when DS-5 is built (whichever DS ticket goes first adds it, the rest reuse it):
- **B** `src/theme.ts`: add `labelSmall: { fontSize: 14, fontWeight: '600', color: colors.text }` to `typography`. `AppText`'s `variant` is `keyof typeof typography`, so it gets the variant for free. `docs/design-system.md` ladder table: add `| labelSmall | 14 / 600 | field labels, table numbers, active tab |`. **Progress needs this.**
- **C** `TextLink` `tone="danger"`. Progress doesn't use it.
- **D** `Button` `variant="success"`. Progress doesn't use it.

## Today (master `451d7be`, line numbers shift after GOALS-7)

- **Already migrated:** all 6 cards use `Card` (L124, 213, 302, 360, 391, 450), and all 5 card-level empty texts use `EmptyState` (L158, 220, 309, 397, 457). Loading spinners are `ActivityIndicator` (correct per the doc). The maintenance error text (L218) is rightly *not* an `EmptyState`.
- **Still old:** every text is a raw `Text` with `fontSize`/`fontWeight` (styles L529–580). Hand-made buttons: "Log" (L140–150) and "+ Add exercise" (L469–471, about 21 dp tall, no padding or minHeight). Off-scale spacing: 6, 20, 2.
- **Missing a11y:** the ✕ on tracked rows (L519–521) has no TalkBack label, and its tap area is about 41×45 dp. The range tabs (L88) are about 35 dp tall (`hitSlop={8}`) and have no role or selected state.
- Only Progress uses this file. `Chips` (also in `profile/goals.tsx`) and `MonthCalendar` (also in `food/index.tsx`) are shared and stay as they are.
- Anything GOALS-7 leaves on the maintenance card (e.g. "Your goal: …", the clamp note) is migrated with the same rules as below (grey text → `small` + its colour token). Re-read the file after GOALS-7 merges.

## UX/UI

**Flow.** Unchanged. Progress → type weight → Log → box clears, "Latest" updates. Range tab → chart/count updates. Tracked row → exercise page → back. ✕ → row gone. "+ Add exercise" → picker → pick → new row.

**Tap targets.** Use real 48 dp boxes, not `hitSlop`. React Native's `hitSlop` never reaches past its parent view, and both spots below sit at their parent's edge.
- **Range tabs:** each tab `Pressable` gets `minHeight: 48`, `justifyContent: 'center'`. To keep the look, drop `rangeTabs` `marginBottom` (12 → 0) and `inputRow` `marginBottom` (8 → 0); the card's 8 gap does the spacing. The Weight card grows about 9 dp.
- **✕ remove:** the `Pressable` gets `minWidth: 48`, `minHeight: 48`, `alignItems: 'flex-end'`, `justifyContent: 'flex-start'`, so the ✕ stays top-right and the box grows left and down. Drop the text's `paddingHorizontal`. Long exercise names wrap about 30 dp sooner.
- **Log** and **"+ Add exercise"**: `Button`, 48 dp.

**TalkBack.**
- Card titles: "Body weight, heading" (so the user can jump card to card).
- Range tabs: "30 days, selected, button" / "90 days, button" (same as `Chips`).
- Log: "Log, button", "disabled" when the box is empty, "busy" while saving.
- ✕: "Remove Bench press, button".
- "+ Add exercise, button".
- The tracked value "80 kg × 5" is plain text, not a heading.

**Contrast** (on the white card). Passes AA: `muted` 4.8:1, `textSecondary` 10:1, `primary` 5.2:1, white on blue 5.2:1. Fails: `subtle` #9ca3af is 2.5:1, and the ✕ is a control (needs ≥ 3:1), so **the ✕ becomes `muted`**. The dimmed "0" set counts and the "N logged" footnote stay `subtle` (out of scope).

**Fit at 360 dp** (296 dp inside the card).
- Nutrition table: number columns 70 dp. "2450 kcal" at `labelSmall` 14/600 ≈ 61 dp: fits.
- Muscle table: week columns 57 dp. "3 wk ago" at 14 ≈ 53 dp: fits. **Drop `numberOfLines={1}`** on the week headers so a large phone font wraps instead of cutting ("wrap, don't cut").
- Card titles at 20/600: the longest, "Nutrition averages (per day)", ≈ 255 dp, one line.

**States.** Same as today, same words. Spinner while loading.

| Card | Empty | Error |
|---|---|---|
| Weight | "Log your weight on at least 2 days to see a trend." | – |
| Maintenance | "Needs 14 days of food logged…" | "Couldn't load your data. Try again later." (`small`, plain text, not `EmptyState`) |
| Nutrition | "No food logged before today yet." | – |
| Muscle sets | "No strength sets logged in the last 4 weeks." | – |
| Tracked | "Add an exercise to follow your strength." | – |

**Words.** No visible changes. One new TalkBack label: "Remove {exercise name}".

**What the user will notice:** card titles bigger (16 → 20); grey text slightly bigger (13 → 14); table rows +4 dp; "+ Add exercise" goes from a thin 21 dp strip to a normal full-width 48 dp button; Log about 3 dp taller; ✕ darker grey; tracked value a touch less bold (700 → 600). Charts and tables otherwise look the same.

## Changes in `progress.tsx`

### Text (today → `AppText` variant)

| Style (line) | Used at | Today | Becomes |
|---|---|---|---|
| `cardTitle` (529) | 125, 214, 303, 361, 392, 451 | 16/600 | `heading` (20/600, header role) |
| `cardSubtitle` (530) | 127, 231, 233, 238, 304, 370, 429, 452, 504, 510, 513 | 13 muted | `small` (14 muted) |
| `empty` (531), the error text | 218 | 14 muted, pv 16 | `small`, `paddingVertical: spacing.lg` |
| `tableLabel` (534) | 313, 322, 332, 401, 414 | 14 textSecondary | `small` + `color: colors.textSecondary` (the empty spacer cells too) |
| `tableHeader` (535) | 315, 403 | 13 muted, right | `small`, right. Drop `numberOfLines={1}` |
| `tableCell` (536) | 324, 416 | 14/600 | `labelSmall` |
| `countValue` (543) | 228, 369 | 28/700 | `title` (same look) |
| `rangeOptionText` (544) | 89 | 14 textSecondary | `small` + `color: colors.textSecondary` |
| `rangeOptionActive` (545) | 89 | 14/600 primary | `labelSmall` + `color: colors.primary` |
| `legend` (547) | 183 | 12 textSecondary | `caption` + `color: colors.textSecondary`. The inner "━" glyphs (184, 185) **stay plain `Text` with colour only**: a nested `AppText` would reset them to body 16. |
| `trackedName` (558) | 500 | 15/600 | `label` (16/600) |
| `trackedValue` (559) | 507 | 20/700 | `heading` with `accessibilityRole="text"` (20/600, not read as a heading) |
| `trackedRemove` (560) | 520 | 16 subtle | `body` + `color: colors.muted` |
| `input` font (568) | 134 | `fontSize: 16` | `...typography.body` (a `TextInput` can't be `AppText`) |
| `axisLabel` (532), `tableFootnote` (541) | 180–181, 334 | 10 / 11 | **stay as they are** (doc exception for chart axes and tiny footnotes) |

### Buttons

| Where | Today | Becomes |
|---|---|---|
| "Log" (140–150) | `Pressable` + `ActivityIndicator`, radius 8, ph 20 | `<Button title="Log" onPress={handleSave} disabled={!isValid} loading={isSaving} />`. Hugs its text in the row, 48 dp tall (row grows about 3 dp). |
| "+ Add exercise" (469–471) | `Pressable`, about 21 dp tall | `<Button title="+ Add exercise" onPress={() => setPickerOpen(true)} />` (primary, the only action in the card). |
| ✕ remove (519–521) | no label, hitSlop 12 | Add `accessibilityRole="button"` and `` accessibilityLabel={`Remove ${name}`} ``. Replace `hitSlop` with the 48 × 48 box from UX/UI. Stays an icon, removes straight away (decision C doesn't apply). |
| Range tabs (88) | hitSlop 8, no role | Add `accessibilityRole="button"` and `accessibilityState={{ selected: r.days === value }}` (same as `Chips`). Replace `hitSlop` with `minHeight: 48`, `justifyContent: 'center'`. |

Then delete the now-unused styles `button`, `buttonDisabled`, `buttonText`. Imports: add `AppText` and `Button`, plus `spacing`, `radius` and `typography` from theme. `Text`, `Pressable` and `ActivityIndicator` stay in use.

### Spacing and corners (ties round **up**)

| Style | Today | Token |
|---|---|---|
| `content` padding / gap | 16 / 16 | `spacing.lg` (same; `chartWidth = width - 110` at L53 depends on it) |
| `tableRow` paddingVertical | 6 | `spacing.sm` 8 |
| `countRow` gap | 6 | `spacing.sm` 8 |
| `rangeTabs` gap / marginBottom | 20 / 12 | `spacing.xl` 24 / **removed** |
| `inputRow` marginBottom | 8 | **removed** |
| `trackedMain` gap | 2 | `spacing.xs` 4 |
| `muscleFootnote` marginTop, `legend` marginTop, `trackedRow` paddingVertical, `inputRow` gap | 8 | `spacing.sm` (same) |
| `trackedRemove` paddingHorizontal | 4 | **removed** |
| `input` radius / padding | 8 / 12 | `radius.md` / `spacing.md` (same) |

## Other files

- `src/theme.ts`, `docs/design-system.md` ladder: shared piece B, if not already on master.
- `docs/design-system.md`:
  - L68–70: drop the "(like Progress's "Log" next to the weight box)" example and the "stay as they are" part; keep "no small button size yet, add `size="sm"` through the system".
  - L118–120: say Progress has moved fully; drop "The rest of Progress is still old style".

## Must NOT change

- The charts: every `LineChart` prop (L161–182), their colours, the 10-size axis labels, the legend glyph colours and the `chartWidth` maths.
- The card order (as GOALS-7 leaves it), the card contents, all wording (except the new ✕ TalkBack label), the numbers and maths (`estimateMaintenance`, `weightTrend`, `weeklyMuscleSets`, `trackedStats`, the averages), the hooks and query invalidation on focus.
- Loading → spinner, empty → `EmptyState`, error → plain text. The same 5 `EmptyState` messages.
- Log: save logic, decimal comma, clearing on success, blocked while invalid or saving. Tracked row still opens the exercise page. ✕ still removes straight away. "+ Add exercise" still opens `ExercisePicker`.
- Colour meanings: `thisWeek` primary, `zeroSets` subtle, `tableFootnote` subtle 11.
- `Chips`, `MonthCalendar`, `ExercisePicker`, `Card`, `EmptyState`, `Button`, `TextLink` (no code changes from this ticket).

## Reuse

`AppText`, `Button`, `colors` / `spacing` / `radius` / `typography` from `src/theme.ts`, the `Chips` a11y pattern (role button + selected) for the range tabs, and `labelSmall` if another DS ticket already added it.

## Acceptance criteria

- [ ] Built on top of merged GOALS-7 (#61).
- [ ] In `progress.tsx`, `grep -nE "fontSize|fontWeight"` only matches `axisLabel` and `tableFootnote`.
- [ ] No raw numbers for padding, margin, gap or radius in `styles`, except flex values and the 48 dp boxes.
- [ ] No hand-made buttons: "Log" and "+ Add exercise" are `Button`, ≥ 48 dp. Log is dimmed when the box is empty, shows a spinner while saving, clears on success.
- [ ] Card titles are `heading` and TalkBack reads them as headings. The tracked value is not read as a heading.
- [ ] ✕ is read as "Remove <name>, button", tap area ≥ 48 dp, colour `muted`. Range tabs are ≥ 48 dp tall and read as selected/not selected.
- [ ] `labelSmall` exists once in `typography` and once in the doc's ladder table (no duplicate if another DS ticket added it).
- [ ] At 360 dp width (default font size), no nutrition table cell wraps and "3 wk ago" isn't cut.
- [ ] The charts look the same as before (compare screenshots).
- [ ] `docs/design-system.md` updated as listed (no "Log" hand-made example; Progress fully moved).
- [ ] `npx tsc --noEmit` and `npx expo lint` pass.

## Test plan

- Unit tests: none. Style swap, no new logic.
- Web (`npx expo start --web --port 8081`, test account from `.env.test.local`), Progress tab. Before/after screenshots at 360 and 412 width (DevTools device mode):
  - Weight: empty box → Log dimmed. Type `80,5`, tap Log: spinner, box clears, "Latest" updates. Switch 30 days / 90 days / 1 year.
  - Nutrition and muscle tables: columns fit at 360. Charts match the before screenshot.
  - Tracked: "+ Add exercise" opens the picker. Add one, tap the row (opens exercise page), go back, tap ✕ (row gone).
  - Maintenance: empty state or numbers show as after GOALS-7 (the test account may lack 14 days of data; don't seed it).
  - Console has no errors.
- Phone (`phone-test` issue): TalkBack reads card titles as headings, the tracked value as plain text, ✕ as "Remove …, button", the range tabs as selected, Log as "disabled"/"busy". Large phone font: tables wrap, nothing is cut off.

## Risk

🔴 changes existing. Every text, button and gap on a whole tab changes, the nutrition table columns are tight, and it may add `labelSmall` to the shared text ladder in `theme.ts` and changes the design doc.

## Needs from the user

None. Build after GOALS-7 (#61) merges. Ships JS only with `eas update` (no SQL, no new APK).

## Open questions

None.

## Out of scope

- Everything GOALS-7 owns: the maintenance card position, its pace chips, the "Use X kcal" button, the clamp note logic.
- Shared pieces C (`TextLink tone="danger"`) and D (`Button variant="success"`): Progress uses neither, so DS-5 doesn't add them.
- `Chips` (shared with Goals; belongs to the Goals/Profile DS ticket). `MonthCalendar` (shared with Food). `ExercisePicker`.
- A `size="sm"` Button. Turning the range tabs into `Chips`.
- A confirm or undo on ✕ remove: behaviour change, own ticket.
- The weight box becoming `LabeledInput`, rewording the error text, a retry action, dark mode.
- `subtle` text for the "N logged" footnote and the dimmed 0s (doc exception and meaning colour).
- A role/label on the tracked row itself (it already works as a Pressable).
