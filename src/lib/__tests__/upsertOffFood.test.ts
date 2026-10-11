import { upsertOffFood } from '../foods';
import type { OffFood } from '../openFoodFacts';
import { supabase } from '../supabase';

jest.mock('../supabase', () => ({ supabase: { from: jest.fn() } }));
jest.mock('../reminders', () => ({ refreshFoodReminders: jest.fn() }));
jest.mock('../pendingSets', () => ({ newSetId: jest.fn() }));

const off: OffFood = {
  barcode: '7310865004703',
  name: 'Mellanmjölk',
  brand: 'Arla',
  servingSizeG: null,
  servingDescription: null,
  caloriesKcal: 46,
  proteinG: 3.5,
  carbsG: 4.8,
  fatG: 1.5,
  fiberG: null,
  sugarG: 4.8,
  sodiumMg: 40,
};

// A chainable query that resolves to `result` whether awaited directly or via .single().
function query(result: object) {
  const q: Record<string, unknown> = {};
  for (const m of ['select', 'eq', 'or']) q[m] = jest.fn(() => q);
  q.single = () => Promise.resolve(result);
  q.then = (resolve: (v: object) => unknown) => Promise.resolve(result).then(resolve);
  return q;
}

const from = supabase.from as jest.Mock;
const row = (id: string, createdBy: string | null) => ({ id, source: 'off', name: off.name, created_by: createdBy });

beforeEach(() => from.mockReset());

describe('upsertOffFood', () => {
  it("inserts and returns the user's own copy when they have none", async () => {
    const upsert = jest.fn().mockResolvedValue({ error: null });
    from
      .mockReturnValueOnce(query({ data: [], error: null }))
      .mockReturnValueOnce({ upsert })
      .mockReturnValueOnce(query({ data: row('new', 'u1'), error: null }));

    const food = await upsertOffFood('u1', off);

    expect(food.id).toBe('new');
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({ barcode: off.barcode, source: 'off', created_by: 'u1' }),
      { onConflict: 'barcode,created_by', ignoreDuplicates: true },
    );
  });

  it('reuses an existing row the user owns', async () => {
    from.mockReturnValueOnce(query({ data: [row('shared', null), row('mine', 'u1')], error: null }));
    await expect(upsertOffFood('u1', off)).resolves.toMatchObject({ id: 'mine' });
    expect(from).toHaveBeenCalledTimes(1);
  });

  it('reuses an older shared row the user has logged', async () => {
    from
      .mockReturnValueOnce(query({ data: [row('shared', null)], error: null }))
      .mockReturnValueOnce(query({ count: 3, error: null }));
    await expect(upsertOffFood('u1', off)).resolves.toMatchObject({ id: 'shared' });
  });
});
