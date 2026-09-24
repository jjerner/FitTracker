import { Stack } from 'expo-router';

export default function FoodLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'Today' }} />
      <Stack.Screen name="search" options={{ title: 'Log Food' }} />
      <Stack.Screen name="scan" options={{ title: 'Scan Barcode', headerTintColor: '#fff' }} />
      <Stack.Screen name="food/[foodId]" options={{ title: 'Add to Diary' }} />
      <Stack.Screen name="custom-food/new" options={{ title: 'New Food' }} />
    </Stack>
  );
}
