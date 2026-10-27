import {
  bestOf,
  bestVolume,
  dropGroups,
  supersetRoles,
  findNewRecords,
  matchingSet,
  nextSetType,
  repBests,
  setLabels,
  setsVolume,
  shownSets,
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

describe('shownSets', () => {
  const [a, b, c] = session('2026-10-10', [{ weightKg: 80, reps: 5 }, { weightKg: 85, reps: 5 }, { weightKg: 90, reps: 3 }]).sets;

  it('appends added sets the log does not have yet', () => {
    expect(shownSets([a, b], [c], new Set())).toEqual([a, b, c]);
  });

  it('shows a set once when it is both added and in the log', () => {
    expect(shownSets([a, b], [b], new Set())).toEqual([a, b]);
  });

  it('leaves out hidden ids from the log, added, or both', () => {
    expect(shownSets([a, b], [c], new Set([a.id]))).toEqual([b, c]);
    expect(shownSets([a, b], [c], new Set([c.id]))).toEqual([a, b]);
    expect(shownSets([a, b], [b], new Set([b.id]))).toEqual([a]);
  });

  it('returns the log sets unchanged when nothing is added or hidden', () => {
    expect(shownSets([a, b], [], new Set())).toEqual([a, b]);
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

const drop = (weightKg: number, reps: number): TestSet => ({ weightKg, reps, setType: 'drop' });

describe('drop sets', () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-10-11T12:00:00Z'));
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('setLabels gives drop steps no number', () => {
    expect(setLabels(['warmup', 'normal', 'drop', 'drop', 'normal'])).toEqual(['W', '1', '↓', '↓', '2']);
  });

  it('nextSetType cycles 1 → W → ↓ → 1, with ↓ only under a working set or a drop', () => {
    expect(nextSetType(['normal'], 0)).toBe('warmup');
    expect(nextSetType(['warmup'], 0)).toBe('normal');
    for (const above of ['normal', 'drop'] as SetType[]) {
      expect(nextSetType([above, 'normal'], 1)).toBe('warmup');
      expect(nextSetType([above, 'warmup'], 1)).toBe('drop');
      expect(nextSetType([above, 'drop'], 1)).toBe('normal');
    }
    expect(nextSetType(['warmup', 'normal'], 1)).toBe('warmup');
    expect(nextSetType(['warmup', 'warmup'], 1)).toBe('normal');
  });

  it('dropGroups puts a drop step on the line above it', () => {
    expect(dropGroups(['warmup', 'normal', 'drop', 'drop', 'normal'])).toEqual([[0], [1, 2, 3], [4]]);
    expect(dropGroups(['drop', 'normal'])).toEqual([[0], [1]]);
    expect(dropGroups(['warmup', 'drop'])).toEqual([[0, 1]]);
  });

  it('supersetRoles pairs a card with the one below, pairs only', () => {
    expect(supersetRoles([])).toEqual([]);
    expect(supersetRoles([true])).toEqual([null]);
    expect(supersetRoles([true, false])).toEqual(['first', 'second']);
    expect(supersetRoles([true, true, false])).toEqual(['first', 'second', null]);
    expect(supersetRoles([true, true, true, false])).toEqual(['first', 'second', 'first', 'second']);
    expect(supersetRoles([false, true])).toEqual([null, null]);
    expect(supersetRoles([true, true, true])).toEqual(['first', 'second', null]);
  });

  it('matchingSet matches a drop step by its place under the matching set', () => {
    // Last time: 1: 80×8 ↓ 60×6 ↓ 40×6, 2: 75×8
    const last = session('2026-10-10', [{ weightKg: 80, reps: 8 }, drop(60, 6), drop(40, 6), { weightKg: 75, reps: 8 }]).sets;
    const types: SetType[] = ['normal', 'drop', 'drop', 'normal', 'drop'];
    expect(matchingSet(last, types, 1)?.weightKg).toBe(60);
    expect(matchingSet(last, types, 2)?.weightKg).toBe(40);
    expect(matchingSet(last, types, 3)?.weightKg).toBe(75);
    expect(matchingSet(last, types, 4)).toBeUndefined();
  });

  it('records count only the first step', () => {
    const { sets } = session('2026-10-10', [{ weightKg: 80, reps: 8 }, drop(75, 12)]);
    expect(workingSets(sets).map((s) => s.weightKg)).toEqual([80]);
    expect(bestOf(sets).oneRM).toBeCloseTo(101.33, 1);
    const rows = repBests([session('2026-10-10', [{ weightKg: 80, reps: 5 }, drop(70, 10)])]);
    expect(rows).toHaveLength(5);
    expect(rows.every((r) => r.weightKg === 80)).toBe(true);
    const stats = trackedStats([session('2026-10-10', [{ weightKg: 60, reps: 5 }, drop(100, 5)])]);
    expect(stats.current).toMatchObject({ weightKg: 60 });
  });

  it('setsVolume counts every step, not warm-ups', () => {
    const sets = session('2026-10-10', [{ weightKg: 50, reps: 2 }, drop(40, 3), drop(30, 3), { weightKg: 45, reps: 5 }]).sets;
    expect(setsVolume(sets)).toBe(535);
    expect(setsVolume(session('2026-10-10', [warmup(20, 10), { weightKg: 50, reps: 2 }, drop(40, 3)]).sets)).toBe(220);
  });

  it('findNewRecords: drop steps can make a volume record, never a weight or 1RM one', () => {
    const earlier = [session('2026-10-05', [{ weightKg: 80, reps: 5 }])];
    const now = session('2026-10-10', [{ weightKg: 60, reps: 5 }, drop(120, 5)]).sets;
    expect(findNewRecords(now, earlier)).toEqual({ weight: false, oneRM: false, volume: true });
  });
});
