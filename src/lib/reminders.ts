import * as Notifications from 'expo-notifications';

import { todayLocalDate } from './dateUtils';
import { getFoodReminder, getMealReminder } from './settings';
import { supabase } from './supabase';

const ID_PREFIX = 'food-reminder-';
const MEAL_ID_PREFIX = 'meal-reminder-';
const MEAL_REMINDER_MINUTES = 20 * 60 + 30;
const MAIN_MEALS = ['breakfast', 'lunch', 'dinner'];
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

// The meal types that have at least one entry today, or null if that can't be read (offline).
async function mealsLoggedToday(): Promise<Set<string> | null> {
  const { data } = await supabase.auth.getSession();
  const userId = data.session?.user.id;
  if (!userId) return null;
  const { data: rows, error } = await supabase
    .from('food_log_entries')
    .select('meal_type')
    .eq('user_id', userId)
    .eq('logged_date', todayLocalDate());
  if (error) return null;
  return new Set((rows ?? []).map((r) => r.meal_type));
}

// "Nothing logged for lunch and dinner yet." or null when all main meals have food. Snacks don't count.
export function missingMealsMessage(logged: Set<string>): string | null {
  const missing = MAIN_MEALS.filter((m) => !logged.has(m));
  if (missing.length === 0) return null;
  const list = missing.length === 1 ? missing[0] : `${missing.slice(0, -1).join(', ')} and ${missing.at(-1)}`;
  return `Nothing logged for ${list} yet.`;
}

// Schedules one notification per day for the next two weeks (a repeating one can't skip a day),
// for both reminders. Today's is left out or reworded from what is already logged. Call again
// whenever food is logged or deleted, a setting changes, or the app opens — that keeps it fresh.
// Calls run one at a time, so an older run can't overwrite the schedule from a newer diary.
let queue: Promise<void> = Promise.resolve();
export function refreshFoodReminders(): Promise<void> {
  const run = queue.then(refresh);
  queue = run.catch(() => {}); // a failed run must not block the next one
  return run;
}

// Sign-out: drop every booked reminder. Queued so a refresh already running can't re-book after it.
export function cancelAllReminders(): Promise<void> {
  const run = queue.then(() => Notifications.cancelAllScheduledNotificationsAsync());
  queue = run.catch(() => {});
  return run;
}

async function refresh(): Promise<void> {
  const [{ enabled, minutes }, mealEnabled] = await Promise.all([getFoodReminder(), getMealReminder()]);
  const wanted = (enabled || mealEnabled) && (await Notifications.getPermissionsAsync()).granted;
  // Read before cancelling: offline, the current schedule beats one built from "nothing logged".
  const logged = wanted ? await mealsLoggedToday() : null;
  if (wanted && !logged) return;

  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((n) => n.identifier.startsWith(ID_PREFIX) || n.identifier.startsWith(MEAL_ID_PREFIX))
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
  );
  if (!logged) return;

  const now = new Date();
  for (let i = 0; i < DAYS_AHEAD; i++) {
    if (enabled && !(i === 0 && logged.size > 0)) {
      await scheduleAt(`${ID_PREFIX}${i}`, i, minutes, "You haven't logged any food today.", now);
    }
    const mealBody = missingMealsMessage(i === 0 ? logged : new Set());
    if (mealEnabled && mealBody) {
      await scheduleAt(`${MEAL_ID_PREFIX}${i}`, i, MEAL_REMINDER_MINUTES, mealBody, now);
    }
  }
}

async function scheduleAt(identifier: string, daysAhead: number, minutes: number, body: string, now: Date) {
  const when = new Date(now.getFullYear(), now.getMonth(), now.getDate() + daysAhead, 0, minutes);
  if (when <= now) return;
  await Notifications.scheduleNotificationAsync({
    identifier,
    content: { title: 'Plucky', body },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: when, channelId: CHANNEL_ID },
  });
}
