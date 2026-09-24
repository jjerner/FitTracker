import type { OffFood } from './openFoodFacts';
import { supabase } from './supabase';
import type { Food, FoodLogEntry, MealType, NutritionGoals } from '../types/domain';

function mapFoodRow(row: any): Food {
  return {
    id: row.id,
    source: row.source,
    barcode: row.barcode,
    name: row.name,
    brand: row.brand,
    servingSizeG: row.serving_size_g,
    servingDescription: row.serving_description,
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
  userId: string;
}): Promise<Food> {
  const { data, error } = await supabase
    .from('foods')
    .insert({
      source: 'custom',
      name: input.name,
      calories_kcal: input.caloriesKcal,
      protein_g: input.proteinG,
      carbs_g: input.carbsG,
      fat_g: input.fatG,
      fiber_g: input.fiberG,
      created_by: input.userId,
    })
    .select()
    .single();

  if (error) throw error;
  return mapFoodRow(data);
}

export async function getFoodById(id: string): Promise<Food> {
  const { data, error } = await supabase.from('foods').select('*').eq('id', id).single();
  if (error) throw error;
  return mapFoodRow(data);
}

export async function logFoodEntry(input: {
  userId: string;
  food: Food;
  loggedDate: string;
  mealType: MealType;
  quantity: number;
  quantityUnit: 'g' | 'serving';
}): Promise<void> {
  // Nutrition on `foods` is stored per 100g; convert by quantity/unit.
  const multiplier =
    input.quantityUnit === 'g'
      ? input.quantity / 100
      : (input.food.servingSizeG ?? 100) * (input.quantity / 100);

  const { error } = await supabase.from('food_log_entries').insert({
    user_id: input.userId,
    food_id: input.food.id,
    food_name: input.food.name,
    logged_date: input.loggedDate,
    meal_type: input.mealType,
    quantity: input.quantity,
    quantity_unit: input.quantityUnit,
    calories_kcal: input.food.caloriesKcal * multiplier,
    protein_g: input.food.proteinG * multiplier,
    carbs_g: input.food.carbsG * multiplier,
    fat_g: input.food.fatG * multiplier,
    fiber_g: input.food.fiberG != null ? input.food.fiberG * multiplier : null,
  });

  if (error) throw error;
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
