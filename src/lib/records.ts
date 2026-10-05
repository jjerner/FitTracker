import { localDateDaysAgo, localDateOf } from './dateUtils';
import type { ExerciseSession, WorkoutSet } from '../types/domain';

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
  return sets.reduce<Bests>(
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
  for (const set of session.sets) {
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

export type NewRecords ={ weight: boolean; oneRM: boolean };

// A record needs earlier history to beat; the very first time doing an exercise isn't one.
export function findNewRecords(sets: WorkoutSet[], earlier: ExerciseSession[]): NewRecords {
  if (earlier.length === 0) return { weight: false, oneRM: false };
  const prior = bestOfSessions(earlier);
  const now = bestOf(sets);
  return {
    weight: now.weightKg > prior.weightKg,
    oneRM: Math.round(now.oneRM) > Math.round(prior.oneRM),
  };
}
