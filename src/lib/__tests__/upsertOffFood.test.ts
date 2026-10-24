import { getFoodByBarcode, upsertOffFood } from '../foods';
import type { OffFood } from '../openFoodFacts';

// foods.ts talks to Supabase; faked here. Lookups record their filters and answer with
// mockFound; the insert records its row and answers with mockInsertError.
let mockInsertError: { code: string } | null;
let mockFound: Record<string, unknown> | null;
const mockReadFilters: unknown[][] = [];
const mockInserted: Record<string, unknown>[] = [];
jest.mock('../supabase', () => ({
  supabase: {
    from: () => ({
      insert: (row: Record<string, unknown>) => {
        mockInserted.push(row);
        const result = { error: mockInsertError };
        return Object.assign(Promise.resolve(result), {
          select: () => ({ single: async () => ({ data: { id: 'new-1', ...row }, error: null }) }),
        });
      },
      select: () => {
        const query = {
          eq: (...args: unknown[]) => (mockReadFilters.push(['eq', ...args]), query),
          is: (...args: unknown[]) => (mockReadFilters.push(['is', ...args]), query),
          limit: () => query,
          maybeSingle: async () => ({ data: mockFound, error: null }),
          single: async () => ({ data: mockFound, error: null }),
        };
        return query;
      },
    }),
  },
}));
jest.mock('../reminders', () => ({ refreshFoodReminders: jest.fn() }));
jest.mock('../pendingSets', () => ({ newSetId: jest.fn() }));

const off = { barcode: '123', name: 'Yoghurt', brand: 'Arla' } as OffFood;
const noBarcode = { ...off, barcode: null } as OffFood;

beforeEach(() => {
  mockReadFilters.length = 0;
  mockInserted.length = 0;
  mockInsertError = null;
  mockFound = null;
});

it('barcode, insert OK: saves it as yours and reads back your own row', async () => {
  mockFound = { id: 'own-1', barcode: '123', created_by: 'u1' };
  await upsertOffFood('u1', off);

  expect(mockInserted[0]).toMatchObject({ created_by: 'u1', source: 'off' });
  expect(mockReadFilters).toContainEqual(['eq', 'created_by', 'u1']);
  expect(mockReadFilters).not.toContainEqual(['is', 'created_by', null]);
});

it('barcode already saved (23505): returns your own row read back', async () => {
  mockInsertError = { code: '23505' };
  mockFound = { id: 'own-1', barcode: '123', created_by: 'u1' };
  const food = await upsertOffFood('u1', off);

  expect(food.id).toBe('own-1');
  expect(mockReadFilters).toContainEqual(['eq', 'barcode', '123']);
});

it('barcode, any other insert error: throws', async () => {
  mockInsertError = { code: '42501' };
  await expect(upsertOffFood('u1', off)).rejects.toEqual({ code: '42501' });
});

it('no barcode, your earlier copy exists: returns it without inserting', async () => {
  mockFound = { id: 'own-2', name: 'Yoghurt', brand: 'Arla', created_by: 'u1' };
  const food = await upsertOffFood('u1', noBarcode);

  expect(food.id).toBe('own-2');
  expect(mockInserted).toHaveLength(0);
  expect(mockReadFilters).toEqual(
    expect.arrayContaining([
      ['eq', 'created_by', 'u1'],
      ['eq', 'source', 'off'],
      ['is', 'barcode', null],
      ['eq', 'name', 'Yoghurt'],
      ['eq', 'brand', 'Arla'],
    ])
  );
});

it('no barcode, no match: inserts it as yours and returns the new row', async () => {
  const food = await upsertOffFood('u1', noBarcode);

  expect(food.id).toBe('new-1');
  expect(mockInserted[0]).toMatchObject({ created_by: 'u1', barcode: null });
});

it('no barcode, no brand: looks up brand is null', async () => {
  await upsertOffFood('u1', { ...noBarcode, brand: null } as OffFood);

  expect(mockReadFilters).toContainEqual(['is', 'brand', null]);
});

it('getFoodByBarcode: only your own row', async () => {
  await getFoodByBarcode('u1', '123');

  expect(mockReadFilters).toContainEqual(['eq', 'created_by', 'u1']);
});
