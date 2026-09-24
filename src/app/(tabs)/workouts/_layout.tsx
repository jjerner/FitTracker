import { Stack } from 'expo-router';

export default function WorkoutsLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'Workouts' }} />
      <Stack.Screen name="[templateId]" options={{ title: 'Template' }} />
      <Stack.Screen name="active" options={{ title: 'Workout' }} />
      <Stack.Screen name="log/[logId]" options={{ title: 'Workout Summary' }} />
      <Stack.Screen name="exercises/index" options={{ title: 'Exercises' }} />
    </Stack>
  );
}
