import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { AppText } from '../../../components/AppText';
import { Button } from '../../../components/Button';
import { Card } from '../../../components/Card';
import { Chips } from '../../../components/Chips';
import { LabeledInput } from '../../../components/LabeledInput';
import { Stepper } from '../../../components/SettingsList';
import { useBodyProfile } from '../../../hooks/useBodyProfile';
import { useNutritionGoals } from '../../../hooks/useNutritionGoals';
import { useBodyWeights } from '../../../hooks/useProgress';
import {
  ACTIVITY_LEVELS,
  FAT_PER_KG,
  MIN_KCAL,
  PACES,
  PROTEIN_PER_KG,
  ageFromBirthYear,
  macroDefaults,
  macrosFor,
  maintenanceKcal,
  targetKcal,
  type Sex,
} from '../../../lib/goalHelper';
import { toNumberOrNull } from '../../../lib/numbers';
import { weightTrend } from '../../../lib/progress';
import type { NutritionGoals } from '../../../types/domain';
import { colors, radius, spacing } from '../../../theme';

const DEFAULT_GOALS: NutritionGoals = {
  caloriesKcal: 2000,
  proteinG: 150,
  carbsG: 200,
  fatG: 65,
  fiberG: null,
};

type Macros = { proteinG: number; carbsG: number; fatG: number };

export default function NutritionGoalsScreen() {
  const { data: goals, isLoading, saveGoals } = useNutritionGoals();
  const weights = useBodyWeights();
  // Loaded here so the helper can prefill its fields when it mounts.
  const body = useBodyProfile();

  if (isLoading || weights.isLoading || body.isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <GoalsForm
      initialGoals={goals ?? DEFAULT_GOALS}
      weightKg={weightTrend(weights.data ?? []).at(-1)}
      onSave={(next, options) => saveGoals(next, options)}
    />
  );
}

function GoalsForm({
  initialGoals,
  weightKg,
  onSave,
}: {
  initialGoals: NutritionGoals;
  // Newest 7-day trend weight, undefined without weigh-ins.
  weightKg: number | undefined;
  onSave: (goals: NutritionGoals, options: { onSuccess: () => void; onSettled: () => void }) => void;
}) {
  const [protein, setProtein] = useState(String(initialGoals.proteinG));
  const [carbs, setCarbs] = useState(String(initialGoals.carbsG));
  const [fat, setFat] = useState(String(initialGoals.fatG));
  const [isSaving, setIsSaving] = useState(false);
  const [helperOpen, setHelperOpen] = useState(false);
  const [filled, setFilled] = useState(false);

  const proteinNumber = toNumberOrNull(protein);
  const carbsNumber = toNumberOrNull(carbs);
  const fatNumber = toNumberOrNull(fat);
  const isValid = proteinNumber !== null && carbsNumber !== null && fatNumber !== null;
  // Calories follow from the macros: 4 kcal/g protein and carbs, 9 kcal/g fat.
  const calories = Math.round(
    (proteinNumber ?? 0) * 4 + (carbsNumber ?? 0) * 4 + (fatNumber ?? 0) * 9
  );

  // "30 % of kcal · 1.8 g/kg" under each macro box.
  function macroDetail(grams: number | null, kcalPerGram: number) {
    if (grams === null) return null;
    const parts: string[] = [];
    if (calories > 0) parts.push(`${Math.round(((grams * kcalPerGram) / calories) * 100)} % of kcal`);
    if (weightKg) parts.push(`${(grams / weightKg).toFixed(1)} g/kg`);
    return parts.length ? (
      <AppText variant="small" style={styles.hint}>{parts.join(' · ')}</AppText>
    ) : null;
  }

  function fill(macros: Macros) {
    setProtein(String(macros.proteinG));
    setCarbs(String(macros.carbsG));
    setFat(String(macros.fatG));
  }

  function handleApply(macros: Macros) {
    fill(macros);
    setHelperOpen(false);
    setFilled(true);
  }

  function handleSave() {
    if (!isValid) return;
    setIsSaving(true);
    onSave(
      {
        caloriesKcal: calories,
        proteinG: proteinNumber,
        carbsG: carbsNumber,
        fatG: fatNumber,
        fiberG: null,
      },
      {
        onSuccess: () => router.back(),
        onSettled: () => setIsSaving(false),
      }
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.helper}>
        <Pressable
          style={styles.helperToggle}
          onPress={() => setHelperOpen((open) => !open)}
          accessibilityRole="button"
          accessibilityState={{ expanded: helperOpen }}
        >
          <AppText variant="label" style={{ flex: 1 }}>Suggest goals for me</AppText>
          {/* web key needed: without it SymbolView renders nothing on web */}
          <SymbolView
            name={
              helperOpen
                ? { ios: 'chevron.up', android: 'expand_less', web: 'expand_less' }
                : { ios: 'chevron.down', android: 'expand_more', web: 'expand_more' }
            }
            tintColor={colors.primary}
            size={22}
          />
        </Pressable>
        {/* Hidden, not unmounted, so the helper's choices survive closing it. */}
        <View style={!helperOpen && styles.hidden}>
          {/* Keyed on weight so a weigh-in logged while this screen stays open refills it. */}
          <GoalHelper key={weightKg} weightKg={weightKg} onApply={handleApply} />
        </View>
      </View>

      <Card style={styles.fields}>
        <AppText variant="labelSmall" style={styles.label}>Protein (g)</AppText>
        <TextInput
          style={styles.input}
          keyboardType="numeric"
          value={protein}
          onChangeText={setProtein}
          accessibilityLabel="Protein (g)"
        />
        {macroDetail(proteinNumber, 4)}

        <AppText variant="labelSmall" style={styles.label}>Carbs (g)</AppText>
        <TextInput
          style={styles.input}
          keyboardType="numeric"
          value={carbs}
          onChangeText={setCarbs}
          accessibilityLabel="Carbs (g)"
        />
        {macroDetail(carbsNumber, 4)}

        <AppText variant="labelSmall" style={styles.label}>Fat (g)</AppText>
        <TextInput
          style={styles.input}
          keyboardType="numeric"
          value={fat}
          onChangeText={setFat}
          accessibilityLabel="Fat (g)"
        />
        {macroDetail(fatNumber, 9)}
        {filled ? (
          <AppText variant="small" style={styles.hint}>
            Filled in from the helper. Check the numbers, then tap Save Goals.
          </AppText>
        ) : null}

        <AppText variant="labelSmall" style={styles.label}>Daily Calories</AppText>
        <AppText variant="title">{calories} kcal</AppText>
        <AppText variant="small" style={styles.hint}>
          Calculated: protein × 4 + carbs × 4 + fat × 9
        </AppText>

        <Button
          title="Save Goals"
          onPress={handleSave}
          disabled={!isValid}
          loading={isSaving}
          style={styles.saveButton}
        />
      </Card>
    </ScrollView>
  );
}

