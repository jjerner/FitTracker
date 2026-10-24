import { flushPendingSets, queueSet, removePending, type PendingSet } from '../pendingSets';

// pendingSets.ts keeps the queue in AsyncStorage and sends it with Supabase; both are faked here.
jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
// One answer per upsert via mockResolvedValueOnce; an unplanned call gets undefined and throws.
const mockUpsert = jest.fn();
const mockFrom = jest.fn((_table: string) => ({ upsert: mockUpsert }));
// Wrapped: the hoisted factory runs before mockFrom is assigned.
jest.mock('../supabase', () => ({ supabase: { from: (table: string) => mockFrom(table) } }));

const set = (id: string): PendingSet => ({
  id,
  logId: 'log-1',
  logExerciseId: 'ex-1',
  setNumber: 1,
  weightKg: 50,
  reps: 8,
  durationS: null,
  distanceM: null,
});

const upsertIds = () => mockUpsert.mock.calls.map(([row]) => row.id);

beforeEach(() => {
  mockUpsert.mockReset();
  mockFrom.mockClear();
});

// The queue lives in module memory and sent sets stay in it, so empty it between tests.
afterEach(async () => {
  await removePending('set-a');
  await removePending('set-b');
});

describe('flushPendingSets', () => {
  it('sends a waiting set', async () => {
    await queueSet(set('set-a'));
    mockUpsert.mockResolvedValueOnce({ error: null });

    expect(await flushPendingSets()).toEqual({ sent: true, allSent: true });
    expect(mockFrom).toHaveBeenCalledWith('workout_log_sets');
    expect(mockUpsert).toHaveBeenCalledTimes(1);
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'set-a',
        log_exercise_id: 'ex-1',
        set_number: 1,
        weight_kg: 50,
        reps: 8,
        set_type: 'normal',
      }),
      { onConflict: 'id', ignoreDuplicates: true }
    );
  });

  it.each([
    ['network', { message: 'TypeError: Network request failed', code: '' }],
  ])('keeps the set and stops on a non-23 error (%s)', async (_name, error) => {
    await queueSet(set('set-a'));
    await queueSet(set('set-b'));
    mockUpsert.mockResolvedValueOnce({ error });

    expect(await flushPendingSets()).toEqual({ sent: false, allSent: false });
    expect(upsertIds()).toEqual(['set-a']);

    mockUpsert.mockReset();
    mockUpsert.mockResolvedValueOnce({ error: null }).mockResolvedValueOnce({ error: null });
    expect(await flushPendingSets()).toEqual({ sent: true, allSent: true });
    expect(upsertIds()).toEqual(['set-a', 'set-b']);
  });

  it('drops only the set with a 23503 error and goes on', async () => {
    await queueSet(set('set-a'));
    await queueSet(set('set-b'));
    mockUpsert
      .mockResolvedValueOnce({ error: { message: 'violates foreign key constraint', code: '23503' } })
      .mockResolvedValueOnce({ error: null });

    expect(await flushPendingSets()).toEqual({ sent: true, allSent: true });
    expect(upsertIds()).toEqual(['set-a', 'set-b']);

    // Sent sets stay queued until pruneSaved sees them saved, so set-b comes back.
    mockUpsert.mockReset();
    mockUpsert.mockResolvedValueOnce({ error: null });
    await flushPendingSets();
    expect(upsertIds()).toEqual(['set-b']);
  });

  it('drops a set that is not yours (42501) and goes on', async () => {
    await queueSet(set('set-a'));
    await queueSet(set('set-b'));
    mockUpsert
      .mockResolvedValueOnce({ error: { message: 'permission denied', code: '42501' } })
      .mockResolvedValueOnce({ error: null });

    expect(await flushPendingSets()).toEqual({ sent: true, allSent: true });
    expect(upsertIds()).toEqual(['set-a', 'set-b']);

    mockUpsert.mockReset();
    mockUpsert.mockResolvedValueOnce({ error: null });
    await flushPendingSets();
    expect(upsertIds()).toEqual(['set-b']);
  });
});
