import { useQueryClient } from '@tanstack/react-query';
import { router, useFocusEffect, useLocalSearchParams, useNavigation } from 'expo-router';
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
import { entryNutrition, saveRecipe } from '../../../lib/foods';
import { toNumberOrNull } from '../../../lib/numbers';
import { takePendingRecipeItems } from '../../../lib/recipeDraft';
import type { SavedMeal, SavedMealItem } from '../../../types/domain';
import { colors, radius, spacing } from '../../../theme';

// The amount is kept as typed so "12," can be on the way to "12,5".
type Row = { item: SavedMealItem; amount: string };

export default function Recipe() {
  const { session } = useSession();
  const userId = session?.user.id;
  const queryClient = useQueryClient();
  const navigation = useNavigation();
  const params = useLocalSearchParams<{ id?: string }>();
  // Read once: coming back from the food page (dismissTo) replaces this screen's params.
  // shortcut: when the list isn't cached (e.g. a web reload on ?id=), this opens as a new recipe; load the meal by id if that matters.
  const [meal] = useState(() =>
    queryClient
      .getQueryData<SavedMeal[]>(['savedMeals', userId])
      ?.find((m) => m.id === params.id)
  );
  const [name, setName] = useState(meal?.name ?? '');
  const [portions, setPortions] = useState(String(meal?.portions ?? 1));
  const [rows, setRows] = useState<Row[]>(
    () => meal?.items.map((item) => ({ item, amount: String(item.quantity) })) ?? []
  );
  const [dirty, setDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const saved = useRef(false);

  // Foods added on the food page come back through the draft module.
  useFocusEffect(
    useCallback(() => {
      const added = takePendingRecipeItems();
      if (added.length === 0) return;
      setRows((current) => [
        ...current,
        ...added.map((item) => ({ item, amount: String(item.quantity) })),
      ]);
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

  function setAmount(index: number, amount: string) {
    setRows((current) => current.map((row, i) => (i === index ? { ...row, amount } : row)));
    setDirty(true);
  }

  function removeRow(index: number) {
    setRows((current) => current.filter((_, i) => i !== index));
    setDirty(true);
  }

  const portionsNumber = toNumberOrNull(portions) ?? 0;
  const items = rows.map((row) => ({ ...row.item, quantity: toNumberOrNull(row.amount) ?? 0 }));
  const kcal = items.map(
    (i) => entryNutrition(i.food, i.quantity, i.quantityUnit, i.servingG).calories_kcal
  );
  const totalKcal = kcal.reduce((sum, k) => sum + k, 0);
  const canSave =
    !!name.trim() &&
    items.length > 0 &&
    items.every((i) => i.quantity > 0) &&
    portionsNumber > 0;

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
        {rows.map((row, index) => (
          <View key={index} style={styles.row}>
            <Text style={styles.rowName} numberOfLines={2}>
              {row.item.food.name}
            </Text>
            <TextInput
              style={styles.amountInput}
              value={row.amount}
              onChangeText={(text) => setAmount(index, text)}
              keyboardType="numeric"
              accessibilityLabel={`Amount of ${row.item.food.name}`}
            />
            <Text style={styles.unit}>
              {row.item.quantityUnit === 'g' ? 'g' : 'serving(s)'}
            </Text>
            <Text style={styles.rowKcal}>{Math.round(kcal[index])} kcal</Text>
            <Pressable
              onPress={() => removeRow(index)}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel={`Remove ${row.item.food.name}`}
            >
              <Text style={styles.remove}>✕</Text>
            </Pressable>
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

        <Pressable
          style={[styles.saveButton, !canSave && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={!canSave || isSaving}
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
  label: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: spacing.xs },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowName: { flex: 1, fontSize: 15, fontWeight: '500', color: colors.text },
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
  rowKcal: { width: 64, fontSize: 13, color: colors.textSecondary, textAlign: 'right' },
  remove: { fontSize: 16, color: colors.subtle, paddingHorizontal: spacing.xs },
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
  saveButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    padding: 14,
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  saveButtonDisabled: { opacity: 0.5 },
  saveButtonText: { color: colors.onPrimary, fontSize: 16, fontWeight: '600' },
});
