import { localDateDaysAgo, localDateOf } from './dateUtils';
import type { ExerciseSession, SetType, WorkoutSet } from '../types/domain';

// Warm-ups and drop steps never count towards records or the chart; only a drop set's first step does.
export function workingSets(sets: WorkoutSet[]): WorkoutSet[] {
  return sets.filter((s) => s.setType === 'normal');
}

// Strong-style numbers: warm-ups show "W", drop steps "↓", only working sets are numbered (W, 1, ↓, ↓, 2).
export function setLabels(types: SetType[]): string[] {
  let n = 0;
  return types.map((t) => (t === 'warmup' ? 'W' : t === 'drop' ? '↓' : String(++n)));
}

// Last time's set for row `index`: same position among sets of the same type,
// so working set 1 matches last time's working set 1 even if warm-ups came first.
// A drop step matches the step in the same place under last time's matching set.
export function matchingSet(previous: WorkoutSet[], types: SetType[], index: number): WorkoutSet | undefined {
  const t = types[index];
  if (t !== 'drop') {
    const position = types.slice(0, index).filter((x) => x === t).length;
    return previous.filter((s) => s.setType === t)[position];
  }
  let parent = index - 1;
  while (parent >= 0 && types[parent] === 'drop') parent--;
  if (parent < 0) return undefined;
  const p = matchingSet(previous, types, parent);
  if (!p) return undefined;
  const start = previous.indexOf(p);
  const steps = previous.slice(start + 1, start + 1 + index - parent);
  return steps.length === index - parent && steps.every((s) => s.setType === 'drop') ? steps.at(-1) : undefined;
}

// Badge cycle 1 → W → ↓ → 1. ↓ only goes under a working set or another ↓.
export function nextSetType(types: SetType[], index: number): SetType {
  const t = types[index];
  if (t === 'normal') return 'warmup';
  if (t === 'warmup' && index > 0 && types[index - 1] !== 'warmup') return 'drop';
  return 'normal';
}

// Row indexes per history line: a drop step joins the line above it.
export function dropGroups(types: SetType[]): number[][] {
  const groups: number[][] = [];
  types.forEach((t, i) => {
    if (t === 'drop' && groups.length) groups[groups.length - 1].push(i);
    else groups.push([i]);
  });
  return groups;
}

// Superset role per card, top to bottom: a flag pairs a card with the one below, pairs only.
export function supersetRoles(flags: boolean[]): ('first' | 'second' | null)[] {
  const roles: ('first' | 'second' | null)[] = [];
  flags.forEach((flag, i) => {
    roles.push(roles[i - 1] === 'first' ? 'second' : flag && i < flags.length - 1 ? 'first' : null);
  });
  return roles;
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

// Total kg × reps in one workout: every drop step counts, warm-ups don't.
export function setsVolume(sets: WorkoutSet[]): number {
  return sets.filter((s) => s.setType !== 'warmup').reduce((sum, s) => sum + Number(s.weightKg ?? 0) * Number(s.reps ?? 0), 0);
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
