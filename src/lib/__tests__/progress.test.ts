import { addDays, mondayOf } from '../dateUtils';
import {
  estimateMaintenance,
  goalStreak,
  smoothedMaintenance,
  weeklyMaintenance,
  weeklyMuscleSets,
  weeksAgoLabel,
  weightTrend,
} from '../progress';

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

test('mondayOf: a Sunday gives the Monday 6 days before, a Monday gives itself', () => {
  expect(mondayOf('2026-10-18')).toBe('2026-10-12');
  expect(mondayOf('2026-10-12')).toBe('2026-10-12');
});

// ISO timestamp of a local date and hour, so the test works in any time zone.
const at = (date: string, hour = 12) => {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(y, m - 1, d, hour).toISOString();
};
const row = (date: string, muscleGroup: string | null, setCount: number, category = 'strength') => ({
  startedAt: at(date),
  muscleGroup,
  category,
  setCount,
});

describe('weeklyMuscleSets', () => {
  const weeks = ['2026-09-21', '2026-09-28', '2026-10-05', '2026-10-12'];

  test('adds sets per group and week, skips cardio, puts other last', () => {
    const result = weeklyMuscleSets(
      [
        row('2026-10-13', 'chest', 3),
        row('2026-10-14', 'legs', 4),
        row('2026-10-15', ' Chest', 2), // merged with "chest"
        row('2026-09-22', 'chest', 1),
        row('2026-10-13', 'cardio', 1, 'cardio'),
        row('2026-10-13', null, 2),
        row('2026-10-06', '', 1),
        row('2026-09-14', 'back', 5), // before the oldest week
        row('2026-10-13', 'arms', 0), // only zeros
      ],
      weeks
    );
    expect(result).toEqual([
      { group: 'chest', counts: [1, 0, 0, 5] },
      { group: 'legs', counts: [0, 0, 0, 4] },
      { group: 'other', counts: [0, 0, 1, 2] },
    ]);
  });

  test('a workout on Sunday evening counts in that week', () => {
    const result = weeklyMuscleSets(
      [{ startedAt: at('2026-10-11', 22), muscleGroup: 'legs', category: 'strength', setCount: 3 }],
      weeks
    );
    expect(result).toEqual([{ group: 'legs', counts: [0, 0, 3, 0] }]);
  });
});

