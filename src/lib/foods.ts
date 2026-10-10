import type { OffFood } from './openFoodFacts';
import { supabase } from './supabase';
import { refreshFoodReminders } from './reminders';
import type {
  Food,
  FoodLogEntry,
  FoodServing,
  MealType,
  NutritionGoals,
  SavedMeal,
} from '../types/domain';

function mapFoodRow(row: any): Food {
  return {
    id: row.id,
    source: row.source,
    barcode: row.barcode,
    name: row.name,
    brand: row.brand,
    servingSizeG: row.serving_size_g,
    servingDescription: row.serving_description,
    createdBy: row.created_by,
    caloriesKcal: row.calories_kcal,
    proteinG: row.protein_g,
    carbsG: row.carbs_g,
    fatG: row.fat_g,
    fiberG: row.fiber_g,
  };
}

function mapEntryRow(row: any): FoodLogEntry {
  return {
    id: row.id,
    foodId: row.food_id,
    foodName: row.food_name,
    loggedDate: row.logged_date,
    mealType: row.meal_type,
    quantity: row.quantity,
    quantityUnit: row.quantity_unit,
    servingG: row.serving_g,
    caloriesKcal: row.calories_kcal,
    proteinG: row.protein_g,
    carbsG: row.carbs_g,
    fatG: row.fat_g,
    fiberG: row.fiber_g,
  };
}

export async function searchCachedFoods(query: string): Promise<Food[]> {
  const { data, error } = await supabase
    .from('foods')
    .select('*')
    .ilike('name', `%${query}%`)
    .limit(20);

  if (error) throw error;
  return (data ?? []).map(mapFoodRow);
}

// Foods the user logged most recently, newest first, without repeats.
export async function getRecentFoods(userId: string): Promise<Food[]> {
  const { data, error } = await supabase
    .from('food_log_entries')
    .select('food_id, foods(*)')
    .eq('user_id', userId)
    .not('food_id', 'is', null)
    .order('logged_at', { ascending: false })
    .limit(100);

  if (error) throw error;
  const byId = new Map<string, Food>();
  for (const row of data ?? []) {
    if (row.foods && !byId.has(row.food_id)) byId.set(row.food_id, mapFoodRow(row.foods));
  }
  return [...byId.values()].slice(0, 15);
}

// Foods this user has logged (most recent first), then their custom foods, matching the query.
export async function searchMyFoods(userId: string, query: string): Promise<Food[]> {
  // Every word must match, in any order ("kyckling ris" finds "Kyckling med ris").
  const words = query.split(/\s+/).filter(Boolean);
  let loggedRequest = supabase
    .from('food_log_entries')
    .select('food_id, foods(*)')
    .eq('user_id', userId);
  let customRequest = supabase.from('foods').select('*').eq('created_by', userId);
  for (const word of words) {
    loggedRequest = loggedRequest.ilike('food_name', `%${word}%`);
    customRequest = customRequest.ilike('name', `%${word}%`);
  }
  const [logged, custom] = await Promise.all([
    loggedRequest.order('logged_at', { ascending: false }).limit(500),
    customRequest.limit(100),
  ]);
  if (logged.error) throw logged.error;
  if (custom.error) throw custom.error;

  const byId = new Map<string, Food>();
  for (const row of logged.data ?? []) {
    if (row.foods && !byId.has(row.food_id)) byId.set(row.food_id, mapFoodRow(row.foods));
  }
  for (const row of custom.data ?? []) {
    if (!byId.has(row.id)) byId.set(row.id, mapFoodRow(row));
  }
  return [...byId.values()].slice(0, 30);
}

