import { Redirect, Tabs } from 'expo-router';

import { useSession } from '../../context/AuthProvider';
import { DiaryDateProvider } from '../../context/DiaryDateProvider';

export default function TabsLayout() {
  const { session, isLoading } = useSession();

  if (!isLoading && !session) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    // Diary date lives here (not in the food stack) so Home can reset it to today.
    <DiaryDateProvider>
      <Tabs>
        <Tabs.Screen name="home" options={{ title: 'Home' }} />
        <Tabs.Screen name="workouts" options={{ title: 'Workouts' }} />
        <Tabs.Screen name="food" options={{ title: 'Food' }} />
        <Tabs.Screen name="progress" options={{ title: 'Progress' }} />
        <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
      </Tabs>
    </DiaryDateProvider>
  );
}
