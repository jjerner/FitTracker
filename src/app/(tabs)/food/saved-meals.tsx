import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useSession } from '../../../context/AuthProvider';
import { useDiaryDate } from '../../../context/DiaryDateProvider';
import {
  defaultMealForNow,
  deleteSavedMeal,
  entryNutrition,
  getSavedMeals,
  logSavedMeal,
} from '../../../lib/foods';
import type { MealType, SavedMeal } from '../../../types/domain';
import { colors } from '../../../theme';

const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];
const MEAL_LABELS: Record<MealType, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snack',
};

function mealCalories(meal: SavedMeal): number {
  return meal.items.reduce(
    (sum, i) =>
      sum + entryNutrition(i.food, i.quantity, i.quantityUnit, i.servingG).calories_kcal,
    0
  );
}

export default function SavedMeals() {
  const { session } = useSession();
  const userId = session?.user.id;
  const { date } = useDiaryDate();
  const queryClient = useQueryClient();
  const params = useLocalSearchParams<{ meal?: MealType }>();
  const [mealType, setMealType] = useState<MealType>(params.meal ?? defaultMealForNow());
  const [busyId, setBusyId] = useState<string | null>(null);

  const { data: meals, isLoading } = useQuery({
    queryKey: ['savedMeals', userId],
    queryFn: () => getSavedMeals(userId as string),
    enabled: !!userId,
  });

  async function handleLog(meal: SavedMeal) {
    if (!userId || busyId) return;
    setBusyId(meal.id);
    try {
      await logSavedMeal(userId, meal, date, mealType);
      await queryClient.invalidateQueries({ queryKey: ['foodDiary', userId, date] });
      router.dismissTo('/(tabs)/food');
    } catch {
      Alert.alert('Could not log meal', 'Check your connection and try again.');
      setBusyId(null);
    }
  }

  function confirmDelete(meal: SavedMeal) {
    Alert.alert('Delete saved meal?', meal.name, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteSavedMeal(meal.id);
            await queryClient.invalidateQueries({ queryKey: ['savedMeals', userId] });
          } catch {
            Alert.alert('Could not delete', 'Check your connection and try again.');
          }
        },
      },
    ]);
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Log to</Text>
      <View style={styles.mealRow}>
        {MEAL_TYPES.map((type) => (
          <Pressable
            key={type}
            style={[styles.mealChip, mealType === type && styles.mealChipActive]}
            onPress={() => setMealType(type)}
          >
            <Text style={mealType === type ? styles.mealChipTextActive : styles.mealChipText}>
              {MEAL_LABELS[type]}
            </Text>
          </Pressable>
        ))}
      </View>

      {isLoading ? (
        <ActivityIndicator style={styles.loading} />
      ) : (
        <FlatList
          data={meals ?? []}
          keyExtractor={(m) => m.id}
          ListEmptyComponent={
            <Text style={styles.empty}>
              No saved meals yet. On the diary, tap &quot;Save as meal&quot; on a meal to create one.
            </Text>
          }
          renderItem={({ item }) => (
            <View style={styles.row}>
              <Pressable style={styles.rowTap} onPress={() => handleLog(item)} disabled={!!busyId}>
                <View style={styles.rowInfo}>
                  <Text style={styles.rowName}>{item.name}</Text>
                  <Text style={styles.rowSub}>
                    {item.items.length} {item.items.length === 1 ? 'food' : 'foods'} ·{' '}
                    {Math.round(mealCalories(item))} kcal
                  </Text>
                </View>
                {busyId === item.id ? <ActivityIndicator /> : <Text style={styles.add}>Add</Text>}
              </Pressable>
              <Pressable onPress={() => confirmDelete(item)} hitSlop={10}>
                <Text style={styles.delete}>✕</Text>
              </Pressable>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: 16 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  loading: { paddingVertical: 40 },
  empty: { color: colors.muted, fontSize: 14, paddingVertical: 24 },
  mealRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  mealChip: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  mealChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  mealChipText: { color: colors.textSecondary },
  mealChipTextActive: { color: colors.onPrimary },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowTap: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowInfo: { flex: 1 },
  rowName: { fontSize: 15, fontWeight: '500' },
  rowSub: { fontSize: 13, color: colors.muted },
  add: { fontSize: 15, color: colors.primary, fontWeight: '600' },
  delete: { fontSize: 16, color: colors.subtle, paddingHorizontal: 4 },
});
