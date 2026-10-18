# F6 – Recipe from a cooked batch (ingredients + portions)

Source: GitHub issue jjerner/FitTracker#10, `beta_test_feedback_2026-10-17.md` lines 16–21.

## Goal

A new Recipe screen lets the user build a list of ingredients and say how many portions it made (e.g. pancake batter = 12). Nothing goes into the diary while building it. Logging it asks "How many portions? (of 12)" and logs that share of every ingredient.

## Design

- A recipe is a saved meal with a new `portions` column. Normal saved meals have `portions = 1` and work as today.
- Saved meals gets a "New recipe" button at the top and an "Edit" link on every row. Both open `food/recipe`, the new screen (with `?id=` when editing).
- "+ Add ingredient" opens the normal search with `?recipe=1`. The param is passed on through search, scan and custom food to the food detail page. In recipe mode the detail page hides the meal chips, its button says "Add to recipe", and it puts `{ food, quantity, quantityUnit, servingG }` into the recipe draft instead of logging.
- **How the draft is passed: a tiny in-memory module** (`src/lib/recipeDraft.ts`), not route params. Sending a whole food plus an amount back through params means serializing and parsing it, and the app would have to guard against adding it twice on re-render. With the module, the detail page calls `addPendingRecipeItem(item)` and then `router.dismissTo('/(tabs)/food/recipe')`. The Recipe screen calls `takePendingRecipeItems()` in `useFocusEffect` and adds them to its own `items` state. The draft itself stays in the Recipe screen's state.
- Saving a new recipe inserts a saved meal plus its items. Saving an existing one updates `name`/`portions` and replaces the items. Old diary entries are untouched because they are copies.
- **Normal saved meals can be edited with the same screen.** It costs nothing extra, since it is the same data with portions = 1.

## Files to touch

- `supabase/migrations/0016_saved_meal_portions.sql` (new)
  - `alter table public.saved_meals add column portions numeric not null default 1 check (portions > 0);`
- `src/types/domain.ts`: `SavedMeal` gets `portions: number`.
- `src/lib/recipeDraft.ts` (new, about 10 lines): a module-level `SavedMealItem[]`, plus `addPendingRecipeItem(item)` and `takePendingRecipeItems()` (returns the items and clears the list).
- `src/lib/foods.ts`
  - `getSavedMeals`: also select `portions` and map it with `Number(row.portions)`.
  - New `saveRecipe(userId, { id?, name, portions, items: SavedMealItem[] })`:
    - New recipe: insert the `saved_meals` row and then the items. If the items insert fails, delete the meal (same as `saveMealFromEntries`).
    - Existing recipe: update `name, portions`. Insert the new items first with `.select('id')`, then delete the old ones: `.delete().eq('meal_id', id).not('id', 'in', \`(${newIds})\`)`. Inserting first means a failure leaves duplicates, never an empty recipe.
  - New pure `scaleSavedMealItems(meal, eaten)`: each item's `quantity * eaten / meal.portions`, with unit and `servingG` unchanged.
  - `logSavedMeal(userId, meal, loggedDate, mealType, eaten = meal.portions)`: logs the scaled items. If `meal.portions !== 1`, `group_name` = `` `${meal.name} · ${eaten} portion${eaten === 1 ? '' : 's'}` ``, otherwise `meal.name` as today.
- `src/app/(tabs)/food/recipe.tsx` (new screen)
  - Form fields: name `TextInput`, "Portions it makes" numeric input (default `1`, read with `toNumberOrNull`), and the ingredient list.
  - Each ingredient row shows the food name, a numeric quantity input with its unit ("g" or "serving(s)"), the kcal from `entryNutrition`, and a ✕ to remove it. Changing an amount is done in the row; there is no round trip to the detail page.
  - Below the list: "+ Add ingredient", which runs `router.push('/(tabs)/food/search?recipe=1')`.
  - Footer: total kcal and kcal per portion, then Save. Save is greyed out when the name is empty, there are no items, any quantity is ≤ 0, or portions ≤ 0.
  - With `id`, the screen starts from that meal in the `['savedMeals', userId]` query cache. Save calls `saveRecipe`, invalidates `['savedMeals', userId]`, then `router.back()`.
  - Leaving without saving throws the draft away; there is no confirm prompt.