const SEXES: Sex[] = ['male', 'female'];

// Hint for a number field: null when it is filled in and inside min–max.
function rangeHint(value: number | null, min: number, max: number, empty: string, outside: string) {
  if (value === null) return empty;
  return value >= min && value <= max ? null : outside;
}

function GoalHelper({
  weightKg: trendWeightKg,
  onApply,
}: {
  weightKg: number | undefined;
  onApply: (macros: Macros) => void;
}) {
  // The screen waits for this query, so the saved body facts are here on mount.
  const { data: body, saveBody } = useBodyProfile();
  const [sexIndex, setSexIndex] = useState<number | null>(body?.sex ? SEXES.indexOf(body.sex) : null);
  const [birthYear, setBirthYear] = useState(body?.birthYear ? String(body.birthYear) : '');
  const [height, setHeight] = useState(body?.heightCm ? String(body.heightCm) : '');
  const [weight, setWeight] = useState(trendWeightKg ? String(Math.round(trendWeightKg * 10) / 10) : '');
  const [activityIndex, setActivityIndex] = useState<number | null>(null);
  const [paceIndex, setPaceIndex] = useState<number | null>(null);
  const [perKg, setPerKg] = useState(macroDefaults(0));

  const sex = sexIndex === null ? null : SEXES[sexIndex];
  const yearNumber = toNumberOrNull(birthYear);
  const heightCm = toNumberOrNull(height);
  const weightKg = toNumberOrNull(weight);
  const [now] = useState(Date.now);
  const ageYears = yearNumber === null ? null : ageFromBirthYear(yearNumber, now);

  // First thing still missing or implausible; Fill stays off until this is null.
  const missing =
    (sex === null && 'Pick your sex.') ||
    rangeHint(ageYears, 15, 100, 'Enter your birth year.', 'Birth year should make you 15–100 years old.') ||
    rangeHint(heightCm, 100, 250, 'Enter your height.', 'Height should be 100–250 cm.') ||
    rangeHint(weightKg, 30, 300, 'Enter your weight.', 'Weight should be 30–300 kg.') ||
    (activityIndex === null && 'Pick an activity level.') ||
    (paceIndex === null && 'Pick a goal.') ||
    null;

  const target =
    !missing && sex && ageYears !== null && heightCm && weightKg && activityIndex !== null && paceIndex !== null
      ? targetKcal({
          maintenanceKcal: maintenanceKcal({
            sex,
            ageYears,
            heightCm,
            weightKg,
            activityFactor: ACTIVITY_LEVELS[activityIndex].factor,
          }),
          kgPerWeek: PACES[paceIndex].kgPerWeek,
          sex,
        })
      : null;

  function handlePace(index: number) {
    setPaceIndex(index);
    setPerKg(macroDefaults(PACES[index].kgPerWeek));
  }

  // One g/kg stepper tap, kept inside its range and to one decimal.
  const step = (key: keyof typeof perKg, range: typeof PROTEIN_PER_KG, sign: 1 | -1) => () =>
    setPerKg((p) => ({
      ...p,
      [key]: Math.min(range.max, Math.max(range.min, Math.round((p[key] + sign * range.step) * 10) / 10)),
    }));

  function handleFill() {
    if (!target || !sex || !heightCm || !weightKg || !yearNumber) return;
    saveBody({ sex, heightCm, birthYear: yearNumber });
    onApply(macrosFor({ kcal: target.kcal, weightKg, ...perKg }));
  }

  return (
    <View style={styles.helperBody}>
      <AppText variant="labelSmall" style={styles.helperLabel}>Sex (for the formula)</AppText>
      <Chips labels={['Male', 'Female']} selected={sexIndex} onSelect={setSexIndex} />

      <LabeledInput
        label="Birth year"
        keyboardType="numeric"
        placeholder="e.g. 1990"
        maxLength={4}
        value={birthYear}
        onChangeText={setBirthYear}
      />
      <LabeledInput label="Height (cm)" keyboardType="numeric" value={height} onChangeText={setHeight} />
      <LabeledInput label="Weight (kg)" keyboardType="numeric" value={weight} onChangeText={setWeight} />
      {trendWeightKg === undefined ? (
        <AppText variant="small" style={styles.weightHint}>
          Log a weigh-in on Progress to fill this in automatically.
        </AppText>
      ) : null}

      <AppText variant="labelSmall" style={styles.helperLabel}>Activity</AppText>
      <Chips labels={ACTIVITY_LEVELS.map((a) => a.label)} selected={activityIndex} onSelect={setActivityIndex} />

      <AppText variant="labelSmall" style={styles.helperLabel}>Goal</AppText>
      <Chips labels={PACES.map((p) => p.label)} selected={paceIndex} onSelect={handlePace} />

      <View style={styles.stepRow}>
        <AppText variant="labelSmall" style={styles.stepLabel}>Protein (g per kg)</AppText>
        <Stepper
          value={perKg.proteinPerKg.toFixed(1)}
          decreaseLabel="Less protein"
          increaseLabel="More protein"
          onDecrease={step('proteinPerKg', PROTEIN_PER_KG, -1)}
          onIncrease={step('proteinPerKg', PROTEIN_PER_KG, 1)}
        />
      </View>
      <View style={styles.stepRow}>
        <AppText variant="labelSmall" style={styles.stepLabel}>Fat (g per kg)</AppText>
        <Stepper
          value={perKg.fatPerKg.toFixed(1)}
          decreaseLabel="Less fat"
          increaseLabel="More fat"
          onDecrease={step('fatPerKg', FAT_PER_KG, -1)}
          onIncrease={step('fatPerKg', FAT_PER_KG, 1)}
        />
      </View>

      {target?.clamped && sex ? (
        <AppText variant="small" style={styles.clampNote}>
          Raised to the {MIN_KCAL[sex]} kcal minimum. A slower pace is easier to keep.
        </AppText>
      ) : null}

      <Button
        variant="secondary"
        title="Fill in suggestion"
        onPress={handleFill}
        disabled={!target}
        accessibilityHint={missing ?? undefined}
        style={styles.fillButton}
      />
      {missing ? <AppText variant="small" style={styles.helperHint}>{missing}</AppText> : null}
      <AppText variant="small" style={styles.helperHint}>Estimate only, not medical advice.</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  content: { padding: spacing.lg, gap: spacing.lg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  fields: { gap: 0, paddingTop: spacing.xs },
  label: { marginTop: spacing.md, marginBottom: spacing.sm },
  input: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    padding: 14,
    fontSize: 16,
    color: colors.text,
  },
  hint: { marginTop: spacing.xs },
  helperHint: { marginTop: spacing.xs, color: colors.textSecondary },
  saveButton: { marginTop: spacing.xl },
  helper: { backgroundColor: colors.background, borderRadius: radius.lg, overflow: 'hidden' },
  helperToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 56,
    paddingHorizontal: spacing.lg,
  },
  helperBody: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg },
  helperLabel: { marginBottom: spacing.xs },
  hidden: { display: 'none' },
  // Pulled up under the Weight box it explains (LabeledInput adds space below itself).
  weightHint: { color: colors.textSecondary, marginTop: -spacing.sm, marginBottom: spacing.md },
  fillButton: { marginTop: spacing.md },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 48 },
  stepLabel: { flex: 1 },
  clampNote: { color: colors.warningText, marginTop: spacing.sm },
});
