import { useQueryClient } from '@tanstack/react-query';
import { router, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { CalorieRing, MacroBar } from '../../components/CalorieRing';
import { useDiaryDate } from '../../context/DiaryDateProvider';
import { useDisplayName } from '../../hooks/useDisplayName';
import { useFoodDiary } from '../../hooks/useFoodDiary';
import { useNutritionGoals } from '../../hooks/useNutritionGoals';
import { useWorkoutDates } from '../../hooks/useProgress';
import { useWorkoutHistory } from '../../hooks/useWorkouts';
import { localDateOf, todayLocalDate } from '../../lib/dateUtils';
import { colors, radius, spacing } from '../../theme';

const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

// "YYYY-MM-DD" of the Monday in the same week as the given date.
function mondayOf(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  const day = new Date(y, m - 1, d);
  day.setDate(day.getDate() - ((day.getDay() + 6) % 7));
  return localDateOf(day);
}

function addDays(date: string, days: number): string {
  const [y, m, d] = date.split('-').map(Number);
  return localDateOf(new Date(y, m - 1, d + days));
}

export default function Home() {
  const queryClient = useQueryClient();
  const { data: name } = useDisplayName();
  const today = todayLocalDate();
  const { data: entries, isLoading } = useFoodDiary(today);
  const { data: goals } = useNutritionGoals();
  const { data: workoutDates } = useWorkoutDates();
  const { data: history } = useWorkoutHistory();
  const { setDate } = useDiaryDate();

  // Workouts may have been finished or started since Home was last shown.
  useFocusEffect(
    useCallback(() => {
      queryClient.invalidateQueries({ queryKey: ['workoutDates'] });
      queryClient.invalidateQueries({ queryKey: ['workoutHistory'] });
    }, [queryClient])
  );

  const totals = (entries ?? []).reduce(
    (acc, e) => ({
      calories: acc.calories + e.caloriesKcal,
      protein: acc.protein + e.proteinG,
      carbs: acc.carbs + e.carbsG,
      fat: acc.fat + e.fatG,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  const activeWorkout = history?.find((log) => log.completedAt == null);

  // This week (Monâ€“Sun) and how many weeks in a row had a workout.
  const workoutDays = new Set(workoutDates ?? []);
  const thisMonday = mondayOf(today);
  const week = WEEKDAYS.map((label, i) => {
    const date = addDays(thisMonday, i);
    return { label, date, done: workoutDays.has(date), future: date > today };
  });
  const workoutsThisWeek = (workoutDates ?? []).filter((d) => d >= thisMonday).length;
  const activeWeeks = new Set((workoutDates ?? []).map(mondayOf));
  // An empty current week doesn't break the streak until it's over.
  let streakWeek = activeWeeks.has(thisMonday) ? thisMonday : addDays(thisMonday, -7);
  let streak = 0;
  while (activeWeeks.has(streakWeek)) {
    streak += 1;
    streakWeek = addDays(streakWeek, -7);
  }

  // The Food tab may be showing another day; Home always means today.
  function openDiary() {
    setDate(today);
    router.navigate('/(tabs)/food');
  }

  function logFood() {
    setDate(today);
    router.push('/(tabs)/food/search', { withAnchor: true });
  }

  function startOrResumeWorkout() {
    if (activeWorkout) {
      router.push(
        { pathname: '/(tabs)/workouts/active', params: { logId: activeWorkout.id } },
        { withAnchor: true }
      );
    } else {
      // Workouts tab is where you pick a template or an empty workout.
      router.navigate('/(tabs)/workouts');
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.greeting}>{name ? `Hi, ${name}!` : 'Hi!'}</Text>

      <Pressable style={styles.card} onPress={openDiary}>
        <Text style={styles.cardTitle}>Today&apos;s food</Text>
        {isLoading ? (
          <ActivityIndicator />
        ) : (
          <View style={styles.foodRow}>
            <CalorieRing eaten={totals.calories} goal={goals?.caloriesKcal ?? null} />
            <View style={styles.macroList}>
              <MacroBar label="Protein" value={totals.protein} goal={goals?.proteinG} />
              <MacroBar label="Carbs" value={totals.carbs} goal={goals?.carbsG} />
              <MacroBar label="Fat" value={totals.fat} goal={goals?.fatG} />
            </View>
          </View>
        )}
      </Pressable>

      <Pressable style={styles.card} onPress={() => router.navigate('/(tabs)/workouts')}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>This week</Text>
          {streak > 0 ? (
            <Text style={styles.streak}>
              ðŸ”¥ {streak} {streak === 1 ? 'week' : 'weeks'} in a row
            </Text>
          ) : null}
        </View>
        <View style={styles.weekRow}>
          {week.map((day) => (
            <View key={day.date} style={styles.weekDay}>
              <View
                style={[
                  styles.dot,
                  day.done && styles.dotDone,
                  day.future && styles.dotFuture,
                  day.date === today && styles.dotToday,
                ]}
              />
              <Text style={styles.weekLabel}>{day.label}</Text>
            </View>
          ))}
        </View>
        <Text style={styles.muted}>
          {workoutsThisWeek} {workoutsThisWeek === 1 ? 'workout' : 'workouts'} this week
        </Text>
      </Pressable>

      <View style={styles.buttonRow}>
        <Pressable style={styles.button} onPress={logFood}>
          <Text style={styles.buttonText}>+ Log Food</Text>
        </Pressable>
        <Pressable
          style={[styles.button, activeWorkout && styles.resumeButton]}
          onPress={startOrResumeWorkout}
        >
          <Text style={styles.buttonText} numberOfLines={1}>
            {activeWorkout ? `Resume: ${activeWorkout.name}` : 'Start Workout'}
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  content: { padding: spacing.lg, gap: spacing.lg },
  greeting: { fontSize: 24, fontWeight: '700', color: colors.text },
  card: {
    backgroundColor: colors.background,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontSize: 16, fontWeight: '600', color: colors.text },
  muted: { fontSize: 13, color: colors.muted },
  foodRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  macroList: { flex: 1, gap: spacing.md },
  streak: { fontSize: 13, fontWeight: '600', color: '#ea580c' },
  weekRow: { flexDirection: 'row', justifyContent: 'space-between' },
  weekDay: { alignItems: 'center', gap: spacing.xs },
  dot: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.border },
  dotDone: { backgroundColor: colors.success },
  dotFuture: { opacity: 0.4 },
  dotToday: { borderWidth: 2, borderColor: colors.primary },
  weekLabel: { fontSize: 12, color: colors.muted },
  buttonRow: { flexDirection: 'row', gap: spacing.md },
  button: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    padding: 14,
    alignItems: 'center',
  },
  resumeButton: { backgroundColor: colors.success },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