- `src/app/(tabs)/food/_layout.tsx`: add `<Stack.Screen name="recipe" options={{ title: 'Recipe' }} />`.
- `src/app/(tabs)/food/search.tsx`
  - Read `recipe` from the params and pass `recipe=1` on to the food detail, scan and custom-food links. Build the query string next to `mealQuery`.
  - Hide the "Saved meals" shortcut when in recipe mode.
- `src/app/(tabs)/food/scan.tsx`: pass `recipe` on in both `router.replace` calls, including the "not found → custom food" one.
- `src/app/(tabs)/food/custom-food/new.tsx`: pass `recipe` on to the food detail in `router.replace`.
- `src/app/(tabs)/food/food/[foodId].tsx`: with `params.recipe`, hide the meal chips, label the button "Add to recipe", and in `handleSave` call `addPendingRecipeItem({ food, quantity: amountNumber, quantityUnit: unit, servingG: selected?.grams ?? null })` followed by `router.dismissTo('/(tabs)/food/recipe')`. There is no diary write and no diary invalidate. Disable the button when `amountNumber <= 0`.
- `src/app/(tabs)/food/saved-meals.tsx`
  - "New recipe" button at the top, which pushes `/(tabs)/food/recipe`.
  - Each row gets an "Edit" link next to ✕, which pushes `/(tabs)/food/recipe?id=<id>`.
  - Row subtitle when `portions > 1`: `N foods · makes 12 · X kcal per portion`.
  - Add with `portions === 1` logs in one tap, as today. Add with `portions !== 1` opens a `Modal` (the Save as meal popup's look) asking "How many portions? (of 12)". The input starts at `1`, decimals are OK via `toNumberOrNull`, there is a live kcal preview, and Log is greyed out when the value is ≤ 0 or empty. Log calls `logSavedMeal(..., eaten)`.

## RLS check

`0011` has `for all` policies on both tables. `saved_meals` is limited to `user_id = auth.uid()`. `saved_meal_items` is limited to rows whose meal belongs to the user, checked in both `using` and `with check`. Update and delete on `saved_meals`, and insert and delete on `saved_meal_items`, are therefore already allowed for the owner and blocked for everyone else. No policy change is needed.

## Reuse

- The `saved_meals`/`saved_meal_items` tables, `getSavedMeals`, `logSavedMeal`, and diary groups.
- Search, scan, custom food and the food detail page, including servings and the preview.
- `entryNutrition`, `toNumberOrNull`, `useFocusEffect` (from `expo-router`), and the modal styles and `LabeledInput` from the existing food screens.
- No new dependency. `Alert.prompt` only works on iOS, so the portions question uses a `Modal`.
- Check the expo-router docs for SDK 57 (`https://docs.expo.dev/versions/v57.0.0/`) to confirm that `dismissTo` returns to the existing Recipe screen and keeps its state, rather than pushing a new copy.

## Acceptance criteria

- [ ] The migration adds `saved_meals.portions` (default 1, > 0). Existing saved meals still log in one tap with the same amounts.
- [ ] Saved meals → New recipe → + Add ingredient → search, or scan, or custom food → food detail shows "Add to recipe" and no meal chips. Tapping it returns to the Recipe screen with the ingredient added and the earlier ingredients still there.
- [ ] Nothing is written to the diary while building or editing a recipe.
- [ ] The Recipe screen shows total kcal and kcal per portion. An amount can be changed in the row and an ingredient removed with ✕. `12,5` works in the amount and portions fields.
- [ ] Save is greyed out when the name is empty, there are no ingredients, an amount is ≤ 0, or portions is ≤ 0.
- [ ] Saving a new recipe shows it in Saved meals as "N foods · makes 12 · X kcal per portion".
- [ ] Edit on any saved meal (recipe or normal) opens the screen filled in. After changing it and saving, the list shows the new values, and earlier diary entries from that meal are unchanged.
- [ ] Add on a recipe asks "How many portions? (of 12)", defaulting to 1, and accepts `2,5`. Logging 2.5 of 12 makes every ingredient's quantity and nutrition saved × 2.5 / 12. The diary group is named "Pancakes · 2.5 portions" and its kcal matches the preview.
- [ ] Normal saved meals still log in one tap with the meal name as the group name.
- [ ] The normal log flow (search → detail → Add to Diary) is unchanged.
- [ ] `npx tsc --noEmit` and `npx expo lint` pass.

## Test plan

- Unit tests in `src/lib/__tests__/`:
  - `scaleSavedMealItems`: factor 1 gives the same quantities; 2.5 of 12 on a gram item and on a serving item (`servingG` kept); kcal from `entryNutrition` on the scaled items equals the total × 2.5 / 12.
  - `recipeDraft`: `take` returns the added items and then an empty list.
- Web click-through with the test account from `.env.test.local`, after the user has run the SQL:
  1. Food → search → Saved meals → New recipe. Add 2 ingredients from search (one in grams, one in servings) and 1 through Custom food. Check the diary for today has nothing new.
  2. Name it "Pancakes", set portions to `12`, and save. The list shows "makes 12" and kcal per portion.
  3. Add → `2,5` → Log to Snack. The diary has the group "Pancakes · 2.5 portions" with the correct kcal. Expand it: the amounts are scaled.
  4. Edit Pancakes: change one amount, remove one ingredient, save. The list kcal updates and the diary group from step 3 is unchanged.
  5. Edit an old normal saved meal, rename it, and save. Add still works in one tap.
  6. Normal log of a food from the diary "+": it still says "Add to Diary" and logs.
  7. Check the console for errors.
- Phone list in HANDOVER: add an ingredient by barcode scan in recipe mode (the camera does not run on web).

## Needs from the user

- Paste `supabase/migrations/0016_saved_meal_portions.sql` into the Supabase SQL editor **before** `eas update` (label `sql`). The app selects `portions`, so the Saved meals list breaks without the column.
- No new APK build; this ships as JS via `eas update`.

## Decisions (2026-10-18)

- Yield by count only, no cooked weight.
- A separate Recipe screen, not Save as meal from the diary. Ingredients are never logged to the diary while building a recipe.
- Ingredients are added through the normal search, scan and food detail pages in recipe mode (route param `recipe=1`). The draft is passed through a tiny in-memory module.
- A recipe is stored as a saved meal with the new `portions` column (one migration). It shows in Saved meals, which gets a "New recipe" button at the top.
- Editing opens the same screen. Saving updates the saved meal and replaces its items, and old diary entries stay as they are. Normal saved meals can be edited with the same screen.
- Logging a recipe asks "How many portions? (of 12)", decimals OK. Normal saved meals stay one tap.
- The diary group is named "Pancakes · 2.5 portions".

## Open questions

1. How to open edit: the brief says "tapping a recipe opens the screen", but tapping a row already means Add/log. This spec keeps tap = log and adds an "Edit" link on each row. Is that OK?
2. Leaving the Recipe screen without saving silently discards the draft. Is that OK, or should it ask "Discard changes?"

## Out of scope

- Cooked-weight yield and portion names ("2.5 pancakes").
- Changing an ingredient's unit or serving size in the Recipe screen. To do that, remove it and add it again.
- Changes to the "Save as meal" popup on the diary. It stays as F5 left it and always saves portions = 1.
- Logging part of a normal saved meal.
- Reordering ingredients.
- A draft that survives an app restart.
- Saved meal rows: tap = log (unchanged); a small "Edit" link on each row opens the Recipe screen.
- Leaving the Recipe screen with unsaved changes asks "Discard changes?" (Discard / Keep editing).
