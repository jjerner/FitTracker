/// <reference types="node" />
import fs from 'fs';
import path from 'path';

import { PROGRAMS, routineExercises } from '../programs';
import type { Exercise } from '../../types/domain';

// Built-in exercise names, read from the seed migrations (rows look like ('Bench Press', 'strength', ...).
const migrations = path.join(__dirname, '../../../supabase/migrations');
const seeded = new Set(
  fs
    .readdirSync(migrations)
    .flatMap((f: string) => [...fs.readFileSync(path.join(migrations, f), 'utf8').matchAll(/\('([^']+)', *'(?:strength|cardio)'/g)])
    .map((m: RegExpMatchArray) => m[1]),
);

function exercise(name: string, isCustom: boolean): Exercise {
  return { id: `${name}-${isCustom}`, name, category: 'strength', muscleGroup: null, equipment: null, movementPattern: null, isCustom };
}

describe('programs', () => {
  it('only uses built-in exercises', () => {
    const missing = PROGRAMS.flatMap((p) => p.routines.flatMap((r) => r.exercises.map(([name]) => name))).filter(
      (name) => !seeded.has(name),
    );
    expect(missing).toEqual([]);
  });

  it('picks the built-in exercise over a custom one with the same name', () => {
    const catalog = [exercise('Bench Press', true), exercise('Bench Press', false)];
    const [row] = routineExercises({ name: 'Day', exercises: [['Bench Press', 5, 5]] }, catalog);
    expect(row).toEqual({ exercise: catalog[1], targetSets: 5, targetReps: 5, targetWeightKg: null, restSeconds: null });
  });
});
