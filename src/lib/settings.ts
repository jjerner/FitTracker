import AsyncStorage from '@react-native-async-storage/async-storage';

// Device-only settings, stored on the phone (not in Supabase).
const REST_VIBRATION_KEY = 'settings.restVibration';

export async function getRestVibration(): Promise<boolean> {
  return (await AsyncStorage.getItem(REST_VIBRATION_KEY)) === 'on';
}

export async function setRestVibration(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(REST_VIBRATION_KEY, enabled ? 'on' : 'off');
}
