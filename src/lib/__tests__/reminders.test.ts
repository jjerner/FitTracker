import * as Notifications from 'expo-notifications';

import { cancelAllReminders, missingMealsMessage, refreshFoodReminders } from '../reminders';

// reminders.ts talks to the phone and Supabase; both are faked here.
type Diary = { data: { meal_type: string }[] | null; error: Error | null };
let mockDiaries: Diary[]; // one answer per diary read
// The phone's scheduled reminders by id. Each call waits a tick so overlapping runs interleave.
const mockStore = new Map<string, unknown>();
const mockTick = () => Promise.resolve();
jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest.fn(async () => ({ granted: true })),
  getAllScheduledNotificationsAsync: jest.fn(async () => {
    await mockTick();
    return [...mockStore.keys()].map((identifier) => ({ identifier }));
  }),
  cancelScheduledNotificationAsync: jest.fn(async (id: string) => {
    await mockTick();
    mockStore.delete(id);
  }),
  scheduleNotificationAsync: jest.fn(async (n: { identifier: string }) => {
    await mockTick();
    mockStore.set(n.identifier, n);
  }),
  cancelAllScheduledNotificationsAsync: jest.fn(async () => {
    await mockTick();
    mockStore.clear();
  }),
  SchedulableTriggerInputTypes: { DATE: 'date' },
}));
jest.mock('../supabase', () => ({
  supabase: {
    auth: { getSession: async () => ({ data: { session: { user: { id: 'u1' } } } }) },
    from: () => ({ select: () => ({ eq: () => ({ eq: async () => mockDiaries.shift() }) }) }),
  },
}));
jest.mock('../settings', () => ({
  getFoodReminder: async () => ({ enabled: true, minutes: 19 * 60 }),
  getMealReminder: async () => true,
}));

describe('missingMealsMessage', () => {
  it('names all three main meals when nothing is logged', () => {
    expect(missingMealsMessage(new Set())).toBe('Nothing logged for breakfast, lunch and dinner yet.');
  });

  it('ignores snacks and names the missing ones', () => {
    expect(missingMealsMessage(new Set(['snack', 'breakfast']))).toBe('Nothing logged for lunch and dinner yet.');
    expect(missingMealsMessage(new Set(['breakfast', 'lunch']))).toBe('Nothing logged for dinner yet.');
  });

  it('returns null when every main meal has food', () => {
    expect(missingMealsMessage(new Set(['breakfast', 'lunch', 'dinner']))).toBeNull();
  });
});

describe('refreshFoodReminders', () => {
  const schedule = Notifications.scheduleNotificationAsync as jest.Mock;
  const cancel = Notifications.cancelScheduledNotificationAsync as jest.Mock;

  beforeEach(() => {
    jest.useFakeTimers({ now: new Date(2026, 9, 12, 10, 0) }); // 10:00 local
    jest.clearAllMocks();
    mockStore.clear();
    mockStore.set('meal-reminder-0', {});
  });
  afterEach(() => jest.useRealTimers());

  it('today: only the meal reminder, naming dinner; tomorrow: both', async () => {
    mockDiaries = [{ data: [{ meal_type: 'breakfast' }, { meal_type: 'lunch' }], error: null }];
    await refreshFoodReminders();

    const byId = new Map(schedule.mock.calls.map(([n]) => [n.identifier, n]));
    expect(byId.has('food-reminder-0')).toBe(false);
    expect(byId.get('meal-reminder-0').content.body).toBe('Nothing logged for dinner yet.');
    expect(byId.get('meal-reminder-0').trigger.date).toEqual(new Date(2026, 9, 12, 20, 30));
    expect(byId.has('food-reminder-1')).toBe(true);
    expect(byId.get('meal-reminder-1').content.body).toBe('Nothing logged for breakfast, lunch and dinner yet.');
  });

  it('offline: keeps the current schedule untouched', async () => {
    mockDiaries = [{ data: null, error: new Error('Network request failed') }];
    await refreshFoodReminders();

    expect(cancel).not.toHaveBeenCalled();
    expect(schedule).not.toHaveBeenCalled();
  });

  it('overlapping calls run in order, so dinner logged mid-refresh leaves no dinner reminder', async () => {
    const breakfastLunch = [{ meal_type: 'breakfast' }, { meal_type: 'lunch' }];
    mockDiaries = [
      { data: breakfastLunch, error: null },
      { data: [...breakfastLunch, { meal_type: 'dinner' }], error: null },
    ];
    await Promise.all([refreshFoodReminders(), refreshFoodReminders()]);

    expect(mockStore.has('meal-reminder-0')).toBe(false);
    expect(mockStore.has('meal-reminder-1')).toBe(true);
  });

  it('a failed run does not block the next one', async () => {
    (Notifications.getPermissionsAsync as jest.Mock).mockRejectedValueOnce(new Error('boom'));
    mockDiaries = [{ data: [{ meal_type: 'breakfast' }, { meal_type: 'lunch' }], error: null }];
    const first = refreshFoodReminders();
    const second = refreshFoodReminders();

    await expect(first).rejects.toThrow('boom');
    await second;
    expect(mockStore.has('meal-reminder-1')).toBe(true);
  });

  it('sign-out cancel waits for a running refresh, so nothing is left booked', async () => {
    mockDiaries = [{ data: [{ meal_type: 'breakfast' }], error: null }];
    const refresh = refreshFoodReminders();
    const cancelAll = cancelAllReminders();
    await Promise.all([refresh, cancelAll]);

    expect(mockStore.size).toBe(0);
  });
});
