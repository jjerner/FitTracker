import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useSession } from '../../../../context/AuthProvider';
import { useDiaryDate } from '../../../../context/DiaryDateProvider';
import {
  defaultMealForNow,
  getFoodById,
  logFoodEntry,
  updateFoodLogEntry,
} from '../../../../lib/foods';
import type { MealType } from '../../../../types/domain';

const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];
const MEAL_LABELS: Record<MealType, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snack',
};

export default function FoodDetail() {
  // entryId/quantity/unit/meal are set only when editing a logged entry.
  const params = useLocalSearchParams<{
    foodId: string;
    entryId?: string;
    quantity?: string;
    unit?: 'g' | 'serving';
    meal?: MealType;
  }>();
  const { foodId, entryId } = params;
  const { session } = useSession();
  const queryClient = useQueryClient();
  const { date: loggedDate } = useDiaryDate();
  const [amount, setAmount] = useState(params.quantity ?? '100');
  const [unit, setUnit] = useState<'g' | 'serving'>(params.unit ?? 'g');
  const [mealType, setMealType] = useState<MealType>(params.meal ?? defaultMealForNow());
  const [isSaving, setIsSaving] = useState(false);

  const { data: food, isLoading } = useQuery({
    queryKey: ['food', foodId],
    queryFn: () => getFoodById(foodId as string),
    enabled: !!foodId,
  });

  const amountNumber = Number(amount) || 0;
  const preview = useMemo(() => {
    if (!food) return null;
    const grams = unit === 'g' ? amountNumber : amountNumber * (food.servingSizeG ?? 100);
    const multiplier = grams / 100;
    return {
      calories: food.caloriesKcal * multiplier,
      protein: food.proteinG * multiplier,
      carbs: food.carbsG * multiplier,
      fat: food.fatG * multiplier,
    };
  }, [food, amountNumber, unit]);

  async function handleSave() {
    if (!food || !session) return;
    setIsSaving(true);
    try {
      if (entryId) {
        await updateFoodLogEntry({
          entryId,
          food,
          mealType,
          quantity: amountNumber,
          quantityUnit: unit,
        });
      } else {
        await logFoodEntry({
          userId: session.user.id,
          food,
          loggedDate,
          mealType,
          quantity: amountNumber,
          quantityUnit: unit,
        });
      }
      await queryClient.invalidateQueries({ queryKey: ['foodDiary', session.user.id, loggedDate] });
      router.dismissTo('/(tabs)/food');
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading || !food) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.name}>{food.name}</Text>
      {food.brand ? <Text style={styles.brand}>{food.brand}</Text> : null}

      {food.servingSizeG ? (
        <View style={styles.mealRow}>
          {(['g', 'serving'] as const).map((u) => (
            <Pressable
              key={u}
              style={[styles.mealChip, unit === u && styles.mealChipActive]}
              onPress={() => {
                setUnit(u);
                setAmount(u === 'g' ? String(food.servingSizeG) : '1');
              }}
            >
              <Text style={unit === u ? styles.mealChipTextActive : styles.mealChipText}>
                {u === 'g'
                  ? 'Grams'
                  : `Serving (${food.servingDescription ?? `${food.servingSizeG} g`})`}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      <Text style={styles.label}>{unit === 'g' ? 'Amount (grams)' : 'Number of servings'}</Text>
      <TextInput
        style={styles.input}
        value={amount}
        onChangeText={setAmount}
        keyboardType="numeric"
      />

      <Text style={styles.label}>Meal</Text>
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

      {preview ? (
        <View style={styles.previewCard}>
          <Text style={styles.previewCalories}>{Math.round(preview.calories)} kcal</Text>
          <Text style={styles.previewMacros}>
            P {Math.round(preview.protein)}g · C {Math.round(preview.carbs)}g · F{' '}
            {Math.round(preview.fat)}g
          </Text>
        </View>
      ) : null}

      <Pressable style={styles.saveButton} onPress={handleSave} disabled={isSaving}>
        {isSaving ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.saveButtonText}>{entryId ? 'Save changes' : 'Add to Diary'}</Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 16 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: 20, fontWeight: '700' },
  brand: { fontSize: 14, color: '#888', marginTop: 2, marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', marginTop: 16, marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
  },
  mealRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  mealChip: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  mealChipActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  mealChipText: { color: '#333' },
  mealChipTextActive: { color: '#fff' },
  previewCard: {
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    padding: 16,
    marginTop: 24,
    alignItems: 'center',
  },
  previewCalories: { fontSize: 20, fontWeight: '700' },
  previewMacros: { fontSize: 14, color: '#555', marginTop: 4 },
  saveButton: {
    backgroundColor: '#2563eb',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginTop: 24,
  },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
