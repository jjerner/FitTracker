import { Stack } from 'expo-router';

// Keeps Profile below Goals when it is opened from another tab (the Progress card).
export const unstable_settings = { anchor: 'index' };

export default function ProfileLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'Profile' }} />
      <Stack.Screen name="goals" options={{ title: 'Goals' }} />
      <Stack.Screen name="workouts" options={{ title: 'Workouts' }} />
      <Stack.Screen name="reminders" options={{ title: 'Reminders' }} />
      <Stack.Screen name="account" options={{ title: 'Account' }} />
      <Stack.Screen name="password" options={{ title: 'Change password' }} />
      <Stack.Screen name="delete-account" options={{ title: 'Delete account' }} />
    </Stack>
  );
}
