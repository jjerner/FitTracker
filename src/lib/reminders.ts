import * as Notifications from 'expo-notifications';

import { todayLocalDate } from './dateUtils';
import { missingMeals, missingMealsMessage } from './missingMeals';
import { getFoodReminder, getMealReminder } from './settings';
import { supabase } from './supabase';
import type { MealType } from '../types/domain';

const FOOD_ID_PREFIX = 'food-reminder-';
const MEAL_ID_PREFIX = 'meal-reminder-';
export const MEAL_REMINDER_MINUTES = 20 * 60 + 30;
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

// Meal types logged today, one per entry. Empty when signed out; null if the query failed.
async function mealsLoggedToday(): Promise<MealType[] | null> {
  const { data } = await supabase.auth.getSession();
  const userId = data.session?.user.id;
  if (!userId) return [];
  const { data: rows, error } = await supabase
    .from('food_log_entries')
    .select('meal_type')
    .eq('user_id', userId)
    .eq('logged_date', todayLocalDate());
  if (error) return null;
  return (rows ?? []).map((row) => row.meal_type as MealType);
}

async function cancelReminders(): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((n) => n.identifier.startsWith(FOOD_ID_PREFIX) || n.identifier.startsWith(MEAL_ID_PREFIX))
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
  );
}

// One notification per day at `minutes` for the next two weeks (a repeating one can't skip a day).
// Today's body is given (or null to skip today); later days get `laterBody`.
async function scheduleDaily(
  prefix: string,
  minutes: number,
  todayBody: string | null,
  laterBody: string,
): Promise<void> {
  const now = new Date();
  const jobs = [];
  for (let i = 0; i < DAYS_AHEAD; i++) {
    const body = i === 0 ? todayBody : laterBody;
    if (body == null) continue;
    const when = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i, 0, minutes);
    if (when <= now) continue;
    jobs.push(
      Notifications.scheduleNotificationAsync({
        identifier: `${prefix}${i}`,
        content: { title: 'Plucky', body },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: when, channelId: CHANNEL_ID },
      }),
    );
  }
  await Promise.all(jobs);
}

async function rescheduleReminders(): Promise<void> {
  const [food, mealEnabled, permission] = await Promise.all([
    getFoodReminder(),
    getMealReminder(),
    Notifications.getPermissionsAsync(),
  ]);
  const enabled = (food.enabled || mealEnabled) && permission.granted;

  // Read before cancelling: if the query fails (offline), the old schedule is kept.
  const logged = enabled ? await mealsLoggedToday() : [];
  if (logged == null) return;
  await cancelReminders();
  if (!enabled) return;

  if (food.enabled) {
    const body = "You haven't logged any food today.";
    await scheduleDaily(FOOD_ID_PREFIX, food.minutes, logged.length > 0 ? null : body, body);
  }
  if (mealEnabled) {
    const missingToday = missingMeals(logged);
    await scheduleDaily(
      MEAL_ID_PREFIX,
      MEAL_REMINDER_MINUTES,
      missingToday.length > 0 ? missingMealsMessage(missingToday) : null,
      missingMealsMessage(missingMeals([])),
    );
  }
}

let queue: Promise<void> = Promise.resolve();

// Reschedules the "no food" and the 20:30 missing-meal reminders. Today's is left out
// (or names fewer meals) when food is already logged. Call again whenever food is logged,
// edited or deleted, a setting changes, or the app opens — that keeps the schedule fresh.
// Later days assume nothing is logged yet, which holds because logging refreshes the schedule.
// Runs one at a time, so an older refresh can't overwrite a newer one.
export function refreshFoodReminders(): Promise<void> {
  queue = queue.catch(() => {}).then(rescheduleReminders);
  return queue;
}

// On sign-out: the next user of this phone shouldn't get the last one's reminders.
export function cancelFoodReminders(): Promise<void> {
  queue = queue.catch(() => {}).then(cancelReminders);
  return queue;
}