describe('estimateMaintenance', () => {
  const today = '2026-10-19';
  // One entry per day from `from` to `to` days ago (inclusive), oldest first.
  const span = (from: number, to: number) =>
    Array.from({ length: from - to + 1 }, (_, i) => addDays(today, -(from - i)));
  const food = (dates: string[], caloriesKcal = 2000) =>
    dates.map((date) => ({ date, caloriesKcal, proteinG: 0, carbsG: 0, fatG: 0 }));
  // Weigh-ins from 40 days ago, changing `kgPerDay` each day.
  const weighIns = (kgPerDay: number) =>
    span(40, 1).map((date, i) => ({ date, weightKg: 80 + i * kgPerDay }));
  const fourWeeks = span(28, 1);

  test('flat weight gives the average intake', () => {
    const days = [...food(fourWeeks.slice(0, 14), 1800), ...food(fourWeeks.slice(14), 2200)];
    expect(estimateMaintenance(weighIns(0), days, today)).toEqual({
      kcal: 2000,
      loggedDays: 28,
      skippedDays: 0,
      daysBetween: 27,
      trendChangeKg: 0,
    });
  });

  test('a falling trend adds change × 7700 / days', () => {
    // Trend falls 0.1 kg/day over 27 days: 2.7 × 7700 / 27 = 770.
    const result = estimateMaintenance(weighIns(-0.1), food(fourWeeks), today);
    expect(result?.trendChangeKg).toBeCloseTo(-2.7);
    expect(result?.kcal).toBe(2770);
  });

  test('a rising trend takes it off', () => {
    expect(estimateMaintenance(weighIns(0.1), food(fourWeeks), today)?.kcal).toBe(1230);
  });

  test("today's food and weigh-in are left out", () => {
    const weights = [...weighIns(0), { date: today, weightKg: 60 }];
    const result = estimateMaintenance(weights, [...food(fourWeeks), ...food([today], 5000)], today);
    expect(result?.kcal).toBe(2000);
    expect(result?.trendChangeKg).toBe(0);
  });

  test('days with nothing logged are skipped, not counted as 0', () => {
    const result = estimateMaintenance(weighIns(0), food(fourWeeks.slice(0, 20)), today);
    expect(result).toMatchObject({ kcal: 2000, loggedDays: 20, skippedDays: 0 });
  });

  test('days under half the median are skipped and counted as skipped', () => {
    const days = [...food(fourWeeks.slice(0, 20)), ...food(fourWeeks.slice(20, 22), 500)];
    expect(estimateMaintenance(weighIns(0), days, today)).toMatchObject({
      kcal: 2000,
      loggedDays: 20,
      skippedDays: 2,
    });
  });

  test('a day exactly at half the median is kept, just under is skipped', () => {
    const days = [
      ...food(fourWeeks.slice(0, 20)),
      ...food(fourWeeks.slice(20, 21), 1000),
      ...food(fourWeeks.slice(21, 22), 999),
    ];
    expect(estimateMaintenance(weighIns(0), days, today)).toMatchObject({ loggedDays: 21, skippedDays: 1 });
  });

  test('an even number of days uses the mean of the middle two as the median', () => {
    // Median (1000 + 3000) / 2 = 2000, so the 900s fall under half and the 1000s don't.
    const days = [
      ...food(fourWeeks.slice(0, 2), 900),
      ...food(fourWeeks.slice(2, 9), 1000),
      ...food(fourWeeks.slice(9, 18), 3000),
    ];
    expect(estimateMaintenance(weighIns(0), days, today)).toMatchObject({ loggedDays: 16, skippedDays: 2 });
  });

  test('food 28 days back is in the window, 29 days back is not', () => {
    expect(estimateMaintenance(weighIns(0), food(span(28, 1)), today)?.loggedDays).toBe(28);
    expect(estimateMaintenance(weighIns(0), food(span(29, 1)), today)?.loggedDays).toBe(28);
  });

  test('skipped days do not count toward the 14', () => {
    const days = [...food(fourWeeks.slice(0, 13)), ...food(fourWeeks.slice(13, 16), 500)];
    expect(estimateMaintenance(weighIns(0), days, today)).toBeNull();
  });

  test('fewer than 14 food days gives null', () => {
    expect(estimateMaintenance(weighIns(0), food(fourWeeks.slice(0, 13)), today)).toBeNull();
    expect(estimateMaintenance(weighIns(0), food(fourWeeks.slice(0, 14)), today)).not.toBeNull();
  });

  test('weigh-ins under 14 days apart give null', () => {
    const weights = (from: number) => [from, 1].map((d) => ({ date: addDays(today, -d), weightKg: 80 }));
    expect(estimateMaintenance(weights(14), food(fourWeeks), today)).toBeNull();
    expect(estimateMaintenance(weights(15), food(fourWeeks), today)?.daysBetween).toBe(14);
  });

  test('no weigh-ins in the window gives null', () => {
    expect(estimateMaintenance([], food(fourWeeks), today)).toBeNull();
    expect(estimateMaintenance(span(60, 29).map((date) => ({ date, weightKg: 80 })), food(fourWeeks), today)).toBeNull();
  });

  // Nested so they reuse span/food/weighIns above.
  describe('weeklyMaintenance', () => {
    const longWeights = span(120, 1).map((date) => ({ date, weightKg: 80 }));
    const longFood = food(span(120, 1));

    test('one estimate per week, oldest first, each the rule run on that date', () => {
      const result = weeklyMaintenance(longWeights, longFood, today, 12);
      expect(result.map((w) => w.date)).toEqual(
        Array.from({ length: 12 }, (_, i) => addDays(today, -7 * (11 - i)))
      );
      for (const w of result) expect(w.estimate).toEqual(estimateMaintenance(longWeights, longFood, w.date));
    });

    test('weeks without enough data are left out', () => {
      const result = weeklyMaintenance(longWeights, food(fourWeeks), today, 12);
      expect(result.map((w) => w.date)).toEqual([addDays(today, -14), addDays(today, -7), today]);
    });

    test('no data gives []', () => {
      expect(weeklyMaintenance([], [], today, 12)).toEqual([]);
    });
  });

  describe('smoothedMaintenance', () => {
    const wk = (daysBack: number, kcal: number) => ({
      date: addDays(today, -daysBack),
      estimate: { kcal, loggedDays: 20, skippedDays: 0, daysBetween: 20, trendChangeKg: 0 },
    });

    test('averages the last 3 weeks, rounded to 10, older weeks ignored', () => {
      const weekly = [wk(21, 9000), wk(14, 2000), wk(7, 2100), wk(0, 2300)];
      expect(smoothedMaintenance(weekly, today)).toEqual({ kcal: 2130, latest: weekly[3].estimate });
    });

    test('a missing week is not counted as 0', () => {
      expect(smoothedMaintenance([wk(14, 2000), wk(0, 2100)], today)?.kcal).toBe(2050);
    });

    test('without this week, latest is the week before', () => {
      const weekly = [wk(14, 2000), wk(7, 2100)];
      expect(smoothedMaintenance(weekly, today)?.latest).toBe(weekly[1].estimate);
    });

    test('only older weeks, or none, gives null', () => {
      expect(smoothedMaintenance([wk(21, 2000)], today)).toBeNull();
      expect(smoothedMaintenance([], today)).toBeNull();
    });
  });

  test('weeksAgoLabel', () => {
    expect(weeksAgoLabel(today, today)).toBe('Now');
    expect(weeksAgoLabel(addDays(today, -7), today)).toBe('1 week ago');
    expect(weeksAgoLabel(addDays(today, -77), today)).toBe('11 weeks ago');
  });
});
