import { goalStreak, weightTrend } from '../progress';

jest.mock('../supabase', () => ({ supabase: {} }));

test('averages the weigh-ins of the last 7 days, skipping missing days', () => {
  const trend = weightTrend([
    { date: '2026-10-01', weightKg: 80 },
    { date: '2026-10-02', weightKg: 82 },
    { date: '2026-10-07', weightKg: 84 }, // 1st is 6 days back: still inside
    { date: '2026-10-08', weightKg: 86 }, // 1st is 7 days back: dropped
  ]);
  expect(trend).toEqual([80, 81, 82, 84]);
});

describe('goalStreak', () => {
  const goals = { caloriesKcal: 2000, proteinG: 150, carbsG: 200, fatG: 70, fiberG: null };
  const today = '2026-10-18';
  const day = (date: string, caloriesKcal = 2000, proteinG = 150) => ({
    date,
    caloriesKcal,
    proteinG,
    carbsG: 0,
    fatG: 0,
  });
  const hitsToYesterday = [day('2026-10-15'), day('2026-10-16'), day('2026-10-17')];

  test('empty list is 0', () => {
    expect(goalStreak([], goals, today)).toBe(0);
  });

  test('today not yet a hit does not break the streak', () => {
    expect(goalStreak(hitsToYesterday, goals, today)).toBe(3);
    expect(goalStreak([...hitsToYesterday, day(today, 500, 20)], goals, today)).toBe(3);
  });

  test('today being a hit extends the streak', () => {
    expect(goalStreak([...hitsToYesterday, day(today)], goals, today)).toBe(4);
  });

  test('today alone counts as 1', () => {
    expect(goalStreak([day(today)], goals, today)).toBe(1);
  });

  test('a day with nothing logged breaks the streak', () => {
    const days = [day('2026-10-13'), day('2026-10-14'), day('2026-10-16'), day('2026-10-17')];
    expect(goalStreak(days, goals, today)).toBe(2);
  });

  test('exactly 90 % and 110 % of the calorie goal count', () => {
    expect(goalStreak([day('2026-10-16', 1800), day('2026-10-17', 2200)], goals, today)).toBe(2);
  });

  test('outside ±10 % calories or protein just under breaks the streak', () => {
    expect(goalStreak([day('2026-10-16'), day('2026-10-17', 2220)], goals, today)).toBe(0);
    expect(goalStreak([day('2026-10-16'), day('2026-10-17', 1780)], goals, today)).toBe(0);
    expect(goalStreak([day('2026-10-16', 2000, 149), day('2026-10-17')], goals, today)).toBe(1);
  });
});
