import { upsertOffFood } from '../foods';
import type { OffFood } from '../openFoodFacts';

// foods.ts talks to Supabase; faked here. The insert answers with mockInsertError,
// the read-back records its filters and returns one shared row.
let mockInsertError: { code: string } | null;
const mockReadFilters: unknown[][] = [];
jest.mock('../supabase', () => ({
  supabase: {
    from: () => ({
      insert: async () => ({ error: mockInsertError }),
      select: () => {
        const query = {
          eq: (...args: unknown[]) => (mockReadFilters.push(['eq', ...args]), query),
          is: (...args: unknown[]) => (mockReadFilters.push(['is', ...args]), query),
          single: async () => ({ data: { id: 'shared-1', barcode: '123', created_by: null }, error: null }),
        };
        return query;
      },
    }),
  },
}));
jest.mock('../reminders', () => ({ refreshFoodReminders: jest.fn() }));
jest.mock('../pendingSets', () => ({ newSetId: jest.fn() }));

const off = { barcode: '123', name: 'Yoghurt' } as OffFood;

beforeEach(() => {
  mockReadFilters.length = 0;
});

it('barcode already saved (23505): returns the shared row read back', async () => {
  mockInsertError = { code: '23505' };
  const food = await upsertOffFood(off);

  expect(food.id).toBe('shared-1');
  expect(mockReadFilters).toContainEqual(['eq', 'barcode', '123']);
  expect(mockReadFilters).toContainEqual(['is', 'created_by', null]);
});

it('any other insert error: throws', async () => {
  mockInsertError = { code: '42501' };
  await expect(upsertOffFood(off)).rejects.toEqual({ code: '42501' });
});
