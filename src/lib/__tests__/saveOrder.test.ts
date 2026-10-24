import { saveRecipe } from '../foods';
import { saveTemplate } from '../workouts';
import type { SavedMealItem, WorkoutTemplateExercise } from '../../types/domain';

// Fake Supabase: every chained call is recorded as [table, method]. An awaited chain with an
// insert answers with mockInsertError; reading old routine rows finds one, so a delete would run.
let mockInsertError: { code: string } | null;
const mockCalls: string[][] = [];
jest.mock('../supabase', () => ({
  supabase: {
    from: (table: string) => {
      const methods: string[] = [];
      const query: any = {};
      for (const method of ['update', 'select', 'insert', 'delete', 'eq', 'not', 'in']) {
        query[method] = () => (methods.push(method), mockCalls.push([table, method]), query);
      }
      query.then = (resolve: (value: unknown) => void) =>
        resolve(
          methods.includes('insert')
            ? { data: null, error: mockInsertError }
            : table === 'workout_template_exercises' && methods.includes('select')
              ? { data: [{ id: 'old-1' }], error: null }
              : { data: null, error: null }
        );
      return query;
    },
  },
}));
jest.mock('../reminders', () => ({ refreshFoodReminders: jest.fn() }));
jest.mock('../pendingSets', () => ({ newSetId: jest.fn() }));

const item = { food: { id: 'food-1' }, quantity: 100, quantityUnit: 'g', servingG: null } as SavedMealItem;
const exercise = { exercise: { id: 'ex-1' } } as WorkoutTemplateExercise;

beforeEach(() => {
  mockCalls.length = 0;
  mockInsertError = { code: 'X' };
});

it('editing a recipe: items insert fails, throws and deletes nothing', async () => {
  await expect(
    saveRecipe('user-1', { id: 'meal-1', name: 'Soup', portions: 1, items: [item] })
  ).rejects.toEqual({ code: 'X' });

  expect(mockCalls).toContainEqual(['saved_meal_items', 'insert']);
  expect(mockCalls.map(([, method]) => method)).not.toContain('delete');
});

it('editing a routine: exercises insert fails, throws and deletes nothing', async () => {
  await expect(
    saveTemplate({ id: 'tpl-1', userId: 'user-1', name: 'Push', exercises: [exercise] })
  ).rejects.toEqual({ code: 'X' });

  expect(mockCalls).toContainEqual(['workout_template_exercises', 'insert']);
  expect(mockCalls.map(([, method]) => method)).not.toContain('delete');
});
