import * as Notifications from 'expo-notifications';

import { cancelFoodReminders, refreshFoodReminders } from '../reminders';
import { supabase } from '../supabase';

jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  getAllScheduledNotificationsAsync: jest.fn(),
  cancelScheduledNotificationAsync: jest.fn(),
  getPermissionsAsync: jest.fn(),
  scheduleNotificationAsync: jest.fn(),
  SchedulableTriggerInputTypes: { DATE: 'date' },
}));
jest.mock('../supabase', () => ({
  supabase: { auth: { getSession: jest.fn() }, from: jest.fn() },
}));
jest.mock('../settings', () => ({
  getFoodReminder: jest.fn().mockResolvedValue({ enabled: true, minutes: 23 * 60 + 59 }),
}));

const notifications = Notifications as jest.Mocked<typeof Notifications>;
const getSession = supabase.auth.getSession as jest.Mock;
const signedIn = { data: { session: { user: { id: 'u1' } } }, error: null };
const signedOut = { data: { session: null }, error: null };

beforeEach(() => {
  jest.clearAllMocks();
  notifications.getAllScheduledNotificationsAsync.mockResolvedValue([
    { identifier: 'food-reminder-0' },
    { identifier: 'food-reminder-1' },
    { identifier: 'something-else' },
  ] as Notifications.NotificationRequest[]);
  notifications.getPermissionsAsync.mockResolvedValue({ granted: true } as never);
  (supabase.from as jest.Mock).mockReturnValue({
    select: () => ({ eq: () => ({ eq: () => Promise.resolve({ count: 1 }) }) }),
  });
});

describe('cancelFoodReminders', () => {
  it('cancels only food reminders', async () => {
    await cancelFoodReminders();
    expect(notifications.cancelScheduledNotificationAsync.mock.calls).toEqual([
      ['food-reminder-0'],
      ['food-reminder-1'],
    ]);
  });
});

describe('refreshFoodReminders', () => {
  it('schedules nothing while signed out', async () => {
    getSession.mockResolvedValue(signedOut);
    await refreshFoodReminders();
    expect(notifications.cancelScheduledNotificationAsync).toHaveBeenCalledTimes(2);
    expect(notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  it('schedules nothing if signed out while it was running', async () => {
    getSession.mockResolvedValueOnce(signedIn).mockResolvedValue(signedOut);
    await refreshFoodReminders();
    expect(notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  it('schedules reminders while signed in', async () => {
    getSession.mockResolvedValue(signedIn);
    await refreshFoodReminders();
    expect(notifications.scheduleNotificationAsync).toHaveBeenCalled();
  });
});