// Generic Livsmedelsverket foods. Every word must match; closest names first,
// so "banan" puts "Banan" above "Banan torkad".
export async function searchBasicFoods(query: string): Promise<Food[]> {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  let request = supabase.from('foods').select('*').eq('source', 'slv');
  for (const word of words) request = request.ilike('name', `%${word}%`);
  // Fetch all matches (the table is small) so the best ones aren't cut off before sorting.
  const { data, error } = await request.limit(1000);
  if (error) throw error;

  // Whole words beat parts of words: "mjölk" ranks "Mjölk fett 3%" above "Mjölkchoklad".
  const q = query.trim().toLowerCase();
  function rank(name: string): number {
    const n = name.toLowerCase();
    const nameWords = n.split(/[\s,.()]+/);
    const wholeWords = words.every((w) => nameWords.includes(w));
    if (n === q) return 0;
    if (wholeWords && n.startsWith(q)) return 1;
    if (wholeWords) return 2;
    if (n.startsWith(q)) return 3;
    return 4;
  }
  return (data ?? [])
    .map(mapFoodRow)
    .sort((a, b) => rank(a.name) - rank(b.name) || a.name.length - b.name.length)
    .slice(0, 30);
}

export async function upsertOffFood(off: OffFood): Promise<Food> {
  const { data, error } = await supabase
    .from('foods')
    .upsert(
      {
        source: 'off',
        barcode: off.barcode,
        name: off.name,
        brand: off.brand,
        serving_size_g: off.servingSizeG,
        serving_description: off.servingDescription,
        calories_kcal: off.caloriesKcal,
        protein_g: off.proteinG,
        carbs_g: off.carbsG,
        fat_g: off.fatG,
        fiber_g: off.fiberG,
        sugar_g: off.sugarG,
        sodium_mg: off.sodiumMg,
      },
      { onConflict: 'barcode' }
    )
    .select()
    .single();

  if (error) throw error;
  return mapFoodRow(data);
}

export async function createCustomFood(input: {
  name: string;
  caloriesKcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number | null;
  servingSizeG: number | null;
  servingDescription: string | null;
  userId: string;
  barcode?: string;
}): Promise<Food> {
  const { data, error } = await supabase
    .from('foods')
    .insert({
      source: 'custom',
      barcode: input.barcode ?? null,
      name: input.name,
      calories_kcal: input.caloriesKcal,
      protein_g: input.proteinG,
      carbs_g: input.carbsG,
      fat_g: input.fatG,
      fiber_g: input.fiberG,
      serving_size_g: input.servingSizeG,
      serving_description: input.servingDescription,
      created_by: input.userId,
    })
    .select()
    .single();

  if (error) throw error;
  return mapFoodRow(data);
}

export async function updateFoodServing(
  foodId: string,
  servingSizeG: number | null,
  servingDescription: string | null
): Promise<void> {
  const { error } = await supabase
    .from('foods')
    .update({ serving_size_g: servingSizeG, serving_description: servingDescription })
    .eq('id', foodId);
  if (error) throw error;
}

export async function getFoodServings(userId: string, foodId: string): Promise<FoodServing[]> {
  const { data, error } = await supabase
    .from('food_servings')
    .select('id, name, grams')
    .eq('user_id', userId)
    .eq('food_id', foodId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row) => ({ id: row.id, name: row.name, grams: Number(row.grams) }));
}

export async function addFoodServing(input: {
  userId: string;
  foodId: string;
  name: string;
  grams: number;
}): Promise<FoodServing> {
  const { data, error } = await supabase
    .from('food_servings')
    .insert({ user_id: input.userId, food_id: input.foodId, name: input.name, grams: input.grams })
    .select('id, name, grams')
    .single();
  if (error) throw error;
  return { id: data.id, name: data.name, grams: Number(data.grams) };
}

export async function deleteFoodServing(id: string): Promise<void> {
  const { error } = await supabase.from('food_servings').delete().eq('id', id);
  if (error) throw error;
}

export async function getFoodById(id: string): Promise<Food> {
  const { data, error } = await supabase.from('foods').select('*').eq('id', id).single();
  if (error) throw error;
  return mapFoodRow(data);
}

// Breakfast before 10, lunch 10-14, dinner 17-21, otherwise snack.
export function defaultMealForNow(): MealType {
  const hour = new Date().getHours();
  if (hour < 10) return 'breakfast';
  if (hour < 14) return 'lunch';
  if (hour >= 17 && hour < 21) return 'dinner';
  return 'snack';
}

