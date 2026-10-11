import { trackedStats } from '../records';
import type { ExerciseSession } from '../../types/domain';

// Midday UTC, so the local date is the same in any time zone.
function session(isoDate: string, sets: { weightKg: number; reps: number }[]): ExerciseSession {
  return {
    logId: isoDate,
    startedAt: `${isoDate}T12:00:00Z`,
    sets: sets.map((s, i) => ({
      id: `${isoDate}-${i}`,
      setNumber: i + 1,
      weightKg: s.weightKg,
      reps: s.reps,
      durationS: null,
      distanceM: null,
    })),
  };
}

describe('trackedStats', () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-10-11T12:00:00Z'));
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('has nothing to show without sessions', () => {
    expect(trackedStats([])).toEqual({ current: null, pr: null, change30: null, change90: null });
  });

  it('uses the heaviest set per session, and compares with older sessions', () => {
    // Newest first, like the app passes them.
    const stats = trackedStats([
      session('2026-10-10', [{ weightKg: 80, reps: 8 }, { weightKg: 100, reps: 5 }]),
      session('2026-09-05', [{ weightKg: 90, reps: 5 }]),
      session('2026-06-01', [{ weightKg: 80, reps: 5 }]),
    ]);
    expect(stats.current).toMatchObject({ weightKg: 100, reps: 5, date: '2026-10-10' });
    expect(stats.pr).toMatchObject({ weightKg: 100, reps: 5 });
    expect(stats.change30).toBe(10);
    expect(stats.change90).toBe(20);
  });

  it('lets more reps win a tie on weight', () => {
    const stats = trackedStats([
      session('2026-10-10', [{ weightKg: 100, reps: 3 }, { weightKg: 100, reps: 6 }]),
    ]);
    expect(stats.current).toMatchObject({ weightKg: 100, reps: 6 });
  });

  it('gives no change when there is no session old enough to compare with', () => {
    const stats = trackedStats([
      session('2026-10-10', [{ weightKg: 100, reps: 5 }]),
      session('2026-10-05', [{ weightKg: 95, reps: 5 }]),
    ]);
    expect(stats.change30).toBeNull();
    expect(stats.change90).toBeNull();
  });
});
