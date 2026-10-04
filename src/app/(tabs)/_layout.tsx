import { Redirect, Tabs } from 'expo-router';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { useEffect } from 'react';
import { AppState, type ColorValue } from 'react-native';

import { useSession } from '../../context/AuthProvider';
import { DiaryDateProvider } from '../../context/DiaryDateProvider';
import { refreshFoodReminders } from '../../lib/reminders';
import { colors } from '../../theme';

function tabIcon(name: SymbolViewProps['name']) {
  function TabIcon({ color, size }: { color: ColorValue; size: number }) {
    return <SymbolView name={name} tintColor={color} size={size} />;
  }
  return TabIcon;
}

export default function TabsLayout() {
  const { session, isLoading } = useSession();
  const isSignedIn = !!session;

  // Keep the next two weeks of reminders fresh whenever the app opens.
  useEffect(() => {
    if (!isSignedIn) return;
    refreshFoodReminders().catch(() => {});
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') refreshFoodReminders().catch(() => {});
    });
    return () => sub.remove();
  }, [isSignedIn]);

  if (!isLoading && !session) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    // Diary date lives here (not in the food stack) so Home can reset it to today.
    <DiaryDateProvider>
      <Tabs screenOptions={{ tabBarActiveTintColor: colors.primary }}>
        <Tabs.Screen
          name="home"
          options={{ title: 'Home', tabBarIcon: tabIcon({ ios: 'house.fill', android: 'home' }) }}
        />
        {/* Tabs with their own stack hide this header so only the stack's shows. */}
        <Tabs.Screen
          name="workouts"
          options={{
            title: 'Workouts',
            headerShown: false,
            tabBarIcon: tabIcon({ ios: 'dumbbell.fill', android: 'fitness_center' }),
          }}
        />
        <Tabs.Screen
          name="food"
          options={{
            title: 'Food',
            headerShown: false,
            tabBarIcon: tabIcon({ ios: 'fork.knife', android: 'restaurant' }),
          }}
        />
        <Tabs.Screen
          name="progress"
          options={{
            title: 'Progress',
            tabBarIcon: tabIcon({ ios: 'chart.xyaxis.line', android: 'monitoring' }),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
            headerShown: false,
            tabBarIcon: tabIcon({ ios: 'person.fill', android: 'person' }),
          }}
        />
      </Tabs>
    </DiaryDateProvider>
  );
}