// Nutrition on `foods` is stored per 100g; convert by quantity/unit.
export function entryNutrition(
  food: Food,
  quantity: number,
  quantityUnit: 'g' | 'serving',
  servingG: number | null
) {
  const multiplier =
    quantityUnit === 'g' ? quantity / 100 : (servingG ?? food.servingSizeG ?? 100) * (quantity / 100);
  return {
    calories_kcal: food.caloriesKcal * multiplier,
    protein_g: food.proteinG * multiplier,
    carbs_g: food.carbsG * multiplier,
    fat_g: food.fatG * multiplier,
    fiber_g: food.fiberG != null ? food.fiberG * multiplier : null,
  };
}

export async function logFoodEntry(input: {
  userId: string;
  food: Food;
  loggedDate: string;
  mealType: MealType;
  quantity: number;
  quantityUnit: 'g' | 'serving';
  servingG: number | null;
}): Promise<void> {
  const { error } = await supabase.from('food_log_entries').insert({
    user_id: input.userId,
    food_id: input.food.id,
    food_name: input.food.name,
    logged_date: input.loggedDate,
    meal_type: input.mealType,
    quantity: input.quantity,
    quantity_unit: input.quantityUnit,
    serving_g: input.quantityUnit === 'serving' ? input.servingG : null,
    ...entryNutrition(input.food, input.quantity, input.quantityUnit, input.servingG),
  });

  if (error) throw error;
  refreshFoodReminders().catch(() => {});
}

export async function updateFoodLogEntry(input: {
  entryId: string;
  food: Food;
  mealType: MealType;
  quantity: number;
  quantityUnit: 'g' | 'serving';
  servingG: number | null;
}): Promise<void> {
  const { error } = await supabase
    .from('food_log_entries')
    .update({
      meal_type: input.mealType,
      quantity: input.quantity,
      quantity_unit: input.quantityUnit,
      serving_g: input.quantityUnit === 'serving' ? input.servingG : null,
      ...entryNutrition(input.food, input.quantity, input.quantityUnit, input.servingG),
    })
    .eq('id', input.entryId);

  if (error) throw error;
}

// Copies entries as they were logged (same amounts and nutrition) onto another day.
export async function copyEntriesToDate(
  userId: string,
  entries: FoodLogEntry[],
  loggedDate: string
): Promise<void> {
  if (entries.length === 0) return;
  const { error } = await supabase.from('food_log_entries').insert(
    entries.map((e) => ({
      user_id: userId,
      food_id: e.foodId,
      food_name: e.foodName,
      logged_date: loggedDate,
      meal_type: e.mealType,
      quantity: e.quantity,
      quantity_unit: e.quantityUnit,
      serving_g: e.servingG,
      calories_kcal: e.caloriesKcal,
      protein_g: e.proteinG,
      carbs_g: e.carbsG,
      fat_g: e.fatG,
      fiber_g: e.fiberG,
    }))
  );

  if (error) throw error;
  refreshFoodReminders().catch(() => {});
}

type QuickEntryInput = {
  name: string;
  mealType: MealType;
  caloriesKcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
};

// Quick add: no food behind the entry, just the numbers typed in.
export async function logQuickEntry(
  input: QuickEntryInput & { userId: string; loggedDate: string }
): Promise<void> {
  const { error } = await supabase.from('food_log_entries').insert({
    user_id: input.userId,
    food_id: null,
    food_name: input.name,
    logged_date: input.loggedDate,
    meal_type: input.mealType,
    quantity: 1,
    quantity_unit: 'serving',
    calories_kcal: input.caloriesKcal,
    protein_g: input.proteinG,
    carbs_g: input.carbsG,
    fat_g: input.fatG,
  });

  if (error) throw error;
  refreshFoodReminders().catch(() => {});
}

export async function updateQuickEntry(input: QuickEntryInput & { entryId: string }): Promise<void> {
  const { error } = await supabase
    .from('food_log_entries')
    .update({
      food_name: input.name,
      meal_type: input.mealType,
      calories_kcal: input.caloriesKcal,
      protein_g: input.proteinG,
      carbs_g: input.carbsG,
      fat_g: input.fatG,
    })
    .eq('id', input.entryId);

  if (error) throw error;
}

