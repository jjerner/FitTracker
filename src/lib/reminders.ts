import * as Notifications from 'expo-notifications';

import { todayLocalDate } from './dateUtils';
import { getFoodReminder } from './settings';
import { supabase } from './supabase';

const ID_PREFIX = 'food-reminder-';
const CHANNEL_ID = 'reminders';
const DAYS_AHEAD = 14;

// Show the reminder even if the app happens to be open.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

// Asks for permission if needed. Returns true when reminders are allowed.
export async function ensureReminderPermission(): Promise<boolean> {
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: 'Reminders',
    importance: Notifications.AndroidImportance.DEFAULT,
  });
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  return (await Notifications.requestPermissionsAsync()).granted;
}

async function hasLoggedFoodToday(): Promise<boolean> {
  const { data } = await supabase.auth.getSession();
  const userId = data.session?.user.id;
  if (!userId) return false;
  const { count } = await supabase
    .from('food_log_entries')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('logged_date', todayLocalDate());
  return (count ?? 0) > 0;
}

// Schedules one notification per day for the next two weeks (a repeating one can't skip a day).
// Today's is left out if food is already logged. Call again whenever food is logged or deleted,
// the setting changes, or the app opens — that keeps the schedule fresh.
export async function refreshFoodReminders(): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((n) => n.identifier.startsWith(ID_PREFIX))
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
  );

  const { enabled, minutes } = await getFoodReminder();
  if (!enabled || !(await Notifications.getPermissionsAsync()).granted) return;

  const loggedToday = await hasLoggedFoodToday();
  const now = new Date();
  for (let i = 0; i < DAYS_AHEAD; i++) {
    if (i === 0 && loggedToday) continue;
    const when = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i, 0, minutes);
    if (when <= now) continue;
    await Notifications.scheduleNotificationAsync({
      identifier: `${ID_PREFIX}${i}`,
      content: { title: 'FitTrack', body: "You haven't logged any food today." },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: when, channelId: CHANNEL_ID },
    });
  }
}
