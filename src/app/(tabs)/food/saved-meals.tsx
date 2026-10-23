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
import { AppText } from '../../../components/AppText';
import { Button } from '../../../components/Button';
import { Card } from '../../../components/Card';
import { EmptyState } from '../../../components/EmptyState';
import { TextLink } from '../../../components/TextLink';
import type { MealType, SavedMeal } from '../../../types/domain';
import { colors, radius, spacing } from '../../../theme';

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
      <Button
        title="New recipe"
        variant="secondary"
        onPress={() => router.push('/(tabs)/food/recipe')}
        style={{ marginBottom: spacing.lg }}
      />

      <Modal
        visible={askingMeal != null}
        transparent
        animationType="fade"
        onRequestClose={() => setAskingMeal(null)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setAskingMeal(null)}>
          <Pressable>
            <Card>
              <AppText variant="label">
                {askingMeal?.name}: how many portions? (of {askingMeal?.portions})
              </AppText>
              <TextInput
                style={styles.modalInput}
                value={eaten}
                onChangeText={setEaten}
                keyboardType="decimal-pad"
                accessibilityLabel="Portions eaten"
                selectTextOnFocus
                autoFocus
              />
              <AppText style={{ color: colors.textSecondary }}>
                {askingMeal
                  ? Math.round(mealCalories(scaleSavedMealItems(askingMeal, eatenNumber)))
                  : 0}{' '}
                kcal
              </AppText>
              <Button
                title="Log"
                disabled={!(eatenNumber > 0) || !!busyId}
                onPress={() => {
                  const meal = askingMeal!;
                  setAskingMeal(null);
                  handleLog(meal, eatenNumber);
                }}
              />
              <TextLink title="Cancel" onPress={() => setAskingMeal(null)} />
            </Card>
          </Pressable>
        </Pressable>
      </Modal>

      <Card style={{ marginBottom: spacing.md }}>
        <AppText variant="labelSmall">Log to</AppText>
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
      </Card>

      {isLoading ? (
        <ActivityIndicator style={styles.loading} />
      ) : (
        <Card style={{ flexShrink: 1 }}>
          <FlatList
            data={meals ?? []}
            keyExtractor={(m) => m.id}
            ListEmptyComponent={
              <EmptyState message='No saved meals yet. Tap "New recipe" above, or on the diary tap "Save as meal" on a meal.' />
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
                    <AppText variant="label">{item.name}</AppText>
                    <AppText variant="small">
                      {item.items.length} {item.items.length === 1 ? 'food' : 'foods'} ·{' '}
                      {item.portions === 1
                        ? `${Math.round(mealCalories(item.items))} kcal`
                        : `makes ${item.portions} · ${Math.round(mealCalories(item.items) / item.portions)} kcal per portion`}
                    </AppText>
                  </View>
                  {busyId === item.id ? (
                    <ActivityIndicator />
                  ) : (
                    <AppText variant="label" style={{ color: colors.primary }}>
                      Add
                    </AppText>
                  )}
                </Pressable>
                <Pressable
                  onPress={() => router.push(`/(tabs)/food/recipe?id=${item.id}`)}
                  style={styles.iconButton}
                  accessibilityRole="button"
                  accessibilityLabel={`Edit ${item.name}`}
                >
                  <AppText variant="small" style={{ color: colors.primary }}>
                    Edit
                  </AppText>
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
        </Card>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface, padding: 16 },
  loading: { paddingVertical: spacing.xxl },
  mealRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  mealChip: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.full,
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
  delete: { fontSize: 16, color: colors.muted, paddingHorizontal: 4 },
  iconButton: { minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    padding: 16,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
  },
});
