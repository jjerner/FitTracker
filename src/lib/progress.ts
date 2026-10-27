import { supabase } from './supabase';
import { addDays, localDateOf, mondayOf } from './dateUtils';
import { KCAL_PER_KG } from './goalHelper';
import type { BodyWeight, DailyNutrition, NutritionGoals } from '../types/domain';

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

export async function getTrackedExerciseIds(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('tracked_exercises')
    .select('exercise_id')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return (data ?? []).map((row) => row.exercise_id);
}

export async function addTrackedExercise(userId: string, exerciseId: string): Promise<void> {
  const { error } = await supabase
    .from('tracked_exercises')
    .upsert(
      { user_id: userId, exercise_id: exerciseId },
      { onConflict: 'user_id,exercise_id', ignoreDuplicates: true }
    );
  if (error) throw error;
}

export async function removeTrackedExercise(userId: string, exerciseId: string): Promise<void> {
  const { error } = await supabase
    .from('tracked_exercises')
    .delete()
    .eq('user_id', userId)
    .eq('exercise_id', exerciseId);
  if (error) throw error;
}

// Daily totals from the `daily_nutrition` view (migration 0013): one row per day, so the
// 1000-row limit on a request is never reached. Days with nothing logged are left out.
export async function getDailyNutrition(
  userId: string,
  sinceDate: string
): Promise<DailyNutrition[]> {
  const { data, error } = await supabase
    .from('daily_nutrition')
    .select('logged_date, calories_kcal, protein_g, carbs_g, fat_g')
    .eq('user_id', userId)
    .gte('logged_date', sinceDate)
    .order('logged_date', { ascending: true });

  if (error) throw error;
  return (data ?? []).map((row) => ({
    date: row.logged_date,
    caloriesKcal: Number(row.calories_kcal),
    proteinG: Number(row.protein_g),
    carbsG: Number(row.carbs_g),
    fatG: Number(row.fat_g),
  }));
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

// Days in a row that hit the goals: calories within ±10 % and protein at or above goal.
// A day with nothing logged breaks it; today only counts once it is a hit.
// Past days are judged against the current goal (goals have no history).
export function goalStreak(days: DailyNutrition[], goals: NutritionGoals, today: string): number {
  const hits = new Set(
    days
      .filter(
        (d) =>
          Math.abs(d.caloriesKcal - goals.caloriesKcal) * 10 <= goals.caloriesKcal && // × 10, not × 0.1: exact at the edge
          d.proteinG >= goals.proteinG
      )
      .map((d) => d.date)
  );
  let date = hits.has(today) ? today : addDays(today, -1);
  let streak = 0;
  while (hits.has(date)) {
    streak += 1;
    date = addDays(date, -1);
  }
  return streak;
}

export type MuscleSetRow = {
  startedAt: string;
  muscleGroup: string | null;
  category: string;
  setCount: number;
};

// One row per exercise done in a completed workout since `sinceIso`, with its number of sets.
export async function getMuscleSetRows(userId: string, sinceIso: string): Promise<MuscleSetRow[]> {
  const { data, error } = await supabase
    .from('workout_log_exercises')
    .select(
      'exercises(muscle_group, category), workout_logs!inner(started_at, completed_at, user_id), workout_log_sets(id)'
    )
    .eq('workout_logs.user_id', userId)
    .not('workout_logs.completed_at', 'is', null)
    .gte('workout_logs.started_at', sinceIso);

  if (error) throw error;
  return (data ?? []).map((row: any) => ({
    startedAt: row.workout_logs.started_at,
    muscleGroup: row.exercises?.muscle_group ?? null,
    category: row.exercises?.category ?? '',
    setCount: (row.workout_log_sets ?? []).length,
  }));
}

// Sets per muscle group per week. `counts[i]` belongs to `weekStarts[i]` (Mondays).
// Cardio is skipped, a missing group is 'other' (sorted last), rows outside the weeks are ignored.
export function weeklyMuscleSets(
  rows: MuscleSetRow[],
  weekStarts: string[]
): { group: string; counts: number[] }[] {
  const byGroup = new Map<string, number[]>();
  for (const row of rows) {
    if (row.category === 'cardio') continue;
    const week = weekStarts.indexOf(mondayOf(localDateOf(new Date(row.startedAt))));
    if (week === -1 || row.setCount === 0) continue;
    const group = row.muscleGroup?.trim().toLowerCase() || 'other';
    const counts = byGroup.get(group) ?? weekStarts.map(() => 0);
    counts[week] += row.setCount;
    byGroup.set(group, counts);
  }
  return [...byGroup]
    .map(([group, counts]) => ({ group, counts }))
    .sort((a, b) =>
      a.group === 'other' ? 1 : b.group === 'other' ? -1 : a.group.localeCompare(b.group)
    );
}

// For each weigh-in, the average of all weigh-ins in the 7 days up to and including it.
// Days without a weigh-in are simply skipped. Input must be sorted by date.
export function weightTrend(points: BodyWeight[]): number[] {
  const dayNumber = (date: string) => Date.parse(`${date}T00:00:00Z`) / 86_400_000;
  return points.map((p, i) => {
    const window = points
      .slice(0, i + 1)
      .filter((q) => dayNumber(p.date) - dayNumber(q.date) < 7);
    return window.reduce((sum, q) => sum + Number(q.weightKg), 0) / window.length;
  });
}

export type MaintenanceEstimate = {
  kcal: number;
  loggedDays: number;
  skippedDays: number;
  daysBetween: number;
  trendChangeKg: number;
};

const MAINTENANCE_WINDOW_DAYS = 28;
const MAINTENANCE_MIN_DAYS = 14;

// Daily burn from intake and the weight trend over the 28 days before today (today is still
// being logged). Days under half the median intake look half-logged and are skipped.
// Null without at least 14 counted food days and two weigh-ins 14+ days apart.
export function estimateMaintenance(
  weights: BodyWeight[],
  days: DailyNutrition[],
  today: string
): MaintenanceEstimate | null {
  const start = addDays(today, -MAINTENANCE_WINDOW_DAYS);
  const inWindow = (date: string) => date >= start && date < today;

  const logged = days.filter((d) => inWindow(d.date));
  const sorted = logged.map((d) => d.caloriesKcal).sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  const counted = logged.filter((d) => d.caloriesKcal >= median / 2);
  if (counted.length < MAINTENANCE_MIN_DAYS) return null;

  // Trend over everything fetched, so the first weigh-in in the window still has a week behind it.
  const trend = weightTrend(weights);
  const indexes = weights.flatMap((w, i) => (inWindow(w.date) ? [i] : []));
  if (indexes.length === 0) return null;
  const first = indexes[0];
  const last = indexes[indexes.length - 1];
  const daysBetween = (Date.parse(weights[last].date) - Date.parse(weights[first].date)) / 86_400_000;
  if (daysBetween < MAINTENANCE_MIN_DAYS) return null;

  const trendChangeKg = trend[last] - trend[first];
  const avgIntake = counted.reduce((sum, d) => sum + d.caloriesKcal, 0) / counted.length;
  const kcal = avgIntake - (trendChangeKg * KCAL_PER_KG) / daysBetween;
  return {
    kcal: Math.round(kcal / 10) * 10,
    loggedDays: counted.length,
    skippedDays: logged.length - counted.length,
    daysBetween,
    trendChangeKg,
  };
}

export type WeeklyMaintenance = { date: string; estimate: MaintenanceEstimate };

// One estimate per week: today's rule run with "today" set 0, 7, 14 … days back.
// Oldest first. Weeks without enough data are left out.
export function weeklyMaintenance(
  weights: BodyWeight[],
  days: DailyNutrition[],
  today: string,
  weeks: number
): WeeklyMaintenance[] {
  return Array.from({ length: weeks }, (_, i) => addDays(today, -7 * (weeks - 1 - i))).flatMap(
    (date) => {
      const estimate = estimateMaintenance(weights, days, date);
      return estimate ? [{ date, estimate }] : [];
    }
  );
}

// Average of the weekly estimates from the last 3 weeks (date >= today − 14), rounded to 10 kcal.
// `latest` is the newest of those weeks and feeds the detail line. Null when none of the 3 weeks has data.
export function smoothedMaintenance(
  weekly: WeeklyMaintenance[],
  today: string
): { kcal: number; latest: MaintenanceEstimate } | null {
  const recent = weekly.filter((w) => w.date >= addDays(today, -14));
  if (recent.length === 0) return null;
  const avg = recent.reduce((sum, w) => sum + w.estimate.kcal, 0) / recent.length;
  return { kcal: Math.round(avg / 10) * 10, latest: recent[recent.length - 1].estimate };
}

// Chart label for a weekly point: "Now" for today, else "N weeks ago".
export function weeksAgoLabel(date: string, today: string): string {
  const weeks = Math.round((Date.parse(today) - Date.parse(date)) / (7 * 86_400_000));
  return weeks === 0 ? 'Now' : `${weeks} ${weeks === 1 ? 'week' : 'weeks'} ago`;
}
