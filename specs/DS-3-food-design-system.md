# DS-3 – Design system: migrate Food screens

Issue: jjerner/FitTracker#65

## Goal

Move the 8 Food screens (diary, search, food detail, quick add, recipe, saved meals, custom food, scan) onto `Button`, `Card`, `EmptyState`, `TextLink`, `AppText` and the theme tokens, following `docs/design-system.md`. What the screens do stays exactly the same.

## Build order

AU-6 (#91, removes the duplicate `addDays` in `food/index.tsx`) and AU-7 (#92, shared `sumEntries` for the totals in `home.tsx` and `food/index.tsx`) are being built on other branches right now. **Build DS-3 only after both have merged, and branch from (or rebase onto) that master.** DS-3 does not touch `addDays`, `formatDay`, the `totals` / `sums` reduces or `home.tsx`. Line numbers below are from master `451d7be`, so they will shift a bit in `index.tsx` after the rebase.

Two PRs from this one spec, in this order:

- **DS-3a** = shared pieces (below) + diary (`food/index.tsx`) + food detail (`food/food/[foodId].tsx`) + the doc lines for the shared pieces and glyphs.
- **DS-3b** = search, quick add, recipe, saved meals, custom food, scan + the "Food has moved" doc line.

## Decisions (2026-10-21)

Food:

1. **Grey screen, white cards on every Food screen except scan** (the camera). Diary, food detail and recipe (Q1), and by rule A also search, quick add, custom food and saved meals: forms and result lists go in white `Card`s. Inputs and `danger` text sit on white only.
2. **Glyph icons** (‹ › + ✕ ✓ ★ ☆ ▾ ▸) keep today's sizes. One exception line goes into `docs/design-system.md`.
3. **"Scan Barcode"** = `primary` (blue).
4. **Two PRs**, DS-3a then DS-3b (see Build order).
5. **Fix now:** diary food rows and save-as-meal tick rows 48 dp, every ✕ (and saved-meals Edit) in a 48 dp box, `subtle` text/icons → `muted`, TalkBack labels and expanded state.

App-wide (all DS tickets; the first one built adds the shared piece, later ones reuse it):

- **A.** One look everywhere: grey `surface` screen + white `Card`s/groups on Food, Workouts, Progress and Profile.
- **B.** New text step `labelSmall` = 14/600 in `colors.text`, for field labels, table numbers and the active tab. Food's 14/600 field labels use it, so they match `LabeledInput` and Goals.
- **C.** Destructive actions are quiet red text links, not red filled buttons: `TextLink tone="danger"`, still 48 dp, and every delete still asks to confirm. The only exception in the app is the Delete account screen's main button.
- **D.** New `success` variant on `Button`: dark green #15803d with white text (about 5:1). Food doesn't use it.

## Shared pieces (DS-3a; add each one only if it is not already on master when this is built)

| Piece | Where | What |
|---|---|---|
| B `labelSmall` | `src/theme.ts` `typography` | `labelSmall: { fontSize: 14, fontWeight: '600', color: colors.text }`. `AppText` picks it up through `keyof typeof typography`, so no code change there. |
| B | `docs/design-system.md` ladder table | row `labelSmall` · 14 / 600 · "field labels, table numbers, active tab" |
| C `tone="danger"` | `src/components/TextLink.tsx` | optional `tone?: 'primary' \| 'danger'` (default `primary`); `danger` sets the label colour to `colors.dangerDark` (#b91c1c, about 5.9:1 on grey and 6.5:1 on white, so it works on both). Tap area, role and states unchanged. |
| C | `docs/design-system.md` | `TextLink` row: mention `tone="danger"`. "Destructive actions": deletes and removes are `TextLink tone="danger"` and always confirm first; a red `danger` `Button` is only for the Delete account screen's main button. The danger link uses `dangerDark`, so it reads on grey and white; plain `danger` error text still sits on white only (4.4:1 on grey). |
| D `success` | `src/theme.ts` `colors` + `src/components/Button.tsx` `variants` | new token `successDark: '#15803d'` (next to `dangerDark`; the existing `success` #16a34a is too light for white text). Variant `success: { backgroundColor: colors.successDark, color: colors.onPrimary, borderColor: colors.successDark }`. Doc `Button` row lists it. |

## Today

- 12 hand-made `Pressable` buttons (Save ×5, Log, Grant Access, "+ Add ingredient", "New recipe", "Saved meals", "Custom food", and a black "Scan Barcode"), plus 9 hand-made text links.
- Every Food screen is white. The diary has **grey** (`surface`) boxes; food detail's preview and recipe's totals are grey boxes too. `Card` is the opposite: a white box on a grey screen, like Progress.
- 3 modal boxes look exactly like `Card` but are hand-made. 2 "nothing here" texts are hand-made.
- Raw `fontSize` everywhere (13, 14, 15, 16, 17, 20) plus glyphs at 14–28. Weight 500 on row names.
- Off-scale values: radius 20 (meal chips, ×3 files) and 14 ("+"), spacing 40, 20, 14, 10, 2.
- Icon-only taps on the diary (‹ › ✕ +) have no TalkBack label. ✕, empty ☆, "Nothing logged" and unticked rows use `subtle` (2.5:1).

## UX/UI

**Flow.** Unchanged. Every route, param, button text and confirm dialog stays the same.

**Grey screen + white cards** (every Food screen except scan). Inputs, `small` (`muted`) and `danger` text only ever sit on white. Text that has to stay on the grey screen uses `textSecondary`. Full-width `Button`s sit on the grey screen, above or below the cards.

```
Diary (grey)                      Food detail (grey)               Recipe (grey)
   ‹        Today        ›        ┌───────────────────────┐        ┌───────────────────────┐
┌─────────────────────────────┐   │ Oats              ☆   │        │ Name / Portions       │ Card
│   ( ring )  Carbs Prot Fat  │   │ Brand                 │ Card 1 └───────────────────────┘
└─────────────────────────────┘   │ (Grams)(1 cup)        │        ┌───────────────────────┐
┌─────────────────────────────┐   │ Add serving size      │        │ Ingredients           │ Card
│ Breakfast       420 kcal (+)│   │ Delete this serving   │ ← red  │ Oats [40] g 150 kcal ✕│
│ P 20 g · C 50 g · F 10 g    │   └───────────────────────┘        │ [  + Add ingredient  ]│
│ Oats             300 kcal ✕ │   ┌───────────────────────┐        └───────────────────────┘
│ Save as meal                │   │ Amount (grams) [100]  │ Card 2 ┌───────────────────────┐
└─────────────────────────────┘   │ Meal (B)(L)(D)(S)     │        │ 600 kcal in total     │ Card
                                  │ 389 kcal              │        │ 150 kcal per portion  │
                                  │ P 17g · C 66g · F 7g  │        └───────────────────────┘
                                  └───────────────────────┘        [▓▓▓▓▓▓▓ Save ▓▓▓▓▓▓▓▓]
                                  [▓▓▓▓ Add to Diary ▓▓▓▓]

Search (grey)                     Quick add / Custom food (grey)   Saved meals (grey)
[ Search foods...     ] ← white   ┌───────────────────────┐        [     New recipe      ]
[▓▓▓▓ Scan Barcode ▓▓▓▓]          │ (hint, custom food)   │ Card   ┌───────────────────────┐
[Saved meals][Custom food]        │ Name (optional) [   ] │        │ Log to (B)(L)(D)(S)   │ Card
┌───────────────────────┐         │ Calories (kcal) [   ] │        └───────────────────────┘
│ MY FOODS              │ Card    │ P [  ] C [  ] F [  ]  │        ┌───────────────────────┐
│ Oats     389 kcal/100g│ (only   │ Meal (B)(L)(D)(S)     │        │ Pancakes   Add Edit ✕ │ Card
│ BASIC                 │ when    │ (error, red)          │        │ Smoothie   Add Edit ✕ │ (list or
│ Banana    89 kcal/100g│ results)└───────────────────────┘        └───────────────────────┘ EmptyState)
└───────────────────────┘         [▓▓▓▓ Add to Diary ▓▓▓▓]
```

The food-detail preview and recipe totals lose their grey box: they become plain lines in a white card. A search error shows in its own small `Card`, so the red text is on white. Long lists (search results, saved meals) scroll inside their card.

**Buttons.** One `primary` per screen = the save/log action, plus "Scan Barcode" on Search. Other full-width actions = `secondary`. Small in-row things (round "+", ✕, "Edit", ★, chips) stay hand-made ("no small button size yet").

**Links.** Hand-made text links become `TextLink`. Left-aligned ones get `style={{ alignSelf: 'flex-start' }}` (layout only). "Delete this serving" is `TextLink tone="danger"`; its confirm `Alert` stays.

**Text mapping** (every file):

| Today | After |
|---|---|
| 17/600 (day label, modal titles), 16/600 (meal title) | `label` (16/600) |
| 15/500 row names (search, recipe, saved meals) | `label` |
| 15/400 (diary entry name, kcal, scan hint, modal preview) | `body` (16), colour kept where it isn't `text` |
| 14/600 field labels ("Name (optional)", "Meal", "Log to", "Ingredients", "Amount (grams)", quick-add labels) | `labelSmall` (14/600, same as today, matches `LabeledInput`) |
| 13 or 14 grey secondary text | `small` (14, `muted`), on white only |
| 14 grey text that stays on the grey screen (recipe `missing` hint) | `small` + `style={{ color: colors.textSecondary }}` |
| 20/700 big numbers (food name, preview kcal, recipe total) | `heading` (20/600) |
| Search section headers 13/600 uppercase | `small` + `textTransform: 'uppercase'` |
| Errors with no size (14) | `body` in `danger`, inside a `Card` |
| `colors.subtle` text and glyphs | `muted` |
| Glyphs ‹ › + ✕ ✓ ★ ☆ ▾ ▸ | keep today's size (doc exception) |
| `TextInput` `fontSize: 16` / `padding: 14` | stay (recipe amount 15 → 16) |

**States.** Spinners stay (padding 40 → `spacing.xxl`). Saved meals list and recipe ingredients use `EmptyState`. Errors stay plain text. The custom-food error gets `accessibilityRole="alert"` + `accessibilityLiveRegion="polite"`, as in DS-2.

**What testers will notice:**
- Every Food screen except scan turns grey with white cards. Food detail's preview and recipe's totals are no longer grey boxes.
- Most text is 1–2 dp bigger (13 → 14, 15 → 16). Row names get bolder (500 → 600). Field labels look the same.
- "Save as meal", "Copy previous day", "Go to today", the serving links and modal "Cancel" become blue 16/600 links with a bigger tap area ("Cancel" was grey). "Delete this serving" turns from grey to red.
- "Saved meals", "Custom food", "+ Add ingredient", "New recipe" go from blue outline/blue text to grey outline/black text.
- "Scan Barcode" turns from black to blue.
- Diary food rows get taller (about 37 → 48 dp). ✕ and empty ☆ turn a darker grey.

**Tap targets** (48 dp):

| Control | Today | After |
|---|---|---|
| Diary ‹ › | about 50 | unchanged |
| Diary day label | about 39 tall | `minHeight: 48` + `justifyContent: 'center'` |
| Diary round "+" | 44 | `hitSlop` 8 → 10 = 48 |
| Diary ✕, food rows, save-as-meal tick rows | ✕ about 38 × 41, rows 37–40 | rows `minHeight: 48`; ✕ in a 48 × 48 box |
| Recipe ✕, saved-meals Edit / ✕ | 44 × 44 | 48 × 48 |
| Links → `TextLink`, buttons → `Button` | 35–48 | 48 |
| Meal / serving chips | about 37 | **Out of scope** (`Chips` ticket) |

**TalkBack.** `Button` reads "…, button", `TextLink` "…, link". Plus:

- ‹ = "Previous day", › = "Next day" (› reads "disabled" on today). Day label = `` `${dayLabel}, choose a date` ``.
- "+" = `` `Add food to ${MEAL_LABELS[mealType]}` ``. ✕ = `` `Delete ${entry.foodName}` `` / `` `Delete ${name}` ``.
- Meal header and saved-meal group row: `accessibilityRole="button"` + `accessibilityState={{ expanded: isOpen }}`.
- Diary food rows: `accessibilityRole="button"`.

**Contrast** (AA: 4.5 text, 3 icons):

| Colour | On white | On grey `surface` |
|---|---|---|
| `text` #111827 | 17.7 | 16.1 |
| `textSecondary` #374151 | 10.3 | 9.4 |
| `muted` #6b7280 (`small`, placeholders) | 4.8 | **4.4, fails** → white only |
| `danger` #dc2626 | 4.8 | **4.4, fails** → white only |
| `primary` #2563eb | 5.2 | 4.7 |
| `subtle` #9ca3af | **2.5, fails** | **2.3, fails** → removed from text and glyphs |

The scan hint and error sit on the live camera. Not changed; phone test.

## Files to touch

Only off-scale values change. On-scale raw numbers (4, 8, 12, 16, 24, 32, radius 8/12) stay.

### DS-3a

Shared pieces: `src/theme.ts`, `src/components/TextLink.tsx`, `src/components/Button.tsx`, `docs/design-system.md` (see Shared pieces). Also in the doc, under the ladder "Exception" line: "and glyph icons (‹ › + ✕ ✓ ★ ☆ ▾ ▸) until the app has an icon set".

#### `src/app/(tabs)/food/index.tsx` (diary)

| Line(s) | Today | After |
|---|---|---|
| 137–145 | ‹ › and day-label `Pressable`s, no labels | labels + `accessibilityRole="button"` (TalkBack above). Day label → `label`; its `Pressable` gets `minHeight: 48`, `justifyContent: 'center'` |
| 156, 184 | modal box `Pressable style={modalCard}` | `<Pressable>` with no style (still swallows taps) around `<Card>` |
| 164–172 | "Go to today" link | `<TextLink title="Go to today" onPress={…same…} />` |
| 185 | modal title 17/600 | `label`; drop `marginBottom: 12` (Card gap) |
| 193, 539 | `saveList marginTop: 8` | drop (Card gap) |
| 207–212 | entry name / kcal 15, unticked `subtle` | `body` (kcal keeps `textSecondary`); unticked → `muted`; tick rows `minHeight: 48` |
| 217–230 | hand-made Save | `<Button title="Save" onPress={handleSaveMeal} disabled={!mealName.trim() \|\| selected.length === 0} loading={isSavingMeal} />` |
| 236, 522 | spinner `paddingVertical: 40` | `spacing.xxl` |
| 287–294 | totals grey box | `<Card style={{ gap: spacing.lg, marginBottom: spacing.lg }}>` |
| 311 | meal grey box, padding 14 | `<Card style={{ marginBottom: spacing.md }}>` |
| 319, 321, 325, 330 | meal title 16/600, kcal 14, macros 13 (`marginTop: 2`), "Nothing logged" `subtle` | `label`, `small`, `small` (`marginTop: spacing.xs`), `small` |
| 334–336 | "Copy previous day" link | `<TextLink title="Copy previous day" onPress={…} disabled={isCopying} />` |
| 338–346 | round "+" (radius 14) | radius → `radius.full`, `hitSlop` 10, role + label |
| 349, 582 | `mealBody marginTop: 8` | drop (Card gap) |
| 370–372 | "Save as meal" link | `<TextLink title="Save as meal" onPress={…} style={{ alignSelf: 'flex-start', marginLeft: -spacing.md }} />` |
| 313–317, 431 | meal header, group row | `accessibilityRole="button"` + `accessibilityState={{ expanded: isOpen }}` |
| 463 | food row `Pressable` | `accessibilityRole="button"` |
| 432–435, 492–493 | names / kcal 15 | `body` (kcal keeps `textSecondary`) |
| 437–447, 495–505, 589–600 | ✕ `subtle` + `hitSlop 10`; `entryRow paddingVertical: 8` | ✕ `Pressable` `minWidth: 48, minHeight: 48`, centred, no `hitSlop`, `muted`, role + label; `entryRow minHeight: 48` |
| 511, 554 | container white, `paddingBottom: 40` | `colors.surface`; `spacing.xxl` |
| 509–609 | styles | remove styles the swaps make unused |

#### `src/app/(tabs)/food/food/[foodId].tsx` (food detail)

| Line(s) | Today | After |
|---|---|---|
| 421 | container white | `colors.surface` |
| 274–364 | name, star, brand, serving chips, serving links | wrap in `<Card>` (card 1) |
| 366–401 | amount, meal, preview | wrap in `<Card style={{ marginTop: spacing.md }}>` (card 2) |
| 275 | name 20/700 | `heading` |
| 283, 426 | ★ / empty ☆ `subtle` | size kept; empty ☆ → `muted` |
| 286, 428 | brand 14, `marginTop: 2` | `small`, `marginTop: spacing.xs` |
| 291–307, 381–386, 444 | chips radius 20 | `radius.full` |
| 328–333, 338–357 | "Save serving size", "Cancel", "Add serving size", "Edit default serving" | `TextLink` each, same handlers. Row `marginLeft: -spacing.md`, `gap: 0` |
| 358–362 | "Delete this serving" (grey) | `<TextLink title="Delete this serving" tone="danger" onPress={handleDeleteServing} />` |
| 366, 376 | labels 14/600 | `labelSmall` |
| 393–401, 452–453 | grey `previewCard` box; kcal 20/700, macros 14 | drop the box; `heading`; `small` |
| 403–415 | hand-made Save | `<Button title={…same ternary…} onPress={handleSave} disabled={recipeBlocked} loading={isSaving} style={{ marginTop: spacing.xl }} />` |

### DS-3b

#### `src/app/(tabs)/food/search.tsx`

| Line(s) | Today | After |
|---|---|---|
| 224 | container white | `colors.surface` |
| 151–157, 225–232 | search input, no background | add `backgroundColor: colors.background` to `input` (white on grey) |
| 159–164 | black "Scan Barcode" | `<Button title="Scan Barcode" onPress={…same…} style={{ marginBottom: spacing.md }} />` |
| 166–181 | 2 outline shortcuts | `<Button variant="secondary" style={{ flex: 1 }} …/>` ×2 |
| 183 | error (14) on screen | `<Card style={{ marginBottom: spacing.md }}>` around `body` in `danger` |
| 186–218 | `SectionList` on screen | `{sections.length > 0 ? <Card style={{ flexShrink: 1 }}>…</Card> : null}` around it, so no empty white box before results and long lists scroll inside |
| 192 | section title 13/600 uppercase | `small` + uppercase |
| 203, 205, 211 | name 15/500, brand 13, kcal 13 | `label`, `small`, `small` |

#### `src/app/(tabs)/food/quick-add.tsx`

| Line(s) | Today | After |
|---|---|---|
| 157 | container white | `colors.surface` |
| 84–139 | labels, inputs, meal chips | wrap in `<Card>` |
| 84, 87, 98, 107, 116, 126 | labels 14/600 | `labelSmall` |
| 130–137, 174 | chips radius 20 | `radius.full` |
| 141–151 | hand-made Save | `<Button title={entryId ? 'Save changes' : 'Add to Diary'} onPress={handleSave} disabled={!isValid} loading={isSaving} style={{ marginTop: spacing.xl }} />` (below the card) |

#### `src/app/(tabs)/food/recipe.tsx`

| Line(s) | Today | After |
|---|---|---|
| 250 | `flex` white | `colors.surface` |
| 171–183 | Name + Portions | wrap in `<Card>` |
| 185–221 | Ingredients label, rows, "+ Add ingredient" | wrap in `<Card style={{ marginTop: spacing.md }}>` |
| 60 | "Couldn't load this recipe." | `body` (an error, not `EmptyState`) |
| 185 | "Ingredients" 14/600 | `labelSmall` |
| 186–188 | empty text | `<EmptyState message="No ingredients yet. Tap + Add ingredient." />` |
| 191, 200, 203 | name 15/500, unit 13, kcal 13 | `label`, `small`, `small` |
| 210, 276–277 | ✕ `subtle`, 44 × 44 | `muted`, 48 × 48 |
| 270 | amount `fontSize: 15` | 16 (check it fits width 72) |
| 216–221 | "+ Add ingredient" | `<Button title="+ Add ingredient" variant="secondary" … />` |
| 223–228, 288–289 | grey `totalsCard`; total 20/700, per portion 14 | `<Card style={{ marginTop: spacing.md }}>`; `heading`; `small` |
| 230 | `missing` hint 14 muted (on grey now) | `small` + `textSecondary`, centred |
| 231–243 | hand-made Save | `<Button title="Save" onPress={handleSave} disabled={!canSave} loading={isSaving} style={{ marginTop: spacing.md }} />` |

#### `src/app/(tabs)/food/saved-meals.tsx`

| Line(s) | Today | After |
|---|---|---|
| 224 | container white | `colors.surface` |
| 98–104 | "New recipe" outline | `<Button title="New recipe" variant="secondary" … style={{ marginBottom: spacing.lg }} />` |
| 113, 114 | modal box, title 17/600 | `<Pressable>` around `<Card>`; `label`, no `marginBottom` |
| 126 | preview 15 `textSecondary` | `body` + `textSecondary` |
| 132–142 | hand-made Log | `<Button title="Log" disabled={!(eatenNumber > 0) \|\| !!busyId} onPress={…same…} />` |
| 143–145 | grey "Cancel" | `<TextLink title="Cancel" onPress={() => setAskingMeal(null)} />` |
| 150–163 | "Log to" + chips | wrap in `<Card style={{ marginBottom: spacing.md }}>`; drop `mealRow marginBottom` (228) |
| 150 | "Log to" 14/600 | `labelSmall` |
| 155, 232 | chips radius 20 | `radius.full` |
| 166, 226 | spinner padding 40 | `spacing.xxl` (stays on grey, outside the card) |
| 168–217 | `FlatList` on screen | wrap in `<Card style={{ flexShrink: 1 }}>` (list or empty state inside; scrolls inside) |
| 171–176 | empty text | `<EmptyState message="No saved meals yet. Tap &quot;New recipe&quot; above, or on the diary tap &quot;Save as meal&quot; on a meal." />` |
| 189, 190, 197, 205 | name 15/500, sub 13, "Add" 15/600, "Edit" 14 | `label`, `small`, `label` + `primary`, `small` + `primary` |
| 213, 252, 254 | ✕ `subtle`, `iconButton` 44 × 44 | `muted`, 48 × 48 |

#### `src/app/(tabs)/food/custom-food/new.tsx`

| Line(s) | Today | After |
|---|---|---|
| 154 | `flex` white | `colors.surface` |
| 81–135 | hint, inputs, error | wrap in `<Card>` |
| 81–83 | hint 14 muted | `small` |
| 135 | error (14) | `body` `danger` + `accessibilityRole="alert"` + `accessibilityLiveRegion="polite"` (inside the card) |
| 137–147 | hand-made Save Food | `<Button title="Save Food" onPress={handleSave} disabled={!isValid} loading={isSaving} style={{ marginTop: spacing.md }} />` (below the card) |

#### `src/app/(tabs)/food/scan.tsx`

| Line(s) | Today | After |
|---|---|---|
| 52 | permission text 16 | `body`, centred |
| 53–55 | "Grant Access" | `<Button title="Grant Access" onPress={requestPermission} />` |
| 73, 75 | hint 15 white, error 14 `dangerLight` | `body` + `onPrimary`; `small` + `dangerLight` |

#### `docs/design-system.md`

- "Moving old screens over": add **Food** to the "So far … have moved" line.

## Must NOT change

- **Handlers:** `copyMeal`, `handleSaveMeal`, `openSaveMeal`, `toggleExcluded`, `toggle`, `groupEntries`, `handleSelect`, the search debounce `useEffect`, `toggleFavourite`, `selectOption`, `handleSaveServing`, `handleDeleteServing`, every `handleSave`, `handleLog`, `confirmDelete`, `handleScanned`, `requestPermission`, recipe's `edit` / `setAmount` / `removeRow` / `usePreventRemove` / `useFocusEffect`.
- **Confirm dialogs:** delete entry, delete meal group, delete serving, delete saved meal, and recipe's "Discard changes?" (including the web `window.confirm` branch).
- **Routes and params:** every `router.push` / `replace` / `dismissTo` string and params object. `_layout.tsx` and the `Stack.Screen` title overrides are untouched.
- **Query keys and invalidations:** `['foodDiary', uid, date]`, `['savedMeals', uid]`, `['recentFoods', uid]`, `['favouriteFoods', uid]`, `['food', foodId]`, `['foodServings', uid, foodId]`.
- **Loading / disabled logic:** same conditions, moved into props. `disabled={X || isSaving}` becomes `disabled={X} loading={isSaving}`. Meal header `disabled={mealEntries.length === 0}`, next-day `disabled={isToday}`, star `disabled={!favourites}`, search row and saved-meal row disabled + per-row spinners, every `isLoading` branch stay as they are.
- **Lists:** `SectionList` / `FlatList` props (`keyboardShouldPersistTaps`, `stickySectionHeadersEnabled`, keys, renderers) stay; they only get a `Card` around them.
- **Words:** every visible string, placeholder and existing `accessibilityLabel`.
- **Shared components:** `CalorieRing`, `MacroBar`, `MonthCalendar`, `Chips`, `LabeledInput`, `Card` are not edited. `TextLink` and `Button` only gain the new options; their defaults look and behave as today.

## Reuse

- `Button`, `TextLink`, `Card`, `EmptyState`, `AppText` from `src/components/`; `colors`, `spacing`, `radius`, `typography` from `src/theme.ts`.
- The error live-region pattern from DS-2 / `profile/password.tsx`.
- Progress (`src/app/(tabs)/progress.tsx`) as the model for a grey screen with `Card`s.

## Acceptance criteria

- [ ] Shared pieces exist (added here or already on master): `typography.labelSmall` 14/600 `text`; `TextLink tone="danger"` (red, 48 dp, role link); `Button variant="success"` on `colors.successDark` #15803d; all three in `docs/design-system.md` with the destructive-action rule and the glyph exception.
- [ ] The 12 listed buttons are `Button` and the 9 listed links are `TextLink`. "Scan Barcode" is `primary`.
- [ ] "Delete this serving" is `TextLink tone="danger"` and still asks to confirm.
- [ ] Every Food screen except scan has a `surface` screen. Forms, result lists and grouped content are in white `Card`s; no grey box is left.
- [ ] No input, `small` (`muted`) or `danger` text sits directly on the grey screen (the search input has a white background; errors are inside a card).
- [ ] Search shows no empty white card before there are results. Search results and saved meals scroll inside their card.
- [ ] Field labels ("Name (optional)", "Meal", "Log to", "Ingredients", "Amount (grams)", quick-add labels) use `labelSmall`.
- [ ] `grep -nE "fontSize|fontWeight" src/app/(tabs)/food` finds only `TextInput` styles (16) and glyphs.
- [ ] No `borderRadius: (14|20)`, no `40` / `20` / `10` / `2` spacing, no `#hex`, no `colors.subtle` on text or glyphs in the food files.
- [ ] Saved meals' empty list and recipe's empty ingredients use `EmptyState`; loading still shows a spinner.
- [ ] Every tap in the food files except the chips is at least 48 dp. Diary ‹ › day label "+" ✕ have TalkBack labels; meal headers and saved-meal groups say "collapsed" / "expanded".
- [ ] Every flow works as before: day ‹ › and calendar, "Go to today", search → food → Add to Diary, edit an entry, edit a quick-add entry, delete entry / group, copy previous day, save as meal, saved meals log (with the portions popup), new / edit recipe (with discard-changes), custom food, favourite star, add / edit / delete serving.
- [ ] Save buttons show a spinner while saving and can't be double-tapped; disabled ones are dimmed.
- [ ] `npx tsc --noEmit` and `npx expo lint` pass.

## Test plan

- Unit tests: none. Style swaps and two style-only component options, no new logic.
- Web (`npx expo start --web --port 8081`, test account from `.env.test.local`):
  - **DS-3a, diary:** grey screen, white cards. ‹ › change the day, › dimmed on today, calendar and "Go to today" work. Open a meal; food rows are 48 dp; tap an entry → food detail with the amount filled in. "Copy previous day". "Save as meal": untick a row, Save dimmed with an empty name, saving shows the spinner, the meal appears in Saved meals.
  - **DS-3a, food detail:** grey screen, two white cards. Change amount, chips and meal; star on/off; add a serving, then "Delete this serving" shows red (the `Alert` confirm has no buttons on web: phone test). Add to Diary lands on the diary.
  - **DS-3a, shared:** a `TextLink` without `tone` still looks blue on Auth screens; the Auth `Button`s look as before.
  - **DS-3b, search:** grey screen, white search box, no white card until results show. "banana" shows My / Basic results in one card with grey 14 brand/kcal; a long list scrolls inside the card and the buttons above stay put. "Saved meals", "Custom food" open; "Scan Barcode" (blue) opens scan (web shows only "Grant Access").
  - **DS-3b, quick add** (`http://localhost:8081/food/quick-add`): form in one card, Add to Diary below it, dimmed until kcal is entered.
  - **DS-3b, recipe:** three cards, empty state, "+ Add ingredient" → pick → Add to Recipe → change amount → Save; back with changes asks "Discard changes?".
  - **DS-3b, saved meals:** "Log to" card + list card; empty state inside the card; with several meals the list scrolls inside the card; log a 1-portion meal, portions popup for a recipe, Cancel.
  - **DS-3b, custom food:** form in one card, Save Food below, dimmed until the 5 fields are filled; the error (if shown) is red on white.
  - 360 px wide: diary meal header with "Copy previous day", quick-add macro row and the recipe amount box don't overflow. Console has no errors.
- Phone (one `phone-test` issue each):
  - Scan: camera, "Grant Access", barcode found / not found → custom food; hint readable over a bright label.
  - Delete entry, group and serving confirms (Alert).
  - TalkBack: ‹ › "+" ✕ labels, links as "…, link", "Delete this serving" as a link, collapsed/expanded, custom-food error.
  - Large font size: diary meal headers and search shortcuts wrap without cutting text. With the keyboard open on quick add / custom food, Save can still be reached by scrolling.
  - Branded (Open Food Facts) search results.

## Risk

🔴 changes existing. It restyles all 8 Food screens (the diary is used daily), swaps the button on every save path, wraps the search and saved-meals lists in cards, and edits shared code (`theme.ts`, `TextLink`, `Button`). A wrong `disabled` / `loading` mapping could block logging or log twice.

## Needs from the user

- Ships JS-only: `eas update`. No SQL, no new APK, no migration.
- Wait for AU-6 (#91) and AU-7 (#92) to merge first.

## Open questions

None.

## Out of scope

- `CalorieRing`/`MacroBar`, `MonthCalendar`, `Chips`, `LabeledInput`: shared with other tabs, their own DS ticket. `TextInput` padding 14 / fontSize 16 follows `LabeledInput` until then.
- Swapping hand-made chip rows for `Chips`, or label + input pairs for `LabeledInput` (dedupe, not design-system).
- A `size="sm"` button for the round "+", "Edit" and ✕.
- Meal / serving chips under 48 dp: goes with the `Chips` ticket.
- `rgba(0,0,0,0.4)` modal backdrops: a `colors.backdrop` token covers Workouts too, so separate ticket.
- The scan screen's look (camera, black background).
- An empty state for a search with no results (new behaviour), rewording texts, turning on-scale raw numbers into token names.
- Using the new `success` button anywhere in Food.
- Dark mode, and anything in AU-6 / AU-7 (`addDays`, totals, `home.tsx`).
