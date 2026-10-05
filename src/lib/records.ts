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

export type NewRecords = { weight: boolean; oneRM: boolean };

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
