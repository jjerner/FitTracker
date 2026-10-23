# DS-4 – Design system: migrate Workouts screens

Issue: jjerner/FitTracker#66

## Goal

Move the Workouts area onto the shared bricks and tokens (`Button`, `TextLink`, `AppText`, `EmptyState`, `Card`, `Chips`, `spacing`, `radius`) so it follows `docs/design-system.md`, with the app's one look: grey screen, white cards. Nothing about what the screens do changes. Ships JS-only.

## Decisions (owner, 2026-10-21)

- **Danger link colour (2026-10-21):** `TextLink tone="danger"` uses `colors.dangerDark` in every DS ticket, so it reads on grey and white.
- **Pickers and catalog (2026-10-21):** grey screen with the list in one white card, per rule A (one look everywhere). This includes the Add Exercise picker opened from Progress.

- **Q1 → grey screen + white `Card`s on every Workouts screen** (changed from the designer's "keep white screens"). Same look as Food and Progress. The active-workout exercise cards use `Card` with `padding: spacing.md` (12, today's value), so the set table keeps its width.
- **Q2 → new `success` variant on `Button`**: dark green `successDark` #15803d, white text (5.0:1). Used by Finish Workout.
- **Discard Workout stays a small red text link**, not a filled button: 48 dp tap area, `spacing.md` or more below Finish, still confirms.
- **Q3 → two PRs from this spec:** DS-4a = everything except `active.tsx` (can start now). DS-4b = `active.tsx` only, after AU-4 (#89) merges.
- **Q4 → yes:** TalkBack labels, header roles and 48 dp tap areas are in this ticket (↑ ↓, rest bar, headings, summary rows, and the other compact taps). ✓ / ✕ / set badge stay out (#70).
- **App-wide A:** one look everywhere: grey screen + white cards.
- **App-wide B:** new text step `labelSmall` = 14 / 600 / `colors.text`, for field labels, table numbers and the active tab. Used wherever Workouts has 14/600 text.
- **App-wide C:** destructive actions are quiet red text links (`TextLink tone="danger"`), never red filled buttons. They still confirm first. The only exception in the app is the main button on the Delete account screen.
- **App-wide D:** the `success` Button variant and `successDark` token above.

### Shared pieces (add if not already on master when this is built)

DS-5 / DS-6 / DS-3 may add some of these first. Check master; add only what's missing.

| Piece | Where | What |
|---|---|---|
| B `labelSmall` | `src/theme.ts` `typography`, design-doc ladder | `labelSmall: { fontSize: 14, fontWeight: '600', color: colors.text }`. Ladder row: `labelSmall \| 14 / 600 \| field labels, table numbers, active tab`. `AppText` needs no change (it takes any `typography` key). |
| C `TextLink tone` | `src/components/TextLink.tsx`, design doc | `tone?: 'primary' \| 'danger'` (default `primary`). `danger` colours the label `colors.dangerDark` (see Open question 1). Doc: TextLink row + "Destructive actions" section get rule C. |
| D `success` | `src/theme.ts` `colors`, `src/components/Button.tsx`, design doc | Token `successDark: '#15803d'`. Variant `success: { backgroundColor: colors.successDark, color: colors.onPrimary, borderColor: colors.successDark }`. Doc: Button row adds "`success` (finishing something, e.g. Finish Workout)"; Colour section notes white text goes on `successDark`, not `success` (3.3:1). |

B and C go in DS-4a (it uses them). D goes in DS-4b (its only user is Finish), together with the Home one-liner below.

## PR split

- **DS-4a (start now):** home, routine, programs, summary, catalog, detail, the 4 `components/workouts/*`, `RestTimeInput`, shared pieces B + C, design-doc updates.
- **DS-4b (after #89 merges):** `active.tsx`, shared piece D, `home.tsx` one-liner. Rebase on master first. Then check every `Alert.alert(...)` and `try/catch` that AU-4 added is still there, word for word, and re-check the line numbers below.
- DS-4a restyles the two pickers that open from Active. That's fine: they're self-contained modals.

## Today

- 7 screens and 5 components, all written before the design system existed. About 20 hand-made `Pressable` + `Text` buttons. Raw `fontSize` everywhere (12–22) plus weight `500`. Off-scale values 2, 6, 10, 14, 20, 40 and chip corners 16/20.
- Screens are white with **grey** (`surface`) topic boxes. Only Exercise detail is already grey screen + white boxes.
- Empty texts are plain `subtle` grey (2.5:1, fails) and don't say what to do next.
- Three hand-made pick-one chip rows copy `Chips`.

## Mapping rules (every file below)

- **Screen:** `container` (and the loading `center` view) → `backgroundColor: colors.surface`.
- **Box → `Card`:** every white-on-white or grey topic box becomes `<Card>`. **Pass `gap: 0`** unless noted, and keep today's padding as a token, so the inside of the box doesn't move. Card's default `gap: sm` would add 8 dp between every set row.
- **Grey text (`small`, `caption`) only on white.** Inside a Card, `muted` is fine (4.8:1). Grey text straight on the grey screen (subtitles under titles) uses `textSecondary` (muted on grey is 4.4:1, fails). Empty texts go inside a Card.
- **Text:** nearest ladder step. 12 → `caption`. 13/14 → `small`. 15/16 → `body`. 15/16/17 with 500/600/700 → `label`. **14/600 (or 13/600) → `labelSmall`.** 20/700 → `heading`. Big numbers (summary stats, rest countdown) → `title`. Chart axis labels (10) stay. Glyphs ✓ and ↑ ↓ keep their raw size with `// icon glyph, not text`.
- **Colour on text:** keep today's token through `style={{ color: colors.X }}`, except where the grey-text rule above says otherwise.
- **TextInput:** `...typography.body` (15 → 16).
- **Spacing:** 2 → `xs`, 6 → `sm`, 10 → `md`, 14 → `lg`, 20 → `xl`, 40 → `xxl`. Exactly between two steps → round up. On-scale numbers → their token.
- **Radius:** 6 → `sm`, 8 → `md`, 12 → `lg`, chips → `full`.
- **Not tokens:** widths/heights (table columns, 36×36 ✓, `width - 110` chart).
- **Destructive:** `<TextLink tone="danger" … style={{ marginTop: spacing.md }} />`. The confirm `Alert` stays.
- **List rows inside a Card:** no separator under the last row (`index < list.length - 1`).

## Per-file changes

Line numbers are on master at `451d7be`.

### DS-4b: `src/app/(tabs)/workouts/active.tsx`

| Line | Today | After |
|---|---|---|
| 616, 617 | white container / loading view | `surface` |
| 162 | title 20/700 | `heading` |
| 229 | elapsed 14 muted, mt 2 | `small` in `textSecondary` (on grey), `marginTop: xs` |
| 183–185 | "+ Add Exercise" | `Button variant="secondary"` |
| 187–193 | "Finish Workout", green hand-made + spinner | `<Button variant="success" title="Finish Workout" onPress={handleFinish} loading={isFinishing} style={{ marginTop: spacing.xl }} />` |
| 195–197 | "Discard Workout", red text | `<TextLink tone="danger" title="Discard Workout" onPress={handleDiscard} style={{ marginTop: spacing.md }} />` |
| 480 / 621–626 | ExerciseCard grey box | `<Card style={{ padding: spacing.md, gap: 0, marginBottom: spacing.md }}>`. Delete `card` style |
| 482 | name 16/600 | `label` |
| 483–490 | "⇄ Swap" 15 blue, "Remove" 15 red | `body` in `primary` / `danger` (on white: 5.2 / 4.8). `hitSlop={{ top: 13, bottom: 13, left: 6, right: 6 }}` (they sit 12 apart, so side slop stays small). Labels per TalkBack table |
| 492 | target 13 muted | `small`, `marginTop: xs` |
| 494–497 | offline line 12 warning, mb 6 | `caption` in `warning`, `marginBottom: sm`. Same words |
| 499 | record 13/600 warning | `labelSmall` in `warning`, `marginBottom: sm` (keeps bold) |
| 502–505 | header cells 12/600 muted | `caption` (loses bold) |
| 512, 543, 553 | set number 15/600 | `label`. Warm-up colour stays |
| 515 | Previous, **done** row | `small` in `textSecondary` (muted on green `successBg` is 4.4:1) |
| 556 | Previous, draft row | `small` |
| 516–524 | done values 15 | `body` |
| 527, 581 | ✓ | unchanged (#70) |
| 530, 589 | ✕ 16 muted | `body` in `muted`, same size (#70) |
| 557–572 / 668–676 | inputs: white fill, `border` #e5e7eb edge, 15, padding 6 | `...typography.body`, `paddingVertical: sm`, **`borderColor: colors.borderStrong`**. The fill stays white. On a white card the old pale edge disappears; `borderStrong` is the edge every other input in the app uses |
| 658–664 | set badge padding 6 | `sm` |
| 595–602 / 688 | "+ Add set" 15/600 blue | `label` in `primary`. `addSetButton`: `minHeight: 48`, `justifyContent: 'center'` |
| 259–273 / 707–725 | rest bar | Stays hand-made. "Rest" → `caption` (`subtle` stays). Time → `title` in `onPrimary`. −15/+15 → `label` in `onPrimary`. Skip → `label` in `primaryLight`. `restAdjust` / `restSkip`: `minHeight: 48`, `justifyContent: 'center'` |
| 618 | paddingBottom 40 | `xxl` |
| 690–706 | `secondaryButton`, `finishButton`, `discardButton` styles | delete |

**Set table at 360 dp:** columns 28 / flex 1.4 / flex 1 / flex 1 / 36 / 28, gap 8, card padding 12: unchanged. Previous ≈ 71 dp, each input ≈ 50 dp. "102.5" at 16 fits with ≈ 8 dp spare. With a large phone font it scrolls inside the input, as today (phone list).

### DS-4b: `src/app/(tabs)/home.tsx` (Home tab, one line)

- Line 252: `resumeButton: { backgroundColor: colors.success }` → `colors.successDark`. White on today's green is 3.3:1. Moving Home's buttons onto `Button` is Home's own DS ticket.
- Home tab is already grey screen + white cards. Nothing else to touch.

### DS-4a: `src/app/(tabs)/workouts/index.tsx` (Workouts home)

This one is **not** grey + cards today (white screen, list rows straight on it), so it changes.

| Line | Today | After |
|---|---|---|
| 165–166 | white container / loading | `surface` |
| 55–62 | "Resume: …" hand-made, blue | `Button` primary (stays blue here) |
| 64–74 | "Start Empty Workout" + spinner | `Button loading={isStarting}` |
| 77, 145 | "Routines", "History" 16/600 | `heading` (header role comes with it), `marginTop: xl`, `marginBottom: sm` |
| 78–123 | routine rows, Show archived, archived rows | All inside one `<Card style={{ gap: 0, paddingVertical: 0 }}>` |
| 79 | "No routines yet" | `<EmptyState message="No routines yet. Make one with New Routine, or pick one from Browse Programs." />` inside that Card |
| 146–158 | history rows | inside their own `<Card style={{ gap: 0, paddingVertical: 0 }}>` |
| 147 | "No workouts logged yet" | `<EmptyState message="No workouts logged yet. Start one above." />` inside that Card |
| 88, 118, 155 | row title 15/500 | `label` (archived stays `muted`) |
| 89, 119, 156 | row meta 13 | `small` |
| 92–98 | "Start" chip | Stays hand-made. `radius.full`, padding `sm` / `lg`, text `labelSmall` in `onPrimary`, `hitSlop={{ top: 5, bottom: 5 }}` |
| 104–108 | Show/Hide archived, 14 blue | `small` in `primary`, `minHeight: 48`, `justifyContent: 'center'` |
| 124–143 | New Routine / Browse Programs / Exercise Catalog | `Button variant="secondary"`, `marginTop: md` |
| 164–206 | styles | tokens; delete button/text styles |

### DS-4a: `src/app/(tabs)/workouts/[templateId].tsx` (routine)

| Line | Today | After |
|---|---|---|
| 372 | white container (+ loading) | `surface` |
| 195–201 | "Name" + hand-made input | `<LabeledInput label="Name" …>` (white input on grey) |
| 203 | "Exercises" 14/600 | `labelSmall` + `accessibilityRole="header"`, `marginTop: lg`, `marginBottom: sm`. Matches the "Name" label right above it |
| 204 | "No exercises yet" | `<Card style={{ paddingVertical: 0 }}><EmptyState message="No exercises yet. Tap + Add Exercise to add one." /></Card>` |
| 206 / 384–389 | grey exercise box | `<Card style={{ padding: spacing.md, gap: 0, marginBottom: spacing.sm }}>` |
| 208 | name 15/600 | `label` |
| 209–226 / 393 | ↑ ↓ 18, padding 8/2 | glyph unchanged. `moveButton`: `minWidth: 48, minHeight: 48`, centred (replaces padding; no hitSlop, so the two don't overlap) |
| 227–232 | "Remove" red | `small` in `danger` (white card, 4.8). Pressable `minHeight: 48`, `justifyContent: 'center'`, `paddingLeft: sm` (replaces marginLeft + hitSlop) |
| 243, 263, 281 | "+ Targets", "+ Rest time", "✕ Use default" | `small` in `primary`, margins → tokens, `hitSlop` 12 → 14 |
| 255 | default rest 13 muted | `small` (white card, fine) |
| 268, 360 | "Rest", target labels 12 | `caption` in `textSecondary` |
| 361–366 / 406–413 | target inputs | `...typography.body`, `spacing.sm`, `radius.sm` |
| 290–292 | "+ Add Exercise" | `Button` secondary, `marginTop: sm` |
| 294 | error | `AppText` in **`dangerDark`** (it sits on grey; `danger` is 4.4:1 there) + `accessibilityRole="alert"` + `accessibilityLiveRegion="polite"` |
| 296–302 | "Save Routine" + spinner | `Button loading={isSaving}`, `marginTop: xl` |
| 306–317 | Duplicate / Archive / Unarchive | `Button` secondary `disabled={isSaving}`, `marginTop: sm` |
| 322–324 | "Delete Routine" red text | `<TextLink tone="danger" title="Delete Routine" onPress={handleDelete} style={{ marginTop: spacing.md }} />` |

### DS-4a: `src/app/(tabs)/workouts/programs.tsx`

| Line | Today | After |
|---|---|---|
| 86–87 | white container / loading | `surface` |
| 55 / 89 | grey box, corner 8, padding 16 | `<Card style={{ gap: 0 }}>` (padding `lg` = today) |
| 56 / 57 | name 17/600 / description 13 | `label` / `small`, `marginTop: xs` |
| 60 / 62 | routine name / exercise line | `label` / `small` in `textSecondary` |
| 68–78 | "Add to my routines" + spinner | `Button loading={addingId === program.id} disabled={addingId != null}`, `marginTop: lg` |
| 88 | padding/gap 16, bottom 40 | `lg` / `xxl` |

### DS-4a: `src/app/(tabs)/workouts/log/[logId].tsx` (summary)

| Line | Today | After |
|---|---|---|
| 333–334 | white container / loading | `surface` |
| 204 / 205 | title 20/700, date 14 muted | `heading` / `small` in `textSecondary` (on grey), `marginTop: xs` |
| 207 / 338–344 | grey stats box | `<Card style={{ flexDirection: 'row', gap: 0, marginVertical: spacing.xl }}>` |
| 326 / 327 | stat value 20/700 / label 12 | `title` / `caption` in `textSecondary` |
| 214 | compare 14 | `small` in `textSecondary`, centred, `marginBottom: lg` |
| 221–227 | yellow records box | Stays (`warningBg`, not a Card). Tokens. Title → `label`, lines → `small` in `warningText` |
| 232 / 352 | exercise block (plain View) | `<Card style={{ gap: 0, marginBottom: spacing.md }}>` |
| 233 | name 16/600 | `label`, `marginBottom: xs` |
| 235 | "No sets" | `small`. **Not** `EmptyState`: a fact, not "nothing yet" |
| 240–247 / 355 | set row (≈ 22 dp) | Pressable `minHeight: 48`, `justifyContent: 'center'` (replaces paddingVertical 4). Text `body` in `textSecondary`. The nested ✎ `Text` stays |
| 261 / 364 | modal box | `<Pressable>` with no style (it still swallows backdrop taps) around `<Card>`. Delete `modalCard` |
| 262 | modal title 17/600 | `label`. Drop its `marginBottom` (Card gap) |
| 266–280 | Normal/Warm-up chips | `<Chips labels={['Normal', 'Warm-up']} selected={type === 'normal' ? 0 : 1} onSelect={(i) => setType(i === 0 ? 'normal' : 'warmup')} />` |
| 294–304 | Save + spinner + manual dim | `Button loading={saving} disabled={isEmptySet}`. Delete `buttonDisabled` |
| 305–307 | "Delete set" red text | `<TextLink tone="danger" title="Delete set" onPress={handleDeleteSet} disabled={saving} />` (Alert confirm stays) |
| 312–314 | "Done" | `Button` primary, `marginTop: sm` |
| 316–318 | "Delete Workout" red text | `<TextLink tone="danger" title="Delete Workout" onPress={handleDelete} style={{ marginTop: spacing.md }} />` |

### DS-4a: `src/app/(tabs)/workouts/exercises/index.tsx` (catalog)

- `container` → `surface`, padding `lg`. "+ Custom Exercise" → `Button` secondary, `marginBottom: md`. The list's Card comes from `ExerciseList`.

### DS-4a: `src/app/(tabs)/workouts/exercises/[exerciseId].tsx` (detail, already grey + white boxes)

| Line | Today | After |
|---|---|---|
| 92 / 179 | white box | `<Card style={{ marginBottom: spacing.xs }}>` (default gap 8 = today) |
| 96, 100 / 97, 101 | record value 16/700 / label 12 muted | `label` / `caption` in **`textSecondary`** (it sits in a grey record box), `marginTop: xs` |
| 183 | grey record boxes | `radius.md`, `padding: md` |
| 106–118 | Weight / Est. 1RM toggle | `<Chips … style={{ marginBottom: 0 }} />` |
| 120 / 122 | chart title / subtitle | `label` / `small` |
| 127–131 | empty chart texts | `EmptyState`, same two messages |
| 158–168 / 199 | white session box | `<Pressable onPress=…><Card style={{ gap: spacing.xs }}>…</Card></Pressable>` |
| 162 / 164 | date / sets | `label` / `small` in `textSecondary` |
| 198 | axis 10 | unchanged |

### DS-4a: `src/components/workouts/*` and `RestTimeInput`

- **`ExerciseList.tsx`** (catalog, both pickers): search input → `backgroundColor: colors.background` (it has no fill today, so it would turn grey), `...typography.body`, `radius.md`, `padding: lg`, `marginBottom: md`. Wrap the `FlatList` in `<Card style={{ flexShrink: 1, gap: 0, paddingVertical: 0 }}>` so a short list hugs its rows and a long one scrolls. Rows: name → `label`, meta → `small`, `marginTop: xs`, no separator under the last row.
- **`ExercisePicker.tsx`** (also used by Progress): `container` → `surface`. Title → `heading`. "Cancel" → `body` in `primary`, `hitSlop` 12 → 14, `accessibilityRole="button"`. "Create custom exercise" → `Button` secondary, `marginBottom: md`. Padding / margins → `lg`.
- **`SwapExercisePicker.tsx`**: `container` → `surface`. Title → `heading` (`numberOfLines={1}` stays). Cancel as above. The similar-exercises `FlatList` in the same Card as `ExerciseList`. Empty → `EmptyState message="No similar exercises found. Tap Show all exercises below."`. Rows as in `ExerciseList`. "Show all exercises" → `Button` secondary, `marginTop: md`.
- **`CreateExerciseForm.tsx`** (catalog + picker): root `View` → `<Card style={{ gap: spacing.md, marginBottom: spacing.lg }}>` (one form = one topic, so its grey text and red error sit on white).
  - Strength/Cardio → `Chips` (`style={{ marginBottom: 0 }}`).
  - Movement chips stay hand-made (tap again to clear; `Chips` can't). `radius.full`, padding `sm` / `md`, text `small` in `textSecondary` / `onPrimary`.
  - "Movement (optional…)" label 13 → `labelSmall`, so it matches the two `LabeledInput` labels in the same form.
  - Error → `AppText` in `danger` + alert role + live region.
  - "Save Exercise" → `Button loading={isSaving}`. "Cancel" → `Button` secondary.
- **`src/components/RestTimeInput.tsx`** (also Profile → Workouts): "min"/"sec" → `AppText variant="small"` in `textSecondary`. Input `fontSize: 16` → `...typography.body`. No visible change.

### DS-4a: `docs/design-system.md`

- Shared pieces B and C rows (see table above). D in DS-4b.
- "Moving old screens over": add Workouts to the "So far … have moved" line (in DS-4b, once all of Workouts is done).

`workouts/_layout.tsx` is not touched.

## What must NOT change

- **Handlers, word for word:**
  - `active.tsx`: `handleFinish`, `handleDiscard`, `handleDone`, `handleUndo`, `handleDeleteSet`, `deleteSetEverywhere`, `handleSwap`, `handleRemoveExercise`, `updateDraft`, `suggestion`, `previousText`.
  - `index.tsx`: `handleStart`.
  - `[templateId].tsx`: `handleSave`, `handleDuplicate`, `handleToggleArchived`, `handleDelete`, `moveExercise`, `updateExercise`, `draftToTemplateExercises`.
  - `programs.tsx`: `handleAdd`. `log/[logId].tsx`: `openEdit`, `handleSaveSet`, `handleDeleteSet`, `refreshAfterEdit`, `handleDelete`. `CreateExerciseForm.tsx`: `handleCreate`.
  - Every `Alert.alert` title, text and button, including AU-4's. Every delete/discard still confirms.
- **Routes and params:** `/(tabs)/workouts/active` + `{ logId }`, `/(tabs)/workouts/${id}` and `/new`, `programs`, `exercises`, `exercises/${id}`, `log/${id}`; `router.replace` after Finish and Duplicate, `router.dismissTo('/(tabs)/workouts')`, `router.back()`; `_layout.tsx` titles and `anchor`.
- **Query keys:** `['workoutHistory', userId]`, `['workoutLog', logId]`, `['exerciseHistory']`, `['exerciseHistory', userId(, exerciseId)]`, `['workoutTemplates', userId]`, `['workoutTemplate', id]`, `['exercises', userId]`.
- **Offline queue:** `pendingSets.ts` usage, the 8 s timeout race, merging pending rows, and the "saved on your phone, sending when there is signal" words.
- **Loading/disabled logic:** `isStarting`, `isFinishing`, `savingKey`, `isSaving`, `addingId`, `saving`, `isEmptySet`; Start chips hidden during a workout. `Button loading` replaces each spinner one-for-one.
- **Set table and ✓ (#70):** columns and widths, green done row, green ✓ box, tap ✓ = save / again = undo, ✕ = delete with confirm, set number = warm-up toggle with its a11y label/hint, draft keys, `ExerciseCard` key.
- **Rest timer:** 250 ms tick, vibration, ±15 s, Skip, auto-close at 0, when it starts.
- **Words:** everything except the 4 rewritten empty messages.
- No file in `src/lib/` or `src/hooks/` changes.

## What the user will notice

- Every Workouts screen turns light grey, with the content in white rounded cards (like Food and Progress). The pickers too.
- Grey buttons ("New Routine", "+ Add Exercise", "Duplicate" …) become white with a thin outline, 48 dp tall.
- Finish Workout is a darker green. Home's green "Resume" gets the same darker green.
- Discard Workout, Delete Routine, Delete Workout and Delete set stay red text links (slightly bolder, 16/600). All still confirm.
- Set-table inputs get a slightly darker edge so they show on the white card.
- Text grows 1–2 dp (13/15 → 14/16). Rest countdown and summary numbers grow to 28. "Routines" / "History" grow to 20.
- Small taps get bigger: ↑ ↓ are spaced wider, summary set rows and "+ Add set" are taller, the rest-bar buttons are 48 tall.
- The empty texts say what to do next.
- On Programs, the other cards' buttons dim while one program is being added.

## Reuse

- `Button` (`loading`, `disabled`), `TextLink`, `AppText`, `EmptyState`, `Card`, `Chips`, `LabeledInput` from `src/components/`.
- `typography`, `spacing`, `radius`, `colors` from `src/theme.ts`.
- Error a11y pattern from DS-2 / `profile/password.tsx`. Modal-box-as-Card pattern from DS-3.
- Progress (`src/app/(tabs)/progress.tsx`) as the model for grey screen + Cards.

## Acceptance criteria

- [ ] Every Workouts screen and both pickers have a `surface` background (loading views too). Topic boxes are `Card`s; converted cards pass `gap: 0` unless the table says otherwise.
- [ ] No `small` / `caption` in `muted` sits directly on the grey screen or on `successBg`. Every `EmptyState` sits inside a Card.
- [ ] No hand-made full-width buttons left in scope. Compact ones kept on purpose: home "Start" chip, rest bar −15/+15/Skip, in-card text taps (Swap, Remove, + Add set, + Targets, + Rest time, ✕ Use default, Show archived, Cancel), ✓, ✕, ↑ ↓, movement chips.
- [ ] No red filled button in Workouts. Discard Workout, Delete Routine, Delete Workout, Delete set are `TextLink tone="danger"` with a 48 dp tap area, ≥ 12 dp below the button above, and still confirm.
- [ ] Finish Workout is `Button variant="success"` (white on #15803d). Home's Resume uses `successDark`.
- [ ] `labelSmall` exists in `typography` and the doc ladder, and is used for the record line, the Start chip, "Exercises" and the Movement label.
- [ ] Set-table inputs have a `borderStrong` edge, visible on the white card.
- [ ] Every row in the TalkBack and Tap targets tables is done (except ✓ / ✕ / set badge).
- [ ] Grep `fontSize|fontWeight` in scoped files finds only `...typography.body`, the ✓/↑↓ glyph styles (with the comment) and the axis label. No `fontWeight: '500'`.
- [ ] Grep `: (2|6|10|14|20|40)\b` in style blocks finds no spacing or radius. Widths/heights allowed.
- [ ] On 360 × 640, the set table shows all 6 columns, inputs ≈ 50 dp, nothing cut, the rest bar fits on one row.
- [ ] `docs/design-system.md` has `labelSmall`, `TextLink tone`, `success` + `successDark`, rule C, and Workouts in "moved".
- [ ] `npx tsc --noEmit` and `npx expo lint` pass.

## Test plan

- **Unit tests:** none. Style swaps and two one-line component options; no new logic.
- **Web** (`npx expo start --web --port 8081`, test account from `.env.test.local`, DevTools 360 × 640):
  - **DS-4a**
    - **Home:** grey screen, Routines and History in white cards, empty texts inside them. Start Empty Workout (spinner, no double tap), Show/Hide archived, the three secondary buttons.
    - **Routine:** New Routine → empty text in a card → Save with no name: dark-red error → add 2 exercises → ↑ ↓ (48 dp, end arrows disabled) → + Targets → + Rest time / ✕ Use default → Save. Open it → Duplicate → Archive → Unarchive → Delete Routine link (confirm). Delete the copies after.
    - **Programs:** cards on grey; add one (spinner, others dimmed). Archive/delete the new routines after.
    - **Summary** (open an old workout): stats card, set rows 48 tall → tap one → modal card → Normal/Warm-up chips → Save (dimmed when both boxes empty) → Delete set link (confirm) → Done. Delete Workout link (confirm, cancel it).
    - **Catalog / detail:** list in a card, search box white. + Custom Exercise → form card → Save empty: error → Cancel. Open an exercise → chips → chart or empty text → tap a session → summary.
    - **Pickers** (from Routine): Add Exercise picker list in a card, Cancel, Create custom. Swap picker (needs DS-4b's Active, or check on master's Active): short similar list hugs its rows; empty case → Show all exercises scrolls.
    - **Profile → Workouts:** default rest box unchanged. **Progress:** its exercise picker opens and works.
  - **DS-4b**
    - **Active:** grey screen, white exercise cards, table as wide as before. Add an exercise, Swap, Remove. Type kg/reps → ✓: green row, rest bar → −15 / +15 / Skip. ✓ again to undo. ✕ a set (confirm). Add a set. Toggle warm-up. Type "102.5" and check it fits. Inputs clearly outlined.
    - Offline (DevTools Network offline) → ✓: the "saved on your phone" line shows. Back online: it clears.
    - Discard Workout link: ≥ 12 dp under Finish, confirm, cancel it. Finish (dark green, spinner) → summary.
    - Home tab: Resume button is the darker green while a workout is open.
    - Re-check every AU-4 alert still fires (connection-error paths per #89's test notes).
  - The console has no errors. If a multi-button `Alert.alert` doesn't show on web, move those confirms to the phone list.
- **Phone list** (`phone-test` issues):
  - Set table and rest bar on a small phone with a large font size.
  - Rest-end vibration. Offline ✓ in airplane mode.
  - TalkBack: "Routines" / "History" / "Exercises" read as headings; ↑ ↓, rest bar, Swap/Remove, + Add set, Start, summary rows read their labels; form errors are read aloud.

## Risk

🔴 changes existing. It restyles every Workouts screen, including the active workout screen used mid-set, where a broken ✓, input or Finish button loses a workout. It changes shared pieces: `theme.ts`, `Button`, `TextLink`, `ExercisePicker` / `ExerciseList` (Progress uses them), `RestTimeInput` (Profile), one line of Home. And DS-4b merges on top of AU-4.

## Needs from the user

- Answer to Open question 1 before DS-4a is built (it decides the `TextLink` colour). Q2 only blocks the pickers part.
- Ships JS-only: `eas update`. No SQL, no new APK.

## UX/UI

Same screens, same flow, same words (except 4 empty texts). The look changes to grey screen + white cards. The per-file tables have the details; this covers what they don't.

### Flow

No change. Home → Start / Resume → Active → Finish → Summary → Done → Home. Home → routine / Programs / Catalog → back.

### Parts

- **Reused:** `Button` (primary / secondary / new `success`), `TextLink` (new `tone="danger"`), `AppText` (new `labelSmall`), `EmptyState`, `Card`, `Chips`, `LabeledInput`.
- **One primary per screen:** Home = Start Empty Workout / Resume. Active = Finish Workout (`success`, the green version of "the main action"). Routine = Save Routine. Summary = Done. Programs = one per card. Start chips are compact row actions.
- **Destructive = red link** at the bottom, ≥ 12 dp under the last button, always confirms.

### Contrast (WCAG AA, 4.5:1 for text)

| Text | On | Ratio | Result |
|---|---|---|---|
| `muted` (`small` / `caption`) | white card | 4.8 | ok |
| `muted` | grey screen | 4.4 | fails → `textSecondary` (9.4) for subtitles on grey |
| `muted` | green done row `successBg` | 4.4 | fails → done-row Previous in `textSecondary` |
| `muted` | grey record box (detail) | 4.4 | fails → `textSecondary` |
| `danger` #dc2626 | white card | 4.8 | ok (Remove, form error in a card) |
| `danger` | grey screen | **4.4** | fails → `dangerDark` (5.9) for links and errors on grey |
| `primary` | grey / white | 4.7 / 5.2 | ok |
| `warning` (offline, record line) | white card | 5.0 | ok |
| white on `success` #16a34a | | 3.3 | fails → `successDark` |
| white on `successDark` #15803d | | 5.0 | ok |
| rest bar text | dark bar | ≥ 7 | ok |

✓ and ✕ are icons (3:1) and pass. Input edges use `borderStrong`, the same as every other input.

### Set table at 360 dp (active)

- **Width:** 360 − 32 screen − 24 card padding = 304 dp (same as today). Previous ≈ 71 dp, each input ≈ 50 dp. "102.5" at 16 ≈ 40 dp: fits. "102.5 × 12" at 14 ≈ 65 dp: fits on one line.
- **Height:** draft row ≈ 47 dp, done row ≈ 45 dp, header ≈ 16 dp. Card gap 0, so rows don't spread out.
- **Rest bar:** ≈ 73 dp tall, buttons 48. "1:30" at 28 has ≈ 150 dp of room.

### Tap targets (48 dp)

| Control | Today | In DS-4 |
|---|---|---|
| Buttons, Chips, TextLinks | 40–48 | 48 / 44 through the bricks |
| Rest −15 / +15 / Skip | ≈ 37 | `minHeight: 48` |
| Swap / Remove (active) | ≈ 37 | `hitSlop` 13 top/bottom, 6 sides (they're 12 apart) |
| + Add set | ≈ 38 | `minHeight: 48` |
| Start chip | ≈ 38 | `hitSlop` 5 top/bottom |
| Show / Hide archived | ≈ 43 | `minHeight: 48` |
| ↑ ↓ (routine) | ≈ 28–32 | `minWidth` / `minHeight` 48 (no slop: they touch) |
| Remove (routine) | ≈ 36 | `minHeight: 48` |
| + Targets / + Rest time / ✕ Use default | ≈ 44 | `hitSlop` 14 |
| Picker "Cancel" | ≈ 46 | `hitSlop` 14 |
| Summary set rows | ≈ 22 | `minHeight: 48` (rows touch, so no slop) |
| ✓ 36×36, ✕, set badge | below 48 | unchanged → #70 |

### TalkBack

`Button`, `TextLink`, `Chips` label themselves. `heading` text gets the header role from `AppText`.

| Control | `accessibilityRole` / label |
|---|---|
| ⇄ Swap / Remove (active) | button, "Swap {exercise}" / "Remove {exercise}" |
| + Add set | button, "Add set to {exercise}" |
| −15 / +15 / Skip | button, "15 seconds less rest" / "15 seconds more rest" / "Skip rest" |
| ↑ / ↓ | button, "Move {exercise} up" / "Move {exercise} down", `accessibilityState={{ disabled }}` at the ends |
| Remove (routine) | button, "Remove {exercise}" |
| Start chip | button, "Start {routine}" |
| Show / Hide archived | button, `accessibilityState={{ expanded: showArchived }}` |
| Summary set row | button, hint "Edit set" |
| Picker "Cancel" | button |
| "Routines", "History" | header (via `heading`) |
| "Exercises" (routine) | `accessibilityRole="header"` on the `labelSmall` text |
| ✓ / ✕ / set badge | → #70 |

### States

- **Loading:** spinners unchanged, on a grey screen. Each button spinner becomes `Button loading`.
- **Empty:** the 4 `EmptyState` texts + the detail chart's two, all inside white cards. "No sets" stays `small`.
- **Error:** routine form error in `dangerDark` (on grey), create-exercise error in `danger` (in its card). Both read aloud. AU-4 alerts word for word.
- **Offline:** "N sets saved on your phone, sending when there is signal": `caption` in `warning` on the white card.

### Words

No changes, except these 4 empty texts:

- "No routines yet. Make one with New Routine, or pick one from Browse Programs."
- "No workouts logged yet. Start one above."
- "No exercises yet. Tap + Add Exercise to add one."
- "No similar exercises found. Tap Show all exercises below."

### Wireframe: Active on 360 dp

`░` = grey screen (`surface`). `┌─┐` = white Card. `[ ]` = input with `borderStrong` edge. `▣` = ✓ box.

```
┌────────────────────────────────┐
│░Push Day░░░░░░░░░░░░░░░░░░░░░░░│ heading 20
│░12:04 elapsed░░░░░░░░░░░░░░░░░░│ small, textSecondary (on grey)
│░┌────────────────────────────┐░│ Card, padding 12, gap 0
│░│ Bench Press  ⇄ Swap  Remove│░│ label / body primary / body danger
│░│ Target: 3 × 8 @ 60 kg      │░│ small muted (on white: ok)
│░│ Set Previous   kg   reps   │░│ caption
│░│ 1  60 × 8      60    8  ▣ ✕│░│ done row, green; Previous textSecondary
│░│[2] 60 × 8    [ 60 ][ 8  ]▣ ✕│░│ white inputs, darker edge, ≈ 47 dp
│░│          + Add set         │░│ label primary, 48 tall
│░└────────────────────────────┘░│
│░┌────────────────────────────┐░│
│░│       + Add Exercise       │░│ secondary (white, outline)
│░└────────────────────────────┘░│
│░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│ 24
│░██████ Finish Workout ████████░│ success: white on dark green #15803d
│░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│ 12
│░░░░░░░░ Discard Workout ░░░░░░░│ red link (dangerDark), 48 tap, confirms
├────────────────────────────────┤
│ [−15]     Rest     [+15]  Skip │ dark bar ≈ 73 dp, buttons 48
│           1:30                 │ title 28
└────────────────────────────────┘
```

### Wireframe: Workouts home

```
┌────────────────────────────────┐
│░██████ Start Empty Workout ███░│ primary
│░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│
│░Routines░░░░░░░░░░░░░░░░░░░░░░░│ heading 20 (header)
│░┌────────────────────────────┐░│ Card, gap 0
│░│ Push Day           (Start) │░│ label + chip (labelSmall)
│░│ 5 exercises                │░│ small muted (on white: ok)
│░│ ────────────────────────── │░│
│░│ Pull Day           (Start) │░│
│░│ 4 exercises                │░│ no line under the last row
│░│ Show archived (2)          │░│ small primary, 48 tall
│░└────────────────────────────┘░│
│░┌──────── New Routine ───────┐░│ secondary ×3
│░┌────── Browse Programs ─────┐░│
│░┌────── Exercise Catalog ────┐░│
│░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│
│░History░░░░░░░░░░░░░░░░░░░░░░░░│ heading 20
│░┌────────────────────────────┐░│
│░│ No workouts logged yet.    │░│ EmptyState inside the card
│░│ Start one above.           │░│
│░└────────────────────────────┘░│
└────────────────────────────────┘
```

### Wireframe: Summary bottom + edit-set modal

```
│░┌────────────────────────────┐░│      ┌▒▒▒▒▒▒▒ dimmed ▒▒▒▒▒▒▒▒┐
│░│ Bench Press                │░│      ▒┌──────────────────────┐▒
│░│ Set 1: 60 kg × 8  ✎        │░│ 48   ▒│ Edit set 1           │▒ label
│░│ Set 2: 60 kg × 8  ✎        │░│ 48   ▒│ (Normal) (Warm-up)   │▒ Chips
│░└────────────────────────────┘░│      ▒│ Weight (kg) [ 60   ] │▒
│░████████████ Done █████████████│      ▒│ Reps        [ 8    ] │▒
│░░░░░░░░░ Delete Workout ░░░░░░░│ link ▒│ ███████ Save ███████ │▒
                                         ▒│     Delete set       │▒ red link
                                         ▒└──────────────────────┘▒
```

## Open questions

None.

## Out of scope

- `Button size="sm"`. Compact buttons stay hand-made until a ticket adds it.
- Redesigning ✓ and the set table, and sizing / labelling ✓ / ✕ / set badge (#70).
- Moving Home tab's buttons onto `Button` (only the Resume colour changes here). Home tab's own DS ticket.
- `TextLink` for in-card links like "+ Add set" (it would make the cards taller). `TextLink`'s TalkBack role stays "link" for the danger tone.
- `LabeledInput`'s own raw 14/600 label, `Chips` internals, `rgba(0,0,0,0.4)` backdrop token (with the Food DS ticket).
- An empty state for "no search results" in `ExerciseList`. The faint ✎ glyph on summary rows.
- Dark mode, wording changes beyond the 4 empty texts, any logic, route or data change.
