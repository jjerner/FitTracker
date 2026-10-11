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

// Meal types logged today, one per entry. Empty when signed out.
async function mealsLoggedToday(): Promise<MealType[]> {
  const { data } = await supabase.auth.getSession();
  const userId = data.session?.user.id;
  if (!userId) return [];
  const { data: rows } = await supabase
    .from('food_log_entries')
    .select('meal_type')
    .eq('user_id', userId)
    .eq('logged_date', todayLocalDate());
  return (rows ?? []).map((row) => row.meal_type as MealType);
}

async function cancelReminders(prefix: string): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((n) => n.identifier.startsWith(prefix))
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
  for (let i = 0; i < DAYS_AHEAD; i++) {
    const body = i === 0 ? todayBody : laterBody;
    if (body == null) continue;
    const when = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i, 0, minutes);
    if (when <= now) continue;
    await Notifications.scheduleNotificationAsync({
      identifier: `${prefix}${i}`,
      content: { title: 'Plucky', body },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: when, channelId: CHANNEL_ID },
    });
  }
}

// Reschedules the "no food" and the 20:30 missing-meal reminders. Today's is left out
// (or names fewer meals) when food is already logged. Call again whenever food is logged
// or deleted, a setting changes, or the app opens — that keeps the schedule fresh. Later
// days assume nothing is logged yet, which holds because logging refreshes the schedule.
export async function refreshFoodReminders(): Promise<void> {
  await Promise.all([cancelReminders(FOOD_ID_PREFIX), cancelReminders(MEAL_ID_PREFIX)]);

  const [food, mealEnabled, permission] = await Promise.all([
    getFoodReminder(),
    getMealReminder(),
    Notifications.getPermissionsAsync(),
  ]);
  if ((!food.enabled && !mealEnabled) || !permission.granted) return;

  const logged = await mealsLoggedToday();
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
