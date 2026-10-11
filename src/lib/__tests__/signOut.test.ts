import * as Notifications from 'expo-notifications';

import { signOut } from '../profile';
import { refreshFoodReminders } from '../reminders';
import { supabase } from '../supabase';

jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  getAllScheduledNotificationsAsync: jest.fn(),
  cancelScheduledNotificationAsync: jest.fn(),
  getPermissionsAsync: jest.fn(),
  scheduleNotificationAsync: jest.fn(),
}));
jest.mock('../supabase', () => ({
  supabase: { auth: { signOut: jest.fn(), getSession: jest.fn() } },
}));
jest.mock('../settings', () => ({
  getFoodReminder: jest.fn().mockResolvedValue({ enabled: true, minutes: 23 * 60 + 59 }),
}));

const notifications = Notifications as jest.Mocked<typeof Notifications>;
const auth = supabase.auth as jest.Mocked<typeof supabase.auth>;

beforeEach(() => {
  jest.clearAllMocks();
  notifications.getAllScheduledNotificationsAsync.mockResolvedValue([
    { identifier: 'food-reminder-0' },
    { identifier: 'food-reminder-1' },
    { identifier: 'something-else' },
  ] as Notifications.NotificationRequest[]);
});

describe('signOut', () => {
  it('cancels food reminders, then signs out', async () => {
    auth.signOut.mockResolvedValue({ error: null });
    await signOut();
    expect(notifications.cancelScheduledNotificationAsync.mock.calls).toEqual([
      ['food-reminder-0'],
      ['food-reminder-1'],
    ]);
    expect(auth.signOut).toHaveBeenCalled();
    expect(notifications.cancelScheduledNotificationAsync.mock.invocationCallOrder[0]).toBeLessThan(
      auth.signOut.mock.invocationCallOrder[0],
    );
  });

  it('still signs out if cancelling fails', async () => {
    notifications.getAllScheduledNotificationsAsync.mockRejectedValue(new Error('boom'));
    auth.signOut.mockResolvedValue({ error: null });
    await signOut();
    expect(auth.signOut).toHaveBeenCalled();
  });
});

describe('refreshFoodReminders', () => {
  it('schedules nothing while signed out', async () => {
    auth.getSession.mockResolvedValue({ data: { session: null }, error: null });
    await refreshFoodReminders();
    expect(notifications.cancelScheduledNotificationAsync).toHaveBeenCalledTimes(2);
    expect(notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
  });
});
