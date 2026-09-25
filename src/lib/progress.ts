import { supabase } from './supabase';
import { localDateOf } from './dateUtils';
import type { BodyWeight, DailyNutrition } from '../types/domain';

export async function getBodyWeights(userId: string, sinceDate: string): Promise<BodyWeight[]> {
  const { data, error } = await supabase
    .from('body_weights')
    .select('logged_date, weight_kg')
    .eq('user_id', userId)
    .gte('logged_date', sinceDate)
    .order('logged_date', { ascending: true });

  if (error) throw error;
  return (data ?? []).map((row) => ({ date: row.logged_date, weightKg: row.weight_kg }));
}

export async function upsertBodyWeight(input: {
  userId: string;
  date: string;
  weightKg: number;
}): Promise<void> {
  const { error } = await supabase
    .from('body_weights')
    .upsert(
      { user_id: input.userId, logged_date: input.date, weight_kg: input.weightKg },
      { onConflict: 'user_id,logged_date' }
    );
  if (error) throw error;
}

// Sums diary entries per day. Days with nothing logged are left out.
export async function getDailyNutrition(
  userId: string,
  sinceDate: string
): Promise<DailyNutrition[]> {
  const { data, error } = await supabase
    .from('food_log_entries')
    .select('logged_date, calories_kcal, protein_g, carbs_g, fat_g')
    .eq('user_id', userId)
    .gte('logged_date', sinceDate);

  if (error) throw error;

  const totals = new Map<string, DailyNutrition>();
  for (const row of data ?? []) {
    const day = totals.get(row.logged_date) ?? {
      date: row.logged_date,
      caloriesKcal: 0,
      proteinG: 0,
      carbsG: 0,
      fatG: 0,
    };
    day.caloriesKcal += Number(row.calories_kcal);
    day.proteinG += Number(row.protein_g);
    day.carbsG += Number(row.carbs_g);
    day.fatG += Number(row.fat_g);
    totals.set(row.logged_date, day);
  }
  return [...totals.values()].sort((a, b) => a.date.localeCompare(b.date));
}

// Local dates ("YYYY-MM-DD") of completed workouts, oldest first. One entry
// per workout, so a day with two workouts appears twice.
export async function getWorkoutDates(userId: string, sinceDate: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('workout_logs')
    .select('started_at')
    .eq('user_id', userId)
    .not('completed_at', 'is', null)
    .gte('started_at', sinceDate)
    .order('started_at', { ascending: true });

  if (error) throw error;
  return (data ?? []).map((row) => localDateOf(new Date(row.started_at)));
}
