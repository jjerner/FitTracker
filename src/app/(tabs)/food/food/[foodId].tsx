import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useSession } from '../../../../context/AuthProvider';
import { useDiaryDate } from '../../../../context/DiaryDateProvider';
import {
  addFoodServing,
  defaultMealForNow,
  deleteFoodServing,
  getFoodById,
  getFoodServings,
  logFoodEntry,
  updateFoodLogEntry,
  updateFoodServing,
} from '../../../../lib/foods';
import { LabeledInput } from '../../../../components/LabeledInput';
import type { MealType } from '../../../../types/domain';

const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];
const MEAL_LABELS: Record<MealType, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snack',
};

type ServingOption = { id: string; label: string; grams: number };

export default function FoodDetail() {
  // entryId/quantity/unit/servingG/meal are set only when editing a logged entry.
  const params = useLocalSearchParams<{
    foodId: string;
    entryId?: string;
    quantity?: string;
    unit?: 'g' | 'serving';
    servingG?: string;
    meal?: MealType;
  }>();
  const { foodId, entryId } = params;
  const { session } = useSession();
  const userId = session?.user.id;
  const queryClient = useQueryClient();
  const { date: loggedDate } = useDiaryDate();
  const [amount, setAmount] = useState(params.quantity ?? '100');
  // 'g', a serving's id, or 'entry' (the serving the edited entry was logged in).
  const [selectedId, setSelectedId] = useState(params.unit === 'serving' ? 'entry' : 'g');
  const [mealType, setMealType] = useState<MealType>(params.meal ?? defaultMealForNow());
  const [isSaving, setIsSaving] = useState(false);

  const { data: food, isLoading } = useQuery({
    queryKey: ['food', foodId],
    queryFn: () => getFoodById(foodId as string),
    enabled: !!foodId,
  });

  // The user's own saved servings for this food.
  const { data: myServings } = useQuery({
    queryKey: ['foodServings', userId, foodId],
    queryFn: () => getFoodServings(userId as string, foodId as string),
    enabled: !!userId && !!foodId,
  });

  // The food's built-in serving first, then the user's own.
  const options = useMemo<ServingOption[]>(() => {
    if (!food) return [];
    const list: ServingOption[] = [];
    if (food.servingSizeG) {
      list.push({
        id: 'default',
        grams: food.servingSizeG,
        label: food.servingDescription ?? `Serving (${food.servingSizeG} g)`,
      });
    }
    for (const serving of myServings ?? []) {
      list.push({
        id: serving.id,
        grams: serving.grams,
        label: `${serving.name} (${serving.grams} g)`,
      });
    }
    return list;
  }, [food, myServings]);

  const entryGrams = Number(params.servingG) || null;
  const selected = useMemo<ServingOption | null>(() => {
    if (selectedId === 'g') return null;
    if (selectedId === 'entry') {
      const grams = entryGrams ?? food?.servingSizeG ?? 100;
      return (
        options.find((o) => o.grams === grams) ?? { id: 'entry', grams, label: `Serving (${grams} g)` }
      );
    }
    return options.find((o) => o.id === selectedId) ?? null;
  }, [selectedId, entryGrams, food, options]);
  // A serving the entry used that no longer exists is still shown, so editing keeps it.
  const chips =
    selected && !options.some((o) => o.id === selected.id) ? [...options, selected] : options;
  const unit: 'g' | 'serving' = selected ? 'serving' : 'g';

  function selectOption(option: ServingOption | null) {
    setAmount(option ? '1' : String(selected?.grams ?? 100));
    setSelectedId(option ? option.id : 'g');
  }

  // 'add': a new personal serving (any food). 'default': the built-in serving of a custom
  // food, only for its creator (the database enforces this too).
  const [editor, setEditor] = useState<null | 'add' | 'default'>(null);
  const [servingSize, setServingSize] = useState('');
  const [servingName, setServingName] = useState('');
  const canEditDefault = !!food && !!food.servingSizeG && !!userId && food.createdBy === userId;
  // Your own servings, and the built-in one on a custom food you made. Servings that come
  // with other foods (e.g. from a barcode) can't be removed.
  const canDeleteSelected =
    !!selected &&
    selected.id !== 'entry' &&
    (selected.id !== 'default' || canEditDefault);

  async function handleSaveServing() {
    if (!food || !userId) return;
    const size = Number(servingSize);
    try {
      if (editor === 'add') {
        if (!(size > 0)) return;
        const created = await addFoodServing({
          userId,
          foodId: food.id,
          name: servingName.trim() || 'Serving',
          grams: size,
        });
        await queryClient.invalidateQueries({ queryKey: ['foodServings', userId, foodId] });
        setSelectedId(created.id);
        setAmount('1');
      } else {
        await updateFoodServing(
          food.id,
          size > 0 ? size : null,
          size > 0 && servingName.trim() ? servingName.trim() : null
        );
        await queryClient.invalidateQueries({ queryKey: ['food', foodId] });
        setSelectedId('g');
        setAmount('100');
      }
      setEditor(null);
    } catch {
      Alert.alert('Could not save', 'Check your connection and try again.');
    }
  }

  function handleDeleteServing() {
    if (!selected || !canDeleteSelected) return;
    Alert.alert('Delete serving?', selected.label, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            if (selected.id === 'default') {
              await updateFoodServing(food!.id, null, null);
              await queryClient.invalidateQueries({ queryKey: ['food', foodId] });
            } else {
              await deleteFoodServing(selected.id);
              await queryClient.invalidateQueries({ queryKey: ['foodServings', userId, foodId] });
            }
            selectOption(null);
          } catch {
            Alert.alert('Could not delete', 'Check your connection and try again.');
          }
        },
      },
    ]);
  }

  const amountNumber = Number(amount) || 0;
  const preview = useMemo(() => {
    if (!food) return null;
    const grams = selected ? amountNumber * selected.grams : amountNumber;
    const multiplier = grams / 100;
    return {
      calories: food.caloriesKcal * multiplier,
      protein: food.proteinG * multiplier,
      carbs: food.carbsG * multiplier,
      fat: food.fatG * multiplier,
    };
  }, [food, amountNumber, selected]);

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
          servingG: selected?.grams ?? null,
        });
      } else {
        await logFoodEntry({
          userId: session.user.id,
          food,
          loggedDate,
          mealType,
          quantity: amountNumber,
          quantityUnit: unit,
          servingG: selected?.grams ?? null,
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

      {chips.length > 0 ? (
        <View style={styles.mealRow}>
          <Pressable
            style={[styles.mealChip, !selected && styles.mealChipActive]}
            onPress={() => selectOption(null)}
          >
            <Text style={!selected ? styles.mealChipTextActive : styles.mealChipText}>Grams</Text>
          </Pressable>
          {chips.map((option) => (
            <Pressable
              key={option.id}
              style={[styles.mealChip, selected?.id === option.id && styles.mealChipActive]}
              onPress={() => selectOption(option)}
            >
              <Text
                style={selected?.id === option.id ? styles.mealChipTextActive : styles.mealChipText}
              >
                {option.label}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      {editor ? (
        <View>
          <LabeledInput
            label="Serving size (g)"
            placeholder="e.g. 45"
            keyboardType="numeric"
            value={servingSize}
            onChangeText={setServingSize}
          />
          <LabeledInput
            label={editor === 'add' ? 'Serving name' : 'Serving name — optional'}
            placeholder="e.g. 1 slice"
            value={servingName}
            onChangeText={setServingName}
          />
          <View style={styles.linkRow}>
            <Pressable onPress={handleSaveServing}>
              <Text style={styles.servingLink}>Save serving size</Text>
            </Pressable>
            <Pressable onPress={() => setEditor(null)}>
              <Text style={styles.servingLinkMuted}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <View style={styles.linkRow}>
          <Pressable
            onPress={() => {
              setServingSize('');
              setServingName('');
              setEditor('add');
            }}
          >
            <Text style={styles.servingLink}>Add serving size</Text>
          </Pressable>
          {canEditDefault ? (
            <Pressable
              onPress={() => {
                setServingSize(String(food.servingSizeG));
                setServingName(food.servingDescription ?? '');
                setEditor('default');
              }}
            >
              <Text style={styles.servingLink}>Edit default serving</Text>
            </Pressable>
          ) : null}
          {canDeleteSelected ? (
            <Pressable onPress={handleDeleteServing}>
              <Text style={styles.servingLinkMuted}>Delete this serving</Text>
            </Pressable>
          ) : null}
        </View>
      )}

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
  linkRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginTop: 12 },
  servingLink: { color: '#2563eb', fontSize: 14 },
  servingLinkMuted: { color: '#6b7280', fontSize: 14 },
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
