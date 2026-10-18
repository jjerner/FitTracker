import { bestOf, findNewRecords, setLabels, trackedStats, workingSets } from '../records';
import type { ExerciseSession, SetType } from '../../types/domain';

type TestSet = { weightKg: number; reps: number; setType?: SetType };

// Midday UTC, so the local date is the same in any time zone.
function session(isoDate: string, sets: TestSet[]): ExerciseSession {
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
      setType: s.setType ?? 'normal',
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

const warmup = (weightKg: number, reps: number): TestSet => ({ weightKg, reps, setType: 'warmup' });

describe('warm-up sets', () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-10-11T12:00:00Z'));
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('workingSets leaves warm-ups out', () => {
    const { sets } = session('2026-10-10', [warmup(40, 10), { weightKg: 80, reps: 5 }]);
    expect(workingSets(sets).map((s) => s.weightKg)).toEqual([80]);
  });

  it('bestOf ignores a heavier warm-up', () => {
    const { sets } = session('2026-10-10', [warmup(120, 1), { weightKg: 80, reps: 5 }]);
    expect(bestOf(sets).weightKg).toBe(80);
  });

  it('trackedStats uses the heaviest working set, and skips warm-up-only sessions', () => {
    const stats = trackedStats([
      session('2026-10-10', [warmup(120, 1), { weightKg: 90, reps: 5 }]),
      session('2026-10-05', [warmup(200, 1)]),
    ]);
    expect(stats.current).toMatchObject({ weightKg: 90, reps: 5 });
    expect(stats.pr).toMatchObject({ weightKg: 90, reps: 5 });
    expect(trackedStats([session('2026-10-10', [warmup(60, 10)])]).current).toBeNull();
  });

  it('findNewRecords needs an earlier working set', () => {
    const earlier = [session('2026-10-05', [warmup(40, 10)])];
    const now = session('2026-10-10', [{ weightKg: 80, reps: 5 }]).sets;
    expect(findNewRecords(now, earlier)).toEqual({ weight: false, oneRM: false });
  });

  it('findNewRecords: a warm-up above the best is no record, a working set is', () => {
    const earlier = [session('2026-10-05', [{ weightKg: 80, reps: 5 }])];
    const warm = session('2026-10-10', [warmup(100, 5), { weightKg: 60, reps: 5 }]).sets;
    expect(findNewRecords(warm, earlier)).toEqual({ weight: false, oneRM: false });
    const work = session('2026-10-10', [warmup(40, 10), { weightKg: 100, reps: 5 }]).sets;
    expect(findNewRecords(work, earlier)).toEqual({ weight: true, oneRM: true });
  });
});

describe('setLabels', () => {
  it('numbers only working sets', () => {
    expect(setLabels(['warmup', 'warmup', 'normal', 'normal'])).toEqual(['W', 'W', '1', '2']);
    expect(setLabels(['normal', 'warmup', 'normal'])).toEqual(['1', 'W', '2']);
    expect(setLabels([])).toEqual([]);
  });
});
