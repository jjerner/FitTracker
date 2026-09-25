import { Stack } from 'expo-router';

import { DiaryDateProvider } from '../../../context/DiaryDateProvider';

export default function FoodLayout() {
  return (
    <DiaryDateProvider>
      <Stack>
        <Stack.Screen name="index" options={{ title: 'Diary' }} />
        <Stack.Screen name="search" options={{ title: 'Log Food' }} />
        <Stack.Screen name="scan" options={{ title: 'Scan Barcode', headerTintColor: '#fff' }} />
        <Stack.Screen name="food/[foodId]" options={{ title: 'Add to Diary' }} />
        <Stack.Screen name="custom-food/new" options={{ title: 'New Food' }} />
      </Stack>
    </DiaryDateProvider>
  );
}
