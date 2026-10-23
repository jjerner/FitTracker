import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';

import { AppText } from '../../../../components/AppText';
import { Button } from '../../../../components/Button';
import { Card } from '../../../../components/Card';
import { LabeledInput } from '../../../../components/LabeledInput';
import { useSession } from '../../../../context/AuthProvider';
import { createCustomFood } from '../../../../lib/foods';
import { toNumberOrNull } from '../../../../lib/numbers';
import { colors, spacing } from '../../../../theme';

export default function NewCustomFood() {
  const { session } = useSession();
  const { barcode, meal, recipe } = useLocalSearchParams<{
    barcode?: string;
    meal?: string;
    recipe?: string;
  }>();
  const [name, setName] = useState('');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [fiber, setFiber] = useState('');
  const [servingSize, setServingSize] = useState('');
  const [servingName, setServingName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const caloriesNumber = toNumberOrNull(calories);
  const proteinNumber = toNumberOrNull(protein);
  const carbsNumber = toNumberOrNull(carbs);
  const fatNumber = toNumberOrNull(fat);
  const servingNumber = toNumberOrNull(servingSize) ?? 0;
  const isValid =
    name.trim().length > 0 &&
    caloriesNumber !== null &&
    proteinNumber !== null &&
    carbsNumber !== null &&
    fatNumber !== null;

  async function handleSave() {
    if (!session || !isValid) return;
    setError(null);
    setIsSaving(true);
    try {
      const food = await createCustomFood({
        name: name.trim(),
        caloriesKcal: caloriesNumber,
        proteinG: proteinNumber,
        carbsG: carbsNumber,
        fatG: fatNumber,
        fiberG: toNumberOrNull(fiber),
        servingSizeG: servingNumber > 0 ? servingNumber : null,
        servingDescription: servingNumber > 0 && servingName.trim() ? servingName.trim() : null,
        userId: session.user.id,
        barcode,
      });
      router.replace(
        `/(tabs)/food/food/${food.id}${recipe ? '?recipe=1' : meal ? `?meal=${meal}` : ''}`
      );
    } catch {
      setError('Could not save this food. Try again.');
      setIsSaving(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container}>
        {/* gap 0: LabeledInput brings its own bottom margin. */}
        <Card style={{ gap: 0 }}>
          <AppText variant="small" style={{ marginBottom: spacing.lg }}>
            {barcode ? `Barcode ${barcode} wasn't found. ` : ''}Enter nutrition per 100g.
          </AppText>

          <LabeledInput
            label="Name"
            placeholder="e.g. Oat bar"
            value={name}
            onChangeText={setName}
          />
          <LabeledInput
            label="Calories per 100 g (kcal)"
            placeholder="e.g. 380"
            keyboardType="numeric"
            value={calories}
            onChangeText={setCalories}
          />
          <LabeledInput
            label="Protein per 100 g (g)"
            placeholder="e.g. 12"
            keyboardType="numeric"
            value={protein}
            onChangeText={setProtein}
          />
          <LabeledInput
            label="Carbs per 100 g (g)"
            placeholder="e.g. 55"
            keyboardType="numeric"
            value={carbs}
            onChangeText={setCarbs}
          />
          <LabeledInput
            label="Fat per 100 g (g)"
            placeholder="e.g. 8"
            keyboardType="numeric"
            value={fat}
            onChangeText={setFat}
          />
          <LabeledInput
            label="Fiber per 100 g (g) — optional"
            placeholder="e.g. 6"
            keyboardType="numeric"
            value={fiber}
            onChangeText={setFiber}
          />
          <LabeledInput
            label="Serving size (g) — optional"
            placeholder="e.g. 45"
            keyboardType="numeric"
            value={servingSize}
            onChangeText={setServingSize}
          />
          <LabeledInput
            label="Serving name — optional"
            placeholder="e.g. 1 bar"
            value={servingName}
            onChangeText={setServingName}
          />

          {error ? (
            <AppText
              style={{ color: colors.danger }}
              accessibilityRole="alert"
              accessibilityLiveRegion="polite"
            >
              {error}
            </AppText>
          ) : null}
        </Card>

        <Button
          title="Save Food"
          onPress={handleSave}
          disabled={!isValid}
          loading={isSaving}
          style={{ marginTop: spacing.md }}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.surface },
  container: { padding: 16 },
});
