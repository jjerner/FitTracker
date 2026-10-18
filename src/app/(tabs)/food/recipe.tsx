import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router, Stack, useFocusEffect, useLocalSearchParams, useNavigation } from 'expo-router';
import { usePreventRemove } from 'expo-router/react-navigation';
import { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { LabeledInput } from '../../../components/LabeledInput';
import { useSession } from '../../../context/AuthProvider';
import { entryNutrition, getSavedMeals, saveRecipe } from '../../../lib/foods';
import { toNumberOrNull } from '../../../lib/numbers';
import { takePendingRecipeItems } from '../../../lib/recipeDraft';
import type { SavedMeal, SavedMealItem } from '../../../types/domain';
import { colors, radius, spacing } from '../../../theme';

// The amount is kept as typed so "12," can be on the way to "12,5". `key` stays with the row.
type Row = { key: string; item: SavedMealItem; amount: string };
let nextRowKey = 0;
function toRow(item: SavedMealItem): Row {
  return { key: String(nextRowKey++), item, amount: String(item.quantity) };
}

export default function Recipe() {
  const { session } = useSession();
  const userId = session?.user.id;
  const params = useLocalSearchParams<{ id?: string }>();
  // Read once: coming back from the food page (dismissTo) replaces this screen's params.
  const [id] = useState(params.id);
  const { data: meals, isLoading } = useQuery({
    queryKey: ['savedMeals', userId],
    queryFn: () => getSavedMeals(userId as string),
    enabled: !!userId && !!id,
  });

  if (!id) return <RecipeForm />;
  const title = <Stack.Screen options={{ title: 'Edit Recipe' }} />;
  if (isLoading || !userId) {
    return (
      <View style={styles.center}>
        {title}
        <ActivityIndicator />
      </View>
    );
  }
  const meal = meals?.find((m) => m.id === id);
  if (!meal) {
    return (
      <View style={styles.center}>
        {title}
        <Text style={styles.hint}>Couldn&apos;t load this recipe.</Text>
      </View>
    );
  }
  return (
    <>
      {title}
      <RecipeForm meal={meal} />
    </>
  );
}

function RecipeForm({ meal }: { meal?: SavedMeal }) {
  const { session } = useSession();
  const userId = session?.user.id;
  const queryClient = useQueryClient();
  const navigation = useNavigation();
  // Once, on open: throw away foods left in the draft by a recipe that was never finished.
  useState(takePendingRecipeItems);
  const [name, setName] = useState(meal?.name ?? '');
  const [portions, setPortions] = useState(String(meal?.portions ?? 1));
  const [rows, setRows] = useState<Row[]>(() => meal?.items.map(toRow) ?? []);
  const [dirty, setDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const saved = useRef(false);

  // Foods added on the food page come back through the draft module.
  useFocusEffect(
    useCallback(() => {
      const added = takePendingRecipeItems();
      if (added.length === 0) return;
      setRows((current) => [...current, ...added.map(toRow)]);
      setDirty(true);
    }, [])
  );

  usePreventRemove(dirty, ({ data }) => {
    const leave = () => navigation.dispatch(data.action);
    if (saved.current) return leave();
    // Alert has no buttons on web.
    if (Platform.OS === 'web') {
      if (window.confirm('Discard changes?')) leave();
      return;
    }
    Alert.alert('Discard changes?', undefined, [
      { text: 'Keep editing', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: leave },
    ]);
  });

  function edit<T>(setter: (value: T) => void) {
    return (value: T) => {
      setter(value);
      setDirty(true);
    };
  }

  function setAmount(key: string, amount: string) {
    setRows((current) => current.map((row) => (row.key === key ? { ...row, amount } : row)));
    setDirty(true);
  }

  function removeRow(key: string) {
    setRows((current) => current.filter((row) => row.key !== key));
    setDirty(true);
  }

  const portionsNumber = toNumberOrNull(portions) ?? 0;
  const items = rows.map((row) => ({ ...row.item, quantity: toNumberOrNull(row.amount) ?? 0 }));
  const kcal = items.map(
    (i) => entryNutrition(i.food, i.quantity, i.quantityUnit, i.servingG).calories_kcal
  );
  const totalKcal = kcal.reduce((sum, k) => sum + k, 0);
  // What still stops Save, shown above the button.
  const missing = !name.trim()
    ? 'Give the recipe a name.'
    : items.length === 0
      ? 'Add at least one ingredient.'
      : !items.every((i) => i.quantity > 0)
        ? 'Every amount must be more than 0.'
        : !(portionsNumber > 0 && portionsNumber <= 1000)
          ? 'Portions must be more than 0 and at most 1000.'
          : null;
  const canSave = missing == null;

  async function handleSave() {
    if (!userId || !canSave) return;
    setIsSaving(true);
    try {
      await saveRecipe(userId, {
        id: meal?.id,
        name: name.trim(),
        portions: portionsNumber,
        items,
      });
      await queryClient.invalidateQueries({ queryKey: ['savedMeals', userId] });
      saved.current = true;
      router.back();
    } catch {
      Alert.alert('Could not save recipe', 'Check your connection and try again.');
      setIsSaving(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <LabeledInput
          label="Name"
          placeholder="e.g. Pancakes"
          value={name}
          onChangeText={edit(setName)}
        />
        <LabeledInput
          label="Portions it makes"
          placeholder="e.g. 12"
          keyboardType="numeric"
          value={portions}
          onChangeText={edit(setPortions)}
        />

        <Text style={styles.label}>Ingredients</Text>
        {rows.length === 0 ? (
          <Text style={styles.hint}>No ingredients yet. Tap + Add ingredient.</Text>
        ) : null}
        {rows.map((row, index) => (
          <View key={row.key} style={styles.row}>
            <Text style={styles.rowName}>{row.item.food.name}</Text>
            <View style={styles.rowControls}>
              <TextInput
                style={styles.amountInput}
                value={row.amount}
                onChangeText={(text) => setAmount(row.key, text)}
                keyboardType="numeric"
                accessibilityLabel={`Amount of ${row.item.food.name}`}
              />
              <Text style={styles.unit}>
                {row.item.quantityUnit === 'g' ? 'g' : 'serving(s)'}
              </Text>
              <Text style={styles.rowKcal}>{Math.round(kcal[index])} kcal</Text>
              <Pressable
                style={styles.remove}
                onPress={() => removeRow(row.key)}
                accessibilityRole="button"
                accessibilityLabel={`Remove ${row.item.food.name}`}
              >
                <Text style={styles.removeText}>✕</Text>
              </Pressable>
            </View>
          </View>
        ))}

        <Pressable
          style={styles.addButton}
          onPress={() => router.push('/(tabs)/food/search?recipe=1')}
        >
          <Text style={styles.addButtonText}>+ Add ingredient</Text>
        </Pressable>

        <View style={styles.totalsCard}>
          <Text style={styles.totalsMain}>{Math.round(totalKcal)} kcal in total</Text>
          <Text style={styles.totalsSub}>
            {portionsNumber > 0 ? `${Math.round(totalKcal / portionsNumber)} kcal per portion` : ' '}
          </Text>
        </View>

        {missing ? <Text style={styles.missing}>{missing}</Text> : null}
        <Pressable
          style={[styles.saveButton, !canSave && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={!canSave || isSaving}
          accessibilityRole="button"
          accessibilityState={{ disabled: !canSave || isSaving, busy: isSaving }}
        >
          {isSaving ? (
            <ActivityIndicator color={colors.onPrimary} />
          ) : (
            <Text style={styles.saveButtonText}>Save</Text>
          )}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  container: { padding: spacing.lg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  label: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: spacing.xs },
  hint: { fontSize: 14, color: colors.muted, paddingVertical: spacing.sm },
  row: {
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowName: { fontSize: 15, fontWeight: '500', color: colors.text },
  rowControls: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  amountInput: {
    width: 72,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    fontSize: 15,
    color: colors.text,
    textAlign: 'right',
  },
  unit: { fontSize: 13, color: colors.muted },
  rowKcal: { flex: 1, fontSize: 13, color: colors.textSecondary, textAlign: 'right' },
  remove: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  removeText: { fontSize: 16, color: colors.subtle },
  addButton: {
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  addButtonText: { color: colors.primary, fontSize: 15, fontWeight: '600' },
  totalsCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginTop: spacing.xl,
    alignItems: 'center',
  },
  totalsMain: { fontSize: 20, fontWeight: '700', color: colors.text },
  totalsSub: { fontSize: 14, color: colors.textSecondary, marginTop: spacing.xs },
  missing: { fontSize: 14, color: colors.muted, textAlign: 'center', marginTop: spacing.lg },
  saveButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    padding: 14,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  saveButtonDisabled: { opacity: 0.5 },
  saveButtonText: { color: colors.onPrimary, fontSize: 16, fontWeight: '600' },
});
