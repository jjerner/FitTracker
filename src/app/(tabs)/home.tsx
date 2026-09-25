import { router } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useDiaryDate } from '../../context/DiaryDateProvider';
import { useDisplayName } from '../../hooks/useDisplayName';
import { useFoodDiary } from '../../hooks/useFoodDiary';
import { useNutritionGoals } from '../../hooks/useNutritionGoals';
import { todayLocalDate } from '../../lib/dateUtils';

export default function Home() {
  const { data: name } = useDisplayName();
  const today = todayLocalDate();
  const { data: entries, isLoading } = useFoodDiary(today);
  const { data: goals } = useNutritionGoals();
  const { setDate } = useDiaryDate();

  const totals = (entries ?? []).reduce(
    (acc, e) => ({
      calories: acc.calories + e.caloriesKcal,
      protein: acc.protein + e.proteinG,
      carbs: acc.carbs + e.carbsG,
      fat: acc.fat + e.fatG,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );
  const calorieShare = goals ? Math.min(1, totals.calories / goals.caloriesKcal) : 0;

  // The Food tab may be showing another day; Home always means today.
  function openDiary() {
    setDate(today);
    router.navigate('/(tabs)/food');
  }

  function logFood() {
    setDate(today);
    router.push('/(tabs)/food/search', { withAnchor: true });
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.greeting}>{name ? `Hi, ${name}!` : 'Hi!'}</Text>

      <Pressable style={styles.card} onPress={openDiary}>
        <Text style={styles.cardTitle}>Today&apos;s food</Text>
        {isLoading ? (
          <ActivityIndicator />
        ) : (
          <>
            <Text style={styles.calories}>
              {Math.round(totals.calories)}
              {goals ? ` / ${goals.caloriesKcal}` : ''} kcal
            </Text>
            {goals && (
              <View style={styles.barTrack}>
                <View style={[styles.barFill, { width: `${calorieShare * 100}%` }]} />
              </View>
            )}
            <Text style={styles.macros}>
              P {Math.round(totals.protein)}
              {goals ? `/${goals.proteinG}` : ''}g · C {Math.round(totals.carbs)}
              {goals ? `/${goals.carbsG}` : ''}g · F {Math.round(totals.fat)}
              {goals ? `/${goals.fatG}` : ''}g
            </Text>
          </>
        )}
      </Pressable>

      <View style={styles.buttonRow}>
        <Pressable style={styles.button} onPress={logFood}>
          <Text style={styles.buttonText}>+ Log Food</Text>
        </Pressable>
        {/* Workouts tab is where you pick a template or an empty workout. */}
        <Pressable style={styles.button} onPress={() => router.navigate('/(tabs)/workouts')}>
          <Text style={styles.buttonText}>Start Workout</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6' },
  content: { padding: 16, gap: 16 },
  greeting: { fontSize: 24, fontWeight: '700' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, gap: 8 },
  cardTitle: { fontSize: 16, fontWeight: '600' },
  calories: { fontSize: 24, fontWeight: '700' },
  barTrack: { height: 8, borderRadius: 4, backgroundColor: '#e5e7eb', overflow: 'hidden' },
  barFill: { height: 8, backgroundColor: '#2563eb' },
  macros: { fontSize: 14, color: '#555' },
  buttonRow: { flexDirection: 'row', gap: 12 },
  button: {
    flex: 1,
    backgroundColor: '#2563eb',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
