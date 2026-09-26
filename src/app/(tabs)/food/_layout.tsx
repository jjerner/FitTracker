import { Stack } from 'expo-router';

// Keeps the diary below screens opened from another tab (e.g. Log Food on Home).
export const unstable_settings = { anchor: 'index' };

export default function FoodLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'Food' }} />
      <Stack.Screen name="search" options={{ title: 'Log Food' }} />
      <Stack.Screen name="scan" options={{ title: 'Scan Barcode', headerTintColor: '#fff' }} />
      <Stack.Screen name="food/[foodId]" options={{ title: 'Add to Diary' }} />
      <Stack.Screen name="custom-food/new" options={{ title: 'New Food' }} />
    </Stack>
  );
}
