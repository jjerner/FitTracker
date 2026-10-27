import {
  bestOf,
  bestVolume,
  findNewRecords,
  matchingSet,
  repBests,
  setLabels,
  setsVolume,
  trackedStats,
  workingSets,
} from '../records';
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
    expect(findNewRecords(now, earlier)).toEqual({ weight: false, oneRM: false, volume: false });
  });

  it('findNewRecords: a warm-up above the best is no record, a working set is', () => {
    const earlier = [session('2026-10-05', [{ weightKg: 80, reps: 5 }])];
    const warm = session('2026-10-10', [warmup(100, 5), { weightKg: 60, reps: 5 }]).sets;
    expect(findNewRecords(warm, earlier)).toEqual({ weight: false, oneRM: false, volume: false });
    const work = session('2026-10-10', [warmup(40, 10), { weightKg: 100, reps: 5 }]).sets;
    expect(findNewRecords(work, earlier)).toEqual({ weight: true, oneRM: true, volume: true });
  });
});

describe('setLabels', () => {
  it('numbers only working sets', () => {
    expect(setLabels(['warmup', 'warmup', 'normal', 'normal'])).toEqual(['W', 'W', '1', '2']);
    expect(setLabels(['normal', 'warmup', 'normal'])).toEqual(['1', 'W', '2']);
    expect(setLabels([])).toEqual([]);
  });
});

describe('matchingSet', () => {
  // Last time: W 40, W 60, 1: 80, 2: 85
  const last = session('2026-10-10', [warmup(40, 10), warmup(60, 5), { weightKg: 80, reps: 5 }, { weightKg: 85, reps: 5 }]).sets;

  it('matches working rows to last working sets and warm-ups to last warm-ups', () => {
    const types: SetType[] = ['warmup', 'normal', 'normal'];
    expect(matchingSet(last, types, 0)?.weightKg).toBe(40);
    expect(matchingSet(last, types, 1)?.weightKg).toBe(80);
    expect(matchingSet(last, types, 2)?.weightKg).toBe(85);
  });

  it('returns undefined past the end of that type', () => {
    expect(matchingSet(last, ['warmup', 'warmup', 'warmup'], 2)).toBeUndefined();
  });
});


describe('volume', () => {
  it('setsVolume sums kg × reps of working sets', () => {
    expect(setsVolume(session('2026-10-10', [{ weightKg: 100, reps: 5 }, { weightKg: 80, reps: 8 }]).sets)).toBe(1140);
    expect(setsVolume(session('2026-10-10', [warmup(60, 10), { weightKg: 100, reps: 5 }]).sets)).toBe(500);
  });

  it('bestVolume picks the biggest workout, and is 0 without any', () => {
    const sessions = [
      session('2026-10-10', [{ weightKg: 100, reps: 5 }]),
      session('2026-10-05', [{ weightKg: 60, reps: 10 }, { weightKg: 60, reps: 10 }]),
    ];
    expect(bestVolume(sessions)).toBe(1200);
    expect(bestVolume([])).toBe(0);
  });
});

describe('repBests', () => {
  const weights = (rows: ReturnType<typeof repBests>) => rows.map((r) => r.weightKg);

  it('a set counts for its rep count and every lower one', () => {
    const rows = repBests([session('2026-10-10', [{ weightKg: 100, reps: 5 }])]);
    expect(rows.map((r) => r.reps)).toEqual([1, 2, 3, 4, 5]);
    expect(weights(rows)).toEqual([100, 100, 100, 100, 100]);
  });

  it('a heavier set with fewer reps wins the lower rows', () => {
    const rows = repBests([session('2026-10-10', [{ weightKg: 100, reps: 5 }, { weightKg: 110, reps: 3 }])]);
    expect(weights(rows)).toEqual([110, 110, 110, 100, 100]);
  });

  it('stops at 12 reps', () => {
    const rows = repBests([session('2026-10-10', [{ weightKg: 60, reps: 15 }])]);
    expect(rows).toHaveLength(12);
    expect(rows.at(-1)).toMatchObject({ reps: 12, weightKg: 60 });
  });

  it('ignores warm-ups and 0 kg sets', () => {
    expect(repBests([session('2026-10-10', [warmup(100, 5), { weightKg: 0, reps: 10 }])])).toEqual([]);
  });

  it('on a tie the older workout wins', () => {
    const rows = repBests([
      session('2026-10-10', [{ weightKg: 100, reps: 5 }]),
      session('2026-10-05', [{ weightKg: 100, reps: 5 }]),
    ]);
    expect(rows[0].startedAt).toBe('2026-10-05T12:00:00Z');
  });

  it('is empty without sessions', () => {
    expect(repBests([])).toEqual([]);
  });
});

describe('findNewRecords volume', () => {
  const earlier = [session('2026-10-05', [{ weightKg: 100, reps: 5 }, { weightKg: 100, reps: 5 }])];

  it('is true when today beats the best earlier workout', () => {
    const now = session('2026-10-10', [{ weightKg: 60, reps: 10 }, { weightKg: 60, reps: 10 }]).sets;
    expect(findNewRecords(now, earlier)).toEqual({ weight: false, oneRM: false, volume: true });
  });

  it('is false on a tie, or when only a warm-up pushes it over', () => {
    const tie = session('2026-10-10', [{ weightKg: 50, reps: 10 }, { weightKg: 50, reps: 10 }]).sets;
    expect(findNewRecords(tie, earlier).volume).toBe(false);
    const warm = session('2026-10-10', [warmup(40, 10), { weightKg: 50, reps: 10 }, { weightKg: 50, reps: 10 }]).sets;
    expect(findNewRecords(warm, earlier).volume).toBe(false);
  });

  it('is false with no earlier working sets', () => {
    const now = session('2026-10-10', [{ weightKg: 60, reps: 10 }]).sets;
    expect(findNewRecords(now, [session('2026-10-05', [warmup(20, 5)])]).volume).toBe(false);
  });

  it('can be a weight record and a volume record at once', () => {
    const now = session('2026-10-10', [{ weightKg: 110, reps: 5 }, { weightKg: 100, reps: 5 }]).sets;
    expect(findNewRecords(now, earlier)).toMatchObject({ weight: true, volume: true });
  });
});
