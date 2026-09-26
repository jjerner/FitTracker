import { Stack } from 'expo-router';

// Keeps the workouts list below screens opened from another tab (e.g. Resume on Home).
export const unstable_settings = { anchor: 'index' };

export default function WorkoutsLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'Workouts' }} />
      <Stack.Screen name="[templateId]" options={{ title: 'Template' }} />
      <Stack.Screen name="active" options={{ title: 'Workout' }} />
      <Stack.Screen name="log/[logId]" options={{ title: 'Workout Summary' }} />
      <Stack.Screen name="exercises/index" options={{ title: 'Exercises' }} />
      <Stack.Screen name="exercises/[exerciseId]" options={{ title: 'Exercise' }} />
    </Stack>
  );
}
