import { foodRow, toCsv, weightsCsv, workoutRows } from '../exportData';

// Fake Supabase: each awaited query answers with the next page in mockPages; range calls are recorded.
let mockPages: unknown[][];
const mockRanges: number[][] = [];
jest.mock('../supabase', () => ({
  supabase: {
    from: () => {
      const query: any = {};
      for (const method of ['select', 'eq', 'order']) query[method] = () => query;
      query.range = (from: number, to: number) => (mockRanges.push([from, to]), query);
      query.then = (resolve: (value: unknown) => void) =>
        resolve({ data: mockPages.shift(), error: null });
      return query;
    },
  },
}));
jest.mock('expo-file-system', () => ({ File: jest.fn(), Paths: {} }));
jest.mock('expo-sharing', () => ({}));

describe('toCsv', () => {
  it('starts with the BOM, joins rows with CRLF and leaves plain cells alone', () => {
    expect(toCsv([['a', 1, 2.5], [null, 'b', 0]])).toBe('﻿a,1,2.5\r\n,b,0');
  });

  it('quotes cells with a comma, quote or line break and doubles quotes', () => {
    expect(toCsv([['Ost, mild', 'say "hi"', 'one\ntwo', 'one\r\ntwo']])).toBe(
      '﻿"Ost, mild","say ""hi""","one\ntwo","one\r\ntwo"'
    );
  });

  it('prefixes text that starts like a formula, but not numbers', () => {
    expect(toCsv([['=1+1', -5]])).toBe("﻿'=1+1,-5");
  });
});

describe('foodRow amount', () => {
  const entry = {
    logged_date: '2026-10-01',
    meal_type: 'lunch',
    food_name: 'Rice',
    calories_kcal: 130.4,
    protein_g: 2.71,
    carbs_g: 28.04,
    fat_g: 0.3,
    fiber_g: null,
    serving_g: null,
    foods: { serving_size_g: 80 },
  };

  it('uses grams as stored and rounds the numbers', () => {
    expect(foodRow({ ...entry, quantity: 150, quantity_unit: 'g' })).toEqual([
      '2026-10-01', 'lunch', 'Rice', 150, 130, 2.7, 28, 0.3, null,
    ]);
  });

  it('multiplies servings by serving_g', () => {
    expect(foodRow({ ...entry, quantity: 2, quantity_unit: 'serving', serving_g: 45 })[3]).toBe(90);
  });

  it('falls back to the food serving size', () => {
    expect(foodRow({ ...entry, quantity: 1.5, quantity_unit: 'serving' })[3]).toBe(120);
  });

  it('leaves quick-add entries empty', () => {
    expect(foodRow({ ...entry, quantity: 1, quantity_unit: 'serving', foods: null })[3]).toBeNull();
  });
});

describe('workoutRows', () => {
  it('writes cardio in seconds and km, strength with empty cells, sorted by position and set', () => {
    const log = {
      name: 'Mixed',
      started_at: '2026-10-01T10:00:00Z',
      workout_log_exercises: [
        {
          position: 1,
          exercises: { name: 'Running' },
          workout_log_sets: [
            { set_number: 1, reps: null, weight_kg: null, duration_s: 1800, distance_m: 5000, set_type: 'normal' },
          ],
        },
        {
          position: 0,
          exercises: { name: 'Squat' },
          workout_log_sets: [
            { set_number: 2, reps: 5, weight_kg: 100, duration_s: null, distance_m: null, set_type: 'normal' },
            { set_number: 1, reps: 8, weight_kg: 60, duration_s: null, distance_m: null, set_type: 'warmup' },
            { set_number: 3, reps: 8, weight_kg: 80, duration_s: null, distance_m: null, set_type: 'drop' },
          ],
        },
      ],
    };
    expect(workoutRows(log).map((row) => row.slice(2))).toEqual([
      ['Squat', 1, 8, 60, null, null, 'warmup'],
      ['Squat', 2, 5, 100, null, null, 'normal'],
      ['Squat', 3, 8, 80, null, null, 'drop'],
      ['Running', 1, null, null, 1800, 5, 'normal'],
    ]);
  });
});

it('reads every page until a short one', async () => {
  const row = { logged_date: '2026-10-01', weight_kg: 80 };
  mockPages = [Array(1000).fill(row), Array(3).fill(row)];
  const csv = await weightsCsv('user-1');
  expect(csv.split('\r\n')).toHaveLength(1004);
  expect(mockRanges).toEqual([
    [0, 999],
    [1000, 1999],
  ]);
});
