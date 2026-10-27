import { localDateDaysAgo, localDateOf } from './dateUtils';
import type { ExerciseSession, SetType, WorkoutSet } from '../types/domain';

// Warm-ups never count towards records, the chart or volume.
export function workingSets(sets: WorkoutSet[]): WorkoutSet[] {
  return sets.filter((s) => s.setType !== 'warmup');
}

// Strong-style numbers: warm-ups show "W", only working sets are numbered (W, W, 1, 2).
export function setLabels(types: SetType[]): string[] {
  let n = 0;
  return types.map((t) => (t === 'warmup' ? 'W' : String(++n)));
}

// Last time's set for row `index`: same position among sets of the same type,
// so working set 1 matches last time's working set 1 even if warm-ups came first.
export function matchingSet(previous: WorkoutSet[], types: SetType[], index: number): WorkoutSet | undefined {
  const warmup = types[index] === 'warmup';
  const position = types.slice(0, index).filter((t) => (t === 'warmup') === warmup).length;
  return previous.filter((s) => (s.setType === 'warmup') === warmup)[position];
}

// Estimated one-rep max (Epley formula). A single rep is the weight itself.
export function estimate1RM(weightKg: number, reps: number): number {
  if (weightKg <= 0 || reps <= 0) return 0;
  return reps === 1 ? weightKg : weightKg * (1 + reps / 30);
}

export function setOneRM(set: WorkoutSet): number {
  return estimate1RM(Number(set.weightKg ?? 0), Number(set.reps ?? 0));
}

export type Bests = { weightKg: number; oneRM: number };

// Heaviest weight and highest estimated 1RM across sets.
export function bestOf(sets: WorkoutSet[]): Bests {
  return workingSets(sets).reduce<Bests>(
    (best, set) => ({
      weightKg: Math.max(best.weightKg, Number(set.weightKg ?? 0)),
      oneRM: Math.max(best.oneRM, setOneRM(set)),
    }),
    { weightKg: 0, oneRM: 0 }
  );
}

// Bests over earlier workouts only (pass the sessions to compare against).
export function bestOfSessions(sessions: ExerciseSession[]): Bests {
  return bestOf(sessions.flatMap((s) => s.sets));
}

export type LoggedLift = { weightKg: number; reps: number; date: string };

export type TrackedStats = {
  current: LoggedLift | null;
  pr: LoggedLift | null;
  change30: number | null;
  change90: number | null;
};

// Heaviest logged set, more reps winning a tie. Sets without weight are ignored.
function heaviestSet(session: ExerciseSession): LoggedLift | null {
  let best: LoggedLift | null = null;
  for (const set of workingSets(session.sets)) {
    const weightKg = Number(set.weightKg ?? 0);
    const reps = Number(set.reps ?? 0);
    if (weightKg <= 0) continue;
    if (!best || weightKg > best.weightKg || (weightKg === best.weightKg && reps > best.reps)) {
      best = { weightKg, reps, date: localDateOf(new Date(session.startedAt)) };
    }
  }
  return best;
}

// Logged numbers only, no estimates. Sessions are newest first.
export function trackedStats(sessions: ExerciseSession[]): TrackedStats {
  const lifts = sessions.map(heaviestSet).filter((l): l is LoggedLift => l !== null);
  const current = lifts[0] ?? null;
  const pr = lifts.reduce<LoggedLift | null>(
    (best, l) =>
      !best || l.weightKg > best.weightKg || (l.weightKg === best.weightKg && l.reps > best.reps)
        ? l
        : best,
    null
  );

  // Change vs. the latest session on or before N days ago.
  const changeSince = (days: number): number | null => {
    if (!current) return null;
    const cutoff = localDateDaysAgo(days);
    const older = lifts.slice(1).find((l) => l.date <= cutoff);
    return older ? current.weightKg - older.weightKg : null;
  };

  return { current, pr, change30: changeSince(30), change90: changeSince(90) };
}

// Total kg × reps of the working sets in one workout.
export function setsVolume(sets: WorkoutSet[]): number {
  return workingSets(sets).reduce((sum, s) => sum + Number(s.weightKg ?? 0) * Number(s.reps ?? 0), 0);
}

// Highest one-workout volume.
export function bestVolume(sessions: ExerciseSession[]): number {
  return Math.max(0, ...sessions.map((s) => setsVolume(s.sets)));
}

export type RepBest = { reps: number; weightKg: number; startedAt: string };

// Heaviest weight for each rep count 1-12. A set counts for its reps and every lower count;
// on a tie the earliest workout wins. Rows are always 1..N with no gaps.
export function repBests(sessions: ExerciseSession[]): RepBest[] {
  const bests: RepBest[] = [];
  for (const session of sessions) {
    for (const set of workingSets(session.sets)) {
      const weightKg = Number(set.weightKg ?? 0);
      if (weightKg <= 0) continue;
      for (let reps = 1; reps <= Math.min(Number(set.reps ?? 0), 12); reps++) {
        const b = bests[reps - 1];
        if (!b || weightKg > b.weightKg || (weightKg === b.weightKg && session.startedAt < b.startedAt)) {
          bests[reps - 1] = { reps, weightKg, startedAt: session.startedAt };
        }
      }
    }
  }
  return bests;
}

export type NewRecords ={ weight: boolean; oneRM: boolean; volume: boolean };

// A record needs earlier history to beat; the very first time doing an exercise isn't one.
export function findNewRecords(sets: WorkoutSet[], earlier: ExerciseSession[]): NewRecords {
  if (!earlier.some((s) => workingSets(s.sets).length > 0)) return { weight: false, oneRM: false, volume: false };
  const prior = bestOfSessions(earlier);
  const now = bestOf(sets);
  return {
    weight: now.weightKg > prior.weightKg,
    oneRM: Math.round(now.oneRM) > Math.round(prior.oneRM),
    volume: Math.round(setsVolume(sets)) > Math.round(bestVolume(earlier)),
  };
}
