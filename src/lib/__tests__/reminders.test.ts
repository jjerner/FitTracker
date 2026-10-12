import * as Notifications from 'expo-notifications';

import { missingMealsMessage, refreshFoodReminders } from '../reminders';

// reminders.ts talks to the phone and Supabase; both are faked here.
let mockDiary: { data: { meal_type: string }[] | null; error: Error | null };
jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest.fn(async () => ({ granted: true })),
  getAllScheduledNotificationsAsync: jest.fn(async () => [{ identifier: 'meal-reminder-0' }]),
  cancelScheduledNotificationAsync: jest.fn(),
  scheduleNotificationAsync: jest.fn(),
  SchedulableTriggerInputTypes: { DATE: 'date' },
}));
jest.mock('../supabase', () => ({
  supabase: {
    auth: { getSession: async () => ({ data: { session: { user: { id: 'u1' } } } }) },
    from: () => ({ select: () => ({ eq: () => ({ eq: async () => mockDiary }) }) }),
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
  });
  afterEach(() => jest.useRealTimers());

  it('today: only the meal reminder, naming dinner; tomorrow: both', async () => {
    mockDiary = { data: [{ meal_type: 'breakfast' }, { meal_type: 'lunch' }], error: null };
    await refreshFoodReminders();

    const byId = new Map(schedule.mock.calls.map(([n]) => [n.identifier, n]));
    expect(byId.has('food-reminder-0')).toBe(false);
    expect(byId.get('meal-reminder-0').content.body).toBe('Nothing logged for dinner yet.');
    expect(byId.get('meal-reminder-0').trigger.date).toEqual(new Date(2026, 9, 12, 20, 30));
    expect(byId.has('food-reminder-1')).toBe(true);
    expect(byId.get('meal-reminder-1').content.body).toBe('Nothing logged for breakfast, lunch and dinner yet.');
  });

  it('offline: keeps the current schedule untouched', async () => {
    mockDiary = { data: null, error: new Error('Network request failed') };
    await refreshFoodReminders();

    expect(cancel).not.toHaveBeenCalled();
    expect(schedule).not.toHaveBeenCalled();
  });
});
