import { useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useSession } from '../../../context/AuthProvider';
import { useDiaryDate } from '../../../context/DiaryDateProvider';
import { defaultMealForNow, logQuickEntry, updateQuickEntry } from '../../../lib/foods';
import type { MealType } from '../../../types/domain';
import { colors } from '../../../theme';

const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];
const MEAL_LABELS: Record<MealType, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snack',
};

const toNumber = (text: string) => Number(text.replace(',', '.'));

// Log calories and macros directly, or edit such an entry (when entryId is set).
export default function QuickAdd() {
  const params = useLocalSearchParams<{
    entryId?: string;
    name?: string;
    kcal?: string;
    protein?: string;
    carbs?: string;
    fat?: string;
    meal?: MealType;
  }>();
  const entryId = params.entryId;
  const { session } = useSession();
  const { date } = useDiaryDate();
  const queryClient = useQueryClient();

  const [name, setName] = useState(params.name ?? '');
  const [kcal, setKcal] = useState(params.kcal ?? '');
  const [protein, setProtein] = useState(params.protein ?? '');
  const [carbs, setCarbs] = useState(params.carbs ?? '');
  const [fat, setFat] = useState(params.fat ?? '');
  const [mealType, setMealType] = useState<MealType>(params.meal ?? defaultMealForNow());
  const [isSaving, setIsSaving] = useState(false);

  const isValid = kcal.trim() !== '' && toNumber(kcal) >= 0 && !Number.isNaN(toNumber(kcal));

  async function handleSave() {
    if (!session || !isValid) return;
    setIsSaving(true);
    const values = {
      name: name.trim() || 'Quick add',
      mealType,
      caloriesKcal: toNumber(kcal),
      proteinG: toNumber(protein) || 0,
      carbsG: toNumber(carbs) || 0,
      fatG: toNumber(fat) || 0,
    };
    try {
      if (entryId) {
        await updateQuickEntry({ entryId, ...values });
      } else {
        await logQuickEntry({ userId: session.user.id, loggedDate: date, ...values });
      }
      await queryClient.invalidateQueries({ queryKey: ['foodDiary', session.user.id, date] });
      router.dismissTo('/(tabs)/food');
    } catch {
      Alert.alert('Could not save', 'Check your connection and try again.');
      setIsSaving(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.label}>Name (optional)</Text>
      <TextInput style={styles.input} placeholder="Quick add" value={name} onChangeText={setName} />

      <Text style={styles.label}>Calories (kcal)</Text>
      <TextInput
        style={styles.input}
        keyboardType="decimal-pad"
        value={kcal}
        onChangeText={setKcal}
        autoFocus={!entryId}
      />

      <View style={styles.macroRow}>
        <View style={styles.macro}>
          <Text style={styles.label}>Protein (g)</Text>
          <TextInput
            style={styles.input}
            keyboardType="decimal-pad"
            value={protein}
            onChangeText={setProtein}
          />
        </View>
        <View style={styles.macro}>
          <Text style={styles.label}>Carbs (g)</Text>
          <TextInput
            style={styles.input}
            keyboardType="decimal-pad"
            value={carbs}
            onChangeText={setCarbs}
          />
        </View>
        <View style={styles.macro}>
          <Text style={styles.label}>Fat (g)</Text>
          <TextInput
            style={styles.input}
            keyboardType="decimal-pad"
            value={fat}
            onChangeText={setFat}
          />
        </View>
      </View>

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

      <Pressable
        style={[styles.saveButton, !isValid && styles.saveButtonDisabled]}
        onPress={handleSave}
        disabled={!isValid || isSaving}
      >
        {isSaving ? (
          <ActivityIndicator color={colors.onPrimary} />
        ) : (
          <Text style={styles.saveButtonText}>{entryId ? 'Save changes' : 'Add to Diary'}</Text>
        )}
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16 },
  label: { fontSize: 14, fontWeight: '600', marginTop: 16, marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
  },
  macroRow: { flexDirection: 'row', gap: 8 },
  macro: { flex: 1 },
  mealRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
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
  saveButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginTop: 24,
  },
  saveButtonDisabled: { opacity: 0.5 },
  saveButtonText: { color: colors.onPrimary, fontSize: 16, fontWeight: '600' },
});
