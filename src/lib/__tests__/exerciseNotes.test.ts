import { getExerciseNotes, saveExerciseNote, saveWorkoutNote } from '../workouts';

// workouts.ts talks to Supabase; faked here. Every call is recorded and answers with
// mockError (and mockRows for selects).
let mockError: { message: string } | null;
let mockRows: Record<string, unknown>[];
const mockCalls: unknown[][] = [];
jest.mock('../supabase', () => ({
  supabase: {
    from: (table: string) => {
      const query: any = {
        eq: (...args: unknown[]) => (mockCalls.push(['eq', ...args]), query),
        then: (resolve: (v: unknown) => void) => resolve({ data: mockRows, error: mockError }),
      };
      return {
        select: (...args: unknown[]) => (mockCalls.push(['select', table, ...args]), query),
        update: (...args: unknown[]) => (mockCalls.push(['update', table, ...args]), query),
        delete: () => (mockCalls.push(['delete', table]), query),
        upsert: (...args: unknown[]) => (
          mockCalls.push(['upsert', table, ...args]),
          Promise.resolve({ error: mockError })
        ),
      };
    },
  },
}));

beforeEach(() => {
  mockCalls.length = 0;
  mockError = null;
  mockRows = [];
});

it('saveExerciseNote trims and upserts on (user_id, exercise_id)', async () => {
  await saveExerciseNote('u1', 'e1', '  Seat at 4 ');

  expect(mockCalls).toContainEqual([
    'upsert',
    'exercise_notes',
    { user_id: 'u1', exercise_id: 'e1', note: 'Seat at 4' },
    { onConflict: 'user_id,exercise_id' },
  ]);
});

it('saveExerciseNote with only spaces deletes the row and does not upsert', async () => {
  await saveExerciseNote('u1', 'e1', '   ');

  expect(mockCalls).toEqual([
    ['delete', 'exercise_notes'],
    ['eq', 'user_id', 'u1'],
    ['eq', 'exercise_id', 'e1'],
  ]);
});

it('saveWorkoutNote saves blank as null and trims text', async () => {
  await saveWorkoutNote('l1', '  ');
  await saveWorkoutNote('l1', ' ok ');

  expect(mockCalls).toEqual([
    ['update', 'workout_logs', { notes: null }],
    ['eq', 'id', 'l1'],
    ['update', 'workout_logs', { notes: 'ok' }],
    ['eq', 'id', 'l1'],
  ]);
});

it('getExerciseNotes maps rows to { exercise_id: note }, only your own', async () => {
  mockRows = [
    { exercise_id: 'e1', note: 'Seat at 4' },
    { exercise_id: 'e2', note: 'Wide grip' },
  ];

  expect(await getExerciseNotes('u1')).toEqual({ e1: 'Seat at 4', e2: 'Wide grip' });
  expect(mockCalls).toContainEqual(['eq', 'user_id', 'u1']);
});

it('a Supabase error makes each save throw', async () => {
  mockError = { message: 'offline' };

  await expect(saveExerciseNote('u1', 'e1', 'Seat at 4')).rejects.toEqual(mockError);
  await expect(saveExerciseNote('u1', 'e1', '')).rejects.toEqual(mockError);
  await expect(saveWorkoutNote('l1', 'ok')).rejects.toEqual(mockError);
});
