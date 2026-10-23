import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router, Stack, useLocalSearchParams } from 'expo-router';
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
  getFavouriteFoods,
  getFoodServings,
  logFoodEntry,
  setFavouriteFood,
  updateFoodLogEntry,
  updateFoodServing,
} from '../../../../lib/foods';
import { toNumberOrNull } from '../../../../lib/numbers';
import { addPendingRecipeItem } from '../../../../lib/recipeDraft';
import { AppText } from '../../../../components/AppText';
import { Button } from '../../../../components/Button';
import { Card } from '../../../../components/Card';
import { LabeledInput } from '../../../../components/LabeledInput';
import { TextLink } from '../../../../components/TextLink';
import type { MealType } from '../../../../types/domain';
import { colors, radius, spacing } from '../../../../theme';

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
  // recipe is set when adding an ingredient to the Recipe screen instead of the diary.
  const params = useLocalSearchParams<{
    foodId: string;
    entryId?: string;
    quantity?: string;
    unit?: 'g' | 'serving';
    servingG?: string;
    meal?: MealType;
    recipe?: string;
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
  const { data: favourites } = useQuery({
    queryKey: ['favouriteFoods', userId],
    queryFn: () => getFavouriteFoods(userId as string),
    enabled: !!userId,
  });
  const isFavourite = !!favourites?.some((f) => f.id === foodId);

  async function toggleFavourite() {
    try {
      await setFavouriteFood(userId as string, foodId as string, !isFavourite);
    } catch {
      Alert.alert('Could not save', 'Check your connection and try again.');
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ['favouriteFoods', userId] });
  }

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
    const size = toNumberOrNull(servingSize) ?? 0;
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

  const amountNumber = toNumberOrNull(amount) ?? 0;
  const recipeBlocked = !!params.recipe && !(amountNumber > 0);
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
    if (params.recipe) {
      addPendingRecipeItem({
        food,
        quantity: amountNumber,
        quantityUnit: unit,
        servingG: selected?.grams ?? null,
      });
      router.dismissTo('/(tabs)/food/recipe');
      return;
    }
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
      {params.recipe ? <Stack.Screen options={{ title: 'Add to Recipe' }} /> : null}
      <Card>
        <View style={styles.nameRow}>
          <AppText variant="heading" style={styles.nameText}>
            {food.name}
          </AppText>
          <Pressable
            onPress={toggleFavourite}
            disabled={!favourites}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel={isFavourite ? 'Remove from favourites' : 'Add to favourites'}
          >
            <Text style={[styles.star, isFavourite && styles.starOn]}>{isFavourite ? '★' : '☆'}</Text>
          </Pressable>
        </View>
        {food.brand ? (
          <AppText variant="small" style={styles.brand}>
            {food.brand}
          </AppText>
        ) : null}

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
              <TextLink title="Save serving size" onPress={handleSaveServing} />
              <TextLink title="Cancel" onPress={() => setEditor(null)} />
            </View>
          </View>
        ) : (
          <View style={styles.linkRow}>
            <TextLink
              title="Add serving size"
              onPress={() => {
                setServingSize('');
                setServingName('');
                setEditor('add');
              }}
            />
            {canEditDefault ? (
              <TextLink
                title="Edit default serving"
                onPress={() => {
                  setServingSize(String(food.servingSizeG));
                  setServingName(food.servingDescription ?? '');
                  setEditor('default');
                }}
              />
            ) : null}
            {canDeleteSelected ? (
              <TextLink title="Delete this serving" tone="danger" onPress={handleDeleteServing} />
            ) : null}
          </View>
        )}
      </Card>

      <Card style={{ marginTop: spacing.md }}>
        <AppText variant="labelSmall">
          {unit === 'g' ? 'Amount (grams)' : 'Number of servings'}
        </AppText>
        <TextInput
          style={styles.input}
          value={amount}
          onChangeText={setAmount}
          keyboardType="numeric"
        />

        {params.recipe ? null : (
          <>
            <AppText variant="labelSmall" style={styles.label}>
              Meal
            </AppText>
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
          </>
        )}

        {preview ? (
          <View style={styles.preview}>
            <AppText variant="heading">{Math.round(preview.calories)} kcal</AppText>
            <AppText variant="small">
              P {Math.round(preview.protein)}g · C {Math.round(preview.carbs)}g · F{' '}
              {Math.round(preview.fat)}g
            </AppText>
          </View>
        ) : null}
      </Card>

      <Button
        title={params.recipe ? 'Add to Recipe' : entryId ? 'Save changes' : 'Add to Diary'}
        onPress={handleSave}
        disabled={recipeBlocked}
        loading={isSaving}
        style={{ marginTop: spacing.xl }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface, padding: 16 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
  nameRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  nameText: { flex: 1 },
  star: { fontSize: 26, color: colors.muted },
  starOn: { color: colors.streak },
  brand: { marginTop: spacing.xs, marginBottom: 8 },
  label: { marginTop: 8 },
  linkRow: { flexDirection: 'row', flexWrap: 'wrap', marginLeft: -spacing.md },
  input: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
  },
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
  preview: { alignItems: 'center', gap: 4, marginTop: 8 },
});
