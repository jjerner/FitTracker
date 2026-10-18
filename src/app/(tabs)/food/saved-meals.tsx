import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
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
  scaleSavedMealItems,
} from '../../../lib/foods';
import { toNumberOrNull } from '../../../lib/numbers';
import type { MealType, SavedMeal } from '../../../types/domain';
import { colors } from '../../../theme';

const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];
const MEAL_LABELS: Record<MealType, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snack',
};

function mealCalories(items: SavedMeal['items']): number {
  return items.reduce(
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
  // The recipe whose "How many portions?" popup is open, and what is typed in it.
  const [askingMeal, setAskingMeal] = useState<SavedMeal | null>(null);
  const [eaten, setEaten] = useState('1');
  const eatenNumber = toNumberOrNull(eaten) ?? 0;

  const { data: meals, isLoading } = useQuery({
    queryKey: ['savedMeals', userId],
    queryFn: () => getSavedMeals(userId as string),
    enabled: !!userId,
  });

  async function handleLog(meal: SavedMeal, portions = meal.portions) {
    if (!userId || busyId) return;
    setBusyId(meal.id);
    try {
      await logSavedMeal(userId, meal, date, mealType, portions);
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
      <Pressable style={styles.newRecipe} onPress={() => router.push('/(tabs)/food/recipe')}>
        <Text style={styles.newRecipeText}>New recipe</Text>
      </Pressable>

      <Modal
        visible={askingMeal != null}
        transparent
        animationType="fade"
        onRequestClose={() => setAskingMeal(null)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setAskingMeal(null)}>
          <Pressable style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {askingMeal?.name}: how many portions? (of {askingMeal?.portions})
            </Text>
            <TextInput
              style={styles.modalInput}
              value={eaten}
              onChangeText={setEaten}
              keyboardType="numeric"
              selectTextOnFocus
              autoFocus
            />
            <Text style={styles.modalPreview}>
              {askingMeal
                ? Math.round(mealCalories(scaleSavedMealItems(askingMeal, eatenNumber)))
                : 0}{' '}
              kcal
            </Text>
            <Pressable
              style={[styles.logButton, !(eatenNumber > 0) && styles.buttonDisabled]}
              disabled={!(eatenNumber > 0) || !!busyId}
              onPress={() => {
                const meal = askingMeal!;
                setAskingMeal(null);
                handleLog(meal, eatenNumber);
              }}
            >
              <Text style={styles.logButtonText}>Log</Text>
            </Pressable>
            <Pressable style={styles.cancelButton} onPress={() => setAskingMeal(null)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

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
              No saved meals yet. Tap &quot;New recipe&quot; above, or on the diary tap &quot;Save as
              meal&quot; on a meal.
            </Text>
          }
          renderItem={({ item }) => (
            <View style={styles.row}>
              <Pressable
                style={styles.rowTap}
                onPress={() => {
                  if (item.portions === 1) return handleLog(item);
                  setEaten('1');
                  setAskingMeal(item);
                }}
                disabled={!!busyId}
              >
                <View style={styles.rowInfo}>
                  <Text style={styles.rowName}>{item.name}</Text>
                  <Text style={styles.rowSub}>
                    {item.items.length} {item.items.length === 1 ? 'food' : 'foods'} ·{' '}
                    {item.portions === 1
                      ? `${Math.round(mealCalories(item.items))} kcal`
                      : `makes ${item.portions} · ${Math.round(mealCalories(item.items) / item.portions)} kcal per portion`}
                  </Text>
                </View>
                {busyId === item.id ? <ActivityIndicator /> : <Text style={styles.add}>Add</Text>}
              </Pressable>
              <Pressable
                onPress={() => router.push(`/(tabs)/food/recipe?id=${item.id}`)}
                style={styles.iconButton}
                accessibilityRole="button"
                accessibilityLabel={`Edit ${item.name}`}
              >
                <Text style={styles.edit}>Edit</Text>
              </Pressable>
              <Pressable
                onPress={() => confirmDelete(item)}
                style={styles.iconButton}
                accessibilityRole="button"
                accessibilityLabel={`Delete ${item.name}`}
              >
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
  edit: { fontSize: 14, color: colors.primary },
  iconButton: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  cancelButton: { alignItems: 'center', paddingTop: 12 },
  cancelText: { color: colors.muted, fontSize: 15, fontWeight: '600' },
  newRecipe: {
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  newRecipeText: { color: colors.primary, fontSize: 15, fontWeight: '600' },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    padding: 16,
  },
  modalCard: { backgroundColor: colors.background, borderRadius: 12, padding: 16 },
  modalTitle: { fontSize: 17, fontWeight: '600', marginBottom: 12 },
  modalInput: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
  },
  modalPreview: { fontSize: 15, color: colors.textSecondary, marginTop: 12 },
  logButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginTop: 16,
  },
  logButtonText: { color: colors.onPrimary, fontSize: 16, fontWeight: '600' },
  buttonDisabled: { opacity: 0.5 },
});
