import { router } from 'expo-router';
import { useMemo } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useFoodDiary } from '../../../hooks/useFoodDiary';
import { useNutritionGoals } from '../../../hooks/useNutritionGoals';
import { todayLocalDate } from '../../../lib/dateUtils';
import type { FoodLogEntry, MealType } from '../../../types/domain';

const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];
const MEAL_LABELS: Record<MealType, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snack',
};

export default function FoodDiary() {
  const date = todayLocalDate();
  const { data: entries, isLoading, deleteEntry } = useFoodDiary(date);
  const { data: goals } = useNutritionGoals();

  const totals = useMemo(() => {
    return (entries ?? []).reduce(
      (acc, e) => ({
        calories: acc.calories + e.caloriesKcal,
        protein: acc.protein + e.proteinG,
        carbs: acc.carbs + e.carbsG,
        fat: acc.fat + e.fatG,
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );
  }, [entries]);

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.totalsCard}>
        <Text style={styles.totalsCalories}>
          {Math.round(totals.calories)}
          {goals ? ` / ${goals.caloriesKcal}` : ''} kcal
        </Text>
        <Text style={styles.totalsMacros}>
          P {Math.round(totals.protein)}
          {goals ? `/${goals.proteinG}` : ''}g · C {Math.round(totals.carbs)}
          {goals ? `/${goals.carbsG}` : ''}g · F {Math.round(totals.fat)}
          {goals ? `/${goals.fatG}` : ''}g
        </Text>
      </View>

      {MEAL_TYPES.map((mealType) => {
        const mealEntries = (entries ?? []).filter((e) => e.mealType === mealType);
        return (
          <View key={mealType} style={styles.mealSection}>
            <Text style={styles.mealTitle}>{MEAL_LABELS[mealType]}</Text>
            {mealEntries.length === 0 ? (
              <Text style={styles.emptyText}>Nothing logged</Text>
            ) : (
              mealEntries.map((entry) => (
                <EntryRow key={entry.id} entry={entry} onDelete={() => deleteEntry(entry.id)} />
              ))
            )}
          </View>
        );
      })}

      <Pressable
        style={styles.logButton}
        onPress={() => router.push('/(tabs)/food/search')}
      >
        <Text style={styles.logButtonText}>+ Log Food</Text>
      </Pressable>
    </ScrollView>
  );
}

function EntryRow({ entry, onDelete }: { entry: FoodLogEntry; onDelete: () => void }) {
  return (
    <Pressable style={styles.entryRow} onLongPress={onDelete}>
      <Text style={styles.entryName}>{entry.foodName}</Text>
      <Text style={styles.entryCalories}>{Math.round(entry.caloriesKcal)} kcal</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16, paddingBottom: 40 },
  totalsCard: {
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    alignItems: 'center',
  },
  totalsCalories: { fontSize: 24, fontWeight: '700' },
  totalsMacros: { fontSize: 14, color: '#555', marginTop: 4 },
  mealSection: { marginBottom: 20 },
  mealTitle: { fontSize: 16, fontWeight: '600', marginBottom: 8 },
  emptyText: { color: '#999', fontSize: 14 },
  entryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  entryName: { fontSize: 15 },
  entryCalories: { fontSize: 15, color: '#555' },
  logButton: {
    backgroundColor: '#2563eb',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  logButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