export async function getSavedMeals(userId: string): Promise<SavedMeal[]> {
  const { data, error } = await supabase
    .from('saved_meals')
    .select('id, name, saved_meal_items(quantity, quantity_unit, serving_g, position, foods(*))')
    .eq('user_id', userId)
    .order('name', { ascending: true });

  if (error) throw error;
  return (data ?? []).map((row: any) => ({
    id: row.id,
    name: row.name,
    items: [...row.saved_meal_items]
      .sort((a, b) => a.position - b.position)
      .map((item: any) => ({
        food: mapFoodRow(item.foods),
        quantity: Number(item.quantity),
        quantityUnit: item.quantity_unit,
        servingG: item.serving_g != null ? Number(item.serving_g) : null,
      })),
  }));
}

// Saves the foods of some diary entries as a meal. Quick-add entries have no
// food, so they are left out.
export async function saveMealFromEntries(
  userId: string,
  name: string,
  entries: FoodLogEntry[]
): Promise<void> {
  const items = entries.filter((e) => e.foodId != null);
  if (items.length === 0) return;

  const { data: meal, error } = await supabase
    .from('saved_meals')
    .insert({ user_id: userId, name })
    .select('id')
    .single();
  if (error) throw error;

  const { error: itemsError } = await supabase.from('saved_meal_items').insert(
    items.map((e, position) => ({
      meal_id: meal.id,
      food_id: e.foodId,
      quantity: e.quantity,
      quantity_unit: e.quantityUnit,
      serving_g: e.servingG,
      position,
    }))
  );
  if (itemsError) {
    await supabase.from('saved_meals').delete().eq('id', meal.id);
    throw itemsError;
  }
}

export async function deleteSavedMeal(id: string): Promise<void> {
  const { error } = await supabase.from('saved_meals').delete().eq('id', id);
  if (error) throw error;
}

// One diary entry per food, with nutrition worked out from the foods as they are now.
export async function logSavedMeal(
  userId: string,
  meal: SavedMeal,
  loggedDate: string,
  mealType: MealType
): Promise<void> {
  if (meal.items.length === 0) return;
  const { error } = await supabase.from('food_log_entries').insert(
    meal.items.map((item) => ({
      user_id: userId,
      food_id: item.food.id,
      food_name: item.food.name,
      logged_date: loggedDate,
      meal_type: mealType,
      quantity: item.quantity,
      quantity_unit: item.quantityUnit,
      serving_g: item.quantityUnit === 'serving' ? item.servingG : null,
      ...entryNutrition(item.food, item.quantity, item.quantityUnit, item.servingG),
    }))
  );

  if (error) throw error;
  refreshFoodReminders().catch(() => {});
}

export async function getDiaryForDate(userId: string, date: string): Promise<FoodLogEntry[]> {
  const { data, error } = await supabase
    .from('food_log_entries')
    .select('*')
    .eq('user_id', userId)
    .eq('logged_date', date)
    .order('logged_at', { ascending: true });

  if (error) throw error;
  return (data ?? []).map(mapEntryRow);
}

export async function deleteFoodLogEntry(id: string): Promise<void> {
  const { error } = await supabase.from('food_log_entries').delete().eq('id', id);
  if (error) throw error;
  refreshFoodReminders().catch(() => {});
}

export async function getNutritionGoals(userId: string): Promise<NutritionGoals | null> {
  const { data, error } = await supabase
    .from('nutrition_goals')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    caloriesKcal: data.calories_kcal,
    proteinG: data.protein_g,
    carbsG: data.carbs_g,
    fatG: data.fat_g,
    fiberG: data.fiber_g,
  };
}

export async function upsertNutritionGoals(
  userId: string,
  goals: NutritionGoals
): Promise<void> {
  const { error } = await supabase.from('nutrition_goals').upsert(
    {
      user_id: userId,
      calories_kcal: goals.caloriesKcal,
      protein_g: goals.proteinG,
      carbs_g: goals.carbsG,
      fat_g: goals.fatG,
      fiber_g: goals.fiberG,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' }
  );

  if (error) throw error;
}
