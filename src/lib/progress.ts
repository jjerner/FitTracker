import { supabase } from './supabase';
import type { BodyWeight, DailyCalories, WorkoutVolume } from '../types/domain';

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
export async function getDailyCalories(
  userId: string,
  sinceDate: string
): Promise<DailyCalories[]> {
  const { data, error } = await supabase
    .from('food_log_entries')
    .select('logged_date, calories_kcal')
    .eq('user_id', userId)
    .gte('logged_date', sinceDate);

  if (error) throw error;

  const totals = new Map<string, number>();
  for (const row of data ?? []) {
    totals.set(row.logged_date, (totals.get(row.logged_date) ?? 0) + Number(row.calories_kcal));
  }
  return [...totals.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, caloriesKcal]) => ({ date, caloriesKcal }));
}

// Volume = sum of weight × reps over all strength sets in a completed workout.
export async function getWorkoutVolumes(
  userId: string,
  sinceDate: string
): Promise<WorkoutVolume[]> {
  const { data, error } = await supabase
    .from('workout_logs')
    .select('id, started_at, workout_log_exercises(workout_log_sets(weight_kg, reps))')
    .eq('user_id', userId)
    .not('completed_at', 'is', null)
    .gte('started_at', sinceDate)
    .order('started_at', { ascending: true });

  if (error) throw error;

  return (data ?? []).map((log: any) => {
    let volumeKg = 0;
    for (const le of log.workout_log_exercises ?? []) {
      for (const set of le.workout_log_sets ?? []) {
        volumeKg += Number(set.weight_kg ?? 0) * Number(set.reps ?? 0);
      }
    }
    return { id: log.id, startedAt: log.started_at, volumeKg };
  });
}
