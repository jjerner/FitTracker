import type { Exercise, WorkoutTemplateExercise } from '../types/domain';

// Ready-made programs. Exercise names must match built-in exercises (checked by a test).
// Adding a program copies each routine into the user's own routines, so they can edit it freely.
export type Program = {
  id: string;
  name: string;
  description: string;
  routines: { name: string; exercises: [name: string, sets: number, reps: number][] }[];
};

export const PROGRAMS: Program[] = [
  {
    id: 'upper-lower',
    name: 'Upper/Lower',
    description: '4 days a week: Upper, Lower, rest, Upper, Lower.',
    routines: [
      {
        name: 'Upper',
        exercises: [
          ['Bench Press', 5, 5],
          ['Pull-up', 5, 5],
          ['Lateral Raise', 5, 5],
          ['Hammer Curl', 5, 5],
        ],
      },
      {
        name: 'Lower',
        exercises: [
          ['Back Squat', 5, 5],
          ['Romanian Deadlift', 5, 5],
          ['Calf Raise', 5, 5],
        ],
      },
    ],
  },
  {
    id: 'push-pull-legs',
    name: 'Push/Pull/Legs',
    description: '3–6 days a week: Push, Pull, Legs, then repeat.',
    routines: [
      {
        name: 'Push',
        exercises: [
          ['Incline Bench Press', 5, 5],
          ['Pec Deck', 4, 5],
          ['Lateral Raise', 5, 5],
          ['Tricep Pushdown', 5, 5],
        ],
      },
      {
        name: 'Pull',
        exercises: [
          ['Lat Pulldown', 5, 5],
          ['Seated Cable Row', 4, 5],
          ['Face Pull', 5, 5],
          ['Hammer Curl', 5, 5],
        ],
      },
      {
        name: 'Legs',
        exercises: [
          ['Back Squat', 5, 5],
          ['Leg Extension', 4, 5],
          ['Seated Leg Curl', 4, 5],
          ['Calf Raise', 5, 5],
        ],
      },
    ],
  },
];

// Turns a program routine into routine rows, using the built-in exercises (not a custom one with the same name).
export function routineExercises(
  routine: Program['routines'][number],
  catalog: Exercise[],
): WorkoutTemplateExercise[] {
  return routine.exercises.map(([name, sets, reps]) => {
    const exercise = catalog.find((e) => !e.isCustom && e.name === name);
    if (!exercise) throw new Error(`Exercise not found: ${name}`);
    return { exercise, targetSets: sets, targetReps: reps, targetWeightKg: null, restSeconds: null };
  });
}
