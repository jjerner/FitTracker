import { useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { useSession } from '../../../context/AuthProvider';
import { useDiaryDate } from '../../../context/DiaryDateProvider';
import { defaultMealForNow, logQuickEntry, updateQuickEntry } from '../../../lib/foods';
import { AppText } from '../../../components/AppText';
import { Button } from '../../../components/Button';
import { Card } from '../../../components/Card';
import type { MealType } from '../../../types/domain';
import { colors, radius, spacing } from '../../../theme';

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
      <Card>
        <AppText variant="labelSmall">Name (optional)</AppText>
        <TextInput
          style={styles.input}
          placeholder="Quick add"
          value={name}
          onChangeText={setName}
        />

        <AppText variant="labelSmall" style={styles.label}>
          Calories (kcal)
        </AppText>
        <TextInput
          style={styles.input}
          keyboardType="decimal-pad"
          value={kcal}
          onChangeText={setKcal}
          autoFocus={!entryId}
        />

        <View style={styles.macroRow}>
          <View style={styles.macro}>
            <AppText variant="labelSmall">Protein (g)</AppText>
            <TextInput
              style={styles.input}
              keyboardType="decimal-pad"
              value={protein}
              onChangeText={setProtein}
            />
          </View>
          <View style={styles.macro}>
            <AppText variant="labelSmall">Carbs (g)</AppText>
            <TextInput
              style={styles.input}
              keyboardType="decimal-pad"
              value={carbs}
              onChangeText={setCarbs}
            />
          </View>
          <View style={styles.macro}>
            <AppText variant="labelSmall">Fat (g)</AppText>
            <TextInput
              style={styles.input}
              keyboardType="decimal-pad"
              value={fat}
              onChangeText={setFat}
            />
          </View>
        </View>

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
      </Card>

      <Button
        title={entryId ? 'Save changes' : 'Add to Diary'}
        onPress={handleSave}
        disabled={!isValid}
        loading={isSaving}
        style={{ marginTop: spacing.xl }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  content: { padding: 16 },
  label: { marginTop: 8 },
  input: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
  },
  macroRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  macro: { flex: 1, gap: 8 },
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
});
