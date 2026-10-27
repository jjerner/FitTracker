import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

import { localDateOf, todayLocalDate } from './dateUtils';
import { supabase } from './supabase';

type Cell = string | number | null;

const PAGE = 1000;

// RFC 4180 CSV with a UTF-8 BOM, so Excel reads å/ä/ö.
export function toCsv(rows: Cell[][]): string {
  const cell = (value: Cell) => {
    if (value == null) return '';
    // Stop Excel/Sheets running a text cell as a formula; numbers like -5 stay as they are.
    const text = typeof value === 'string' && /^[=+\-@\t\r]/.test(value) ? `'${value}` : String(value);
    return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  return '﻿' + rows.map((row) => row.map(cell).join(',')).join('\r\n');
}

const round1 = (n: number) => Math.round(n * 10) / 10;

// Supabase caps a request at 1000 rows, so read page by page until a short page.
async function fetchAll(
  page: (from: number, to: number) => PromiseLike<{ data: any[] | null; error: unknown }>
): Promise<any[]> {
  const rows: any[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await page(from, from + PAGE - 1);
    if (error) throw error;
    rows.push(...(data ?? []));
    if ((data ?? []).length < PAGE) return rows;
  }
}

// Same grams rule as entryNutrition. Quick-add entries have no food, so no grams.
export function foodRow(e: any): Cell[] {
  const grams = !e.foods
    ? null
    : e.quantity_unit === 'g'
      ? e.quantity
      : e.quantity * (e.serving_g ?? e.foods.serving_size_g ?? 100);
  return [
    e.logged_date,
    e.meal_type,
    e.food_name,
    grams == null ? null : round1(grams),
    Math.round(e.calories_kcal),
    round1(e.protein_g),
    round1(e.carbs_g),
    round1(e.fat_g),
    e.fiber_g == null ? null : round1(e.fiber_g),
  ];
}

// One row per set, exercises by position and sets by set number (like getWorkoutLog).
export function workoutRows(log: any): Cell[][] {
  const date = localDateOf(new Date(log.started_at));
  return [...(log.workout_log_exercises ?? [])]
    .sort((a: any, b: any) => a.position - b.position)
    .flatMap((le: any) =>
      [...(le.workout_log_sets ?? [])]
        .sort((a: any, b: any) => a.set_number - b.set_number)
        .map((s: any) => [
          date,
          log.name,
          le.exercises.name,
          s.set_number,
          s.reps,
          s.weight_kg,
          s.duration_s,
          s.distance_m == null ? null : s.distance_m / 1000,
          s.set_type,
        ])
    );
}

export async function foodLogCsv(userId: string): Promise<string> {
  const rows = await fetchAll((from, to) =>
    supabase
      .from('food_log_entries')
      .select(
        'logged_date, meal_type, food_name, quantity, quantity_unit, serving_g, calories_kcal, protein_g, carbs_g, fat_g, fiber_g, foods(serving_size_g)'
      )
      .eq('user_id', userId)
      .order('logged_date')
      .order('logged_at')
      .order('id')
      .range(from, to)
  );
  return toCsv([
    ['Date', 'Meal', 'Food', 'Amount (g)', 'kcal', 'Protein (g)', 'Carbs (g)', 'Fat (g)', 'Fiber (g)'],
    ...rows.map(foodRow),
  ]);
}

export async function workoutsCsv(userId: string): Promise<string> {
  const logs = await fetchAll((from, to) =>
    supabase
      .from('workout_logs')
      .select(
        'name, started_at, workout_log_exercises(position, exercises(name), workout_log_sets(set_number, reps, weight_kg, duration_s, distance_m, set_type))'
      )
      .eq('user_id', userId)
      .order('started_at')
      .order('id')
      .range(from, to)
  );
  return toCsv([
    ['Date', 'Workout', 'Exercise', 'Set', 'Reps', 'Weight (kg)', 'Duration (s)', 'Distance (km)', 'Type'],
    ...logs.flatMap(workoutRows),
  ]);
}

export async function weightsCsv(userId: string): Promise<string> {
  const rows = await fetchAll((from, to) =>
    supabase
      .from('body_weights')
      .select('logged_date, weight_kg')
      .eq('user_id', userId)
      .order('logged_date')
      .range(from, to)
  );
  return toCsv([['Date', 'Weight (kg)'], ...rows.map((w) => [w.logged_date, w.weight_kg])]);
}

export const exportFileName = (kind: 'food-log' | 'workouts' | 'weight') =>
  `plucky-${kind}-${todayLocalDate()}.csv`;

// Phone: write to cache and open the share sheet. Web: plain browser download
// (expo-file-system is a stub on web).
export async function shareCsv(fileName: string, csv: string): Promise<void> {
  if (Platform.OS === 'web') {
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
    return;
  }
  if (!(await Sharing.isAvailableAsync())) throw new Error('Sharing is not available');
  const file = new File(Paths.cache, fileName);
  file.create({ overwrite: true });
  file.write(csv);
  await Sharing.shareAsync(file.uri, { mimeType: 'text/csv', dialogTitle: fileName });
}
