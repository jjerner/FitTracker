import { startWorkout } from '../workouts';
import { supabase } from '../supabase';
import type { WorkoutTemplate } from '../../types/domain';

jest.mock('../supabase', () => ({ supabase: { from: jest.fn() } }));

const from = supabase.from as jest.Mock;

const template = {
  id: 't1',
  name: 'Push',
  exercises: [{ exercise: { id: 'e1' } }, { exercise: { id: 'e2' } }],
} as unknown as WorkoutTemplate;

function mockTables(exercisesError: Error | null) {
  const deleteEq = jest.fn().mockResolvedValue({ error: null });
  const logs = {
    insert: jest.fn(() => ({
      select: () => ({ single: () => Promise.resolve({ data: { id: 'log1' }, error: null }) }),
    })),
    delete: jest.fn(() => ({ eq: deleteEq })),
  };
  const logExercises = { insert: jest.fn().mockResolvedValue({ error: exercisesError }) };
  from.mockImplementation((table: string) =>
    table === 'workout_logs' ? logs : table === 'workout_log_exercises' ? logExercises : null,
  );
  return { logs, logExercises, deleteEq };
}

beforeEach(() => from.mockReset());

describe('startWorkout', () => {
  it('returns the new log id when exercises are added', async () => {
    const { logs, logExercises } = mockTables(null);
    await expect(startWorkout({ userId: 'u1', template })).resolves.toBe('log1');
    expect(logExercises.insert).toHaveBeenCalledWith([
      { log_id: 'log1', exercise_id: 'e1', position: 0 },
      { log_id: 'log1', exercise_id: 'e2', position: 1 },
    ]);
    expect(logs.delete).not.toHaveBeenCalled();
  });

  it('deletes the empty workout when adding exercises fails', async () => {
    const failure = new Error('insert failed');
    const { logs, deleteEq } = mockTables(failure);
    await expect(startWorkout({ userId: 'u1', template })).rejects.toBe(failure);
    expect(logs.delete).toHaveBeenCalled();
    expect(deleteEq).toHaveBeenCalledWith('id', 'log1');
  });
});
