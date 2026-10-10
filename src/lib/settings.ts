import AsyncStorage from '@react-native-async-storage/async-storage';

// Device-only settings, stored on the phone (not in Supabase).
const REST_VIBRATION_KEY = 'settings.restVibration';

export async function getRestVibration(): Promise<boolean> {
  return (await AsyncStorage.getItem(REST_VIBRATION_KEY)) === 'on';
}

export async function setRestVibration(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(REST_VIBRATION_KEY, enabled ? 'on' : 'off');
}

// Rest timer length after each set, in seconds.
const DEFAULT_REST_KEY = 'settings.defaultRestSeconds';
export const DEFAULT_REST_SECONDS = 90;

export async function getDefaultRest(): Promise<number> {
  const value = await AsyncStorage.getItem(DEFAULT_REST_KEY);
  return value != null ? Number(value) : DEFAULT_REST_SECONDS;
}

export async function setDefaultRest(seconds: number): Promise<void> {
  await AsyncStorage.setItem(DEFAULT_REST_KEY, String(seconds));
}

// Daily "you haven't logged food" reminder. Time is minutes after midnight (default 19:00).
const FOOD_REMINDER_ENABLED_KEY = 'settings.foodReminderEnabled';
const FOOD_REMINDER_MINUTES_KEY = 'settings.foodReminderMinutes';
export const DEFAULT_FOOD_REMINDER_MINUTES = 19 * 60;

export type FoodReminderSettings = { enabled: boolean; minutes: number };

export async function getFoodReminder(): Promise<FoodReminderSettings> {
  const [enabled, minutes] = await Promise.all([
    AsyncStorage.getItem(FOOD_REMINDER_ENABLED_KEY),
    AsyncStorage.getItem(FOOD_REMINDER_MINUTES_KEY),
  ]);
  return {
    enabled: enabled === 'on',
    minutes: minutes != null ? Number(minutes) : DEFAULT_FOOD_REMINDER_MINUTES,
  };
}

export async function setFoodReminder(settings: FoodReminderSettings): Promise<void> {
  await AsyncStorage.multiSet([
    [FOOD_REMINDER_ENABLED_KEY, settings.enabled ? 'on' : 'off'],
    [FOOD_REMINDER_MINUTES_KEY, String(settings.minutes)],
  ]);
}
