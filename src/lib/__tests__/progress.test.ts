import { weightTrend } from '../progress';

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
