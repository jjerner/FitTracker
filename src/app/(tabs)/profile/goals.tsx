import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
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
    return parts.length ? <Text style={styles.hint}>{parts.join(' · ')}</Text> : null;
  }

  function handleApply(macros: Macros) {
    setProtein(String(macros.proteinG));
    setCarbs(String(macros.carbsG));
    setFat(String(macros.fatG));
    setHelperOpen(false);
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
          <Text style={styles.helperTitle}>Suggest goals for me</Text>
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
        {helperOpen ? <GoalHelper weightKg={weightKg} onApply={handleApply} /> : null}
      </View>

      <Text style={styles.label}>Protein (g)</Text>
      <TextInput
        style={styles.input}
        keyboardType="numeric"
        value={protein}
        onChangeText={setProtein}
      />
      {macroDetail(proteinNumber, 4)}

      <Text style={styles.label}>Carbs (g)</Text>
      <TextInput style={styles.input} keyboardType="numeric" value={carbs} onChangeText={setCarbs} />
      {macroDetail(carbsNumber, 4)}

      <Text style={styles.label}>Fat (g)</Text>
      <TextInput style={styles.input} keyboardType="numeric" value={fat} onChangeText={setFat} />
      {macroDetail(fatNumber, 9)}

      <Text style={styles.label}>Daily Calories</Text>
      <Text style={styles.calories}>{calories} kcal</Text>
      <Text style={styles.hint}>Calculated: protein × 4 + carbs × 4 + fat × 9</Text>

      <Pressable
        style={[styles.saveButton, !isValid && styles.saveButtonDisabled]}
        onPress={handleSave}
        disabled={!isValid || isSaving}
      >
        {isSaving ? (
          <ActivityIndicator color={colors.onPrimary} />
        ) : (
          <Text style={styles.saveButtonText}>Save Goals</Text>
        )}
      </Pressable>
    </ScrollView>
  );
}

const SEXES: Sex[] = ['male', 'female'];

// One step of a g/kg stepper, kept inside its range and to one decimal.
function stepped(value: number, delta: number, range: { min: number; max: number }) {
  return Math.min(range.max, Math.max(range.min, Math.round((value + delta) * 10) / 10));
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
  const currentYear = new Date(now).getFullYear();
  const validYear =
    yearNumber !== null && Number.isInteger(yearNumber) && yearNumber > 1900 && yearNumber < currentYear;

  const target =
    sex && validYear && heightCm && heightCm > 0 && weightKg && weightKg > 0 && activityIndex !== null && paceIndex !== null
      ? targetKcal({
          maintenanceKcal: maintenanceKcal({
            sex,
            // Birth year is saved as 1 July, so count from mid-year.
            ageYears: (now - Date.parse(`${yearNumber}-07-01`)) / (365.25 * 86_400_000),
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

  function handleFill() {
    if (!target || !sex || !heightCm || !weightKg || !yearNumber) return;
    saveBody(
      { sex, heightCm, birthYear: yearNumber },
      {
        onError: () =>
          Alert.alert('Could not remember your details', 'The suggestion is still filled in.'),
      }
    );
    onApply(macrosFor({ kcal: target.kcal, weightKg, ...perKg }));
  }

  return (
    <View style={styles.helperBody}>
      <Text style={styles.helperLabel}>Sex (for the formula)</Text>
      <Chips labels={['Male', 'Female']} selected={sexIndex} onSelect={setSexIndex} />

      <LabeledInput label="Birth year" keyboardType="numeric" value={birthYear} onChangeText={setBirthYear} />
      <LabeledInput label="Height (cm)" keyboardType="numeric" value={height} onChangeText={setHeight} />
      <LabeledInput label="Weight (kg)" keyboardType="numeric" value={weight} onChangeText={setWeight} />

      <Text style={styles.helperLabel}>Activity</Text>
      <Chips labels={ACTIVITY_LEVELS.map((a) => a.label)} selected={activityIndex} onSelect={setActivityIndex} />

      <Text style={styles.helperLabel}>Goal</Text>
      <Chips labels={PACES.map((p) => p.label)} selected={paceIndex} onSelect={handlePace} />

      <View style={styles.stepRow}>
        <Text style={styles.stepLabel}>Protein (g per kg)</Text>
        <Stepper
          value={perKg.proteinPerKg.toFixed(1)}
          decreaseLabel="Less protein"
          increaseLabel="More protein"
          onDecrease={() => setPerKg((p) => ({ ...p, proteinPerKg: stepped(p.proteinPerKg, -PROTEIN_PER_KG.step, PROTEIN_PER_KG) }))}
          onIncrease={() => setPerKg((p) => ({ ...p, proteinPerKg: stepped(p.proteinPerKg, PROTEIN_PER_KG.step, PROTEIN_PER_KG) }))}
        />
      </View>
      <View style={styles.stepRow}>
        <Text style={styles.stepLabel}>Fat (g per kg)</Text>
        <Stepper
          value={perKg.fatPerKg.toFixed(1)}
          decreaseLabel="Less fat"
          increaseLabel="More fat"
          onDecrease={() => setPerKg((p) => ({ ...p, fatPerKg: stepped(p.fatPerKg, -FAT_PER_KG.step, FAT_PER_KG) }))}
          onIncrease={() => setPerKg((p) => ({ ...p, fatPerKg: stepped(p.fatPerKg, FAT_PER_KG.step, FAT_PER_KG) }))}
        />
      </View>

      {target?.clamped && sex ? (
        <Text style={styles.clampNote}>
          Raised to the {MIN_KCAL[sex]} kcal minimum. A slower pace is easier to keep.
        </Text>
      ) : null}

      <Pressable
        style={[styles.saveButton, !target && styles.saveButtonDisabled]}
        onPress={handleFill}
        disabled={!target}
        accessibilityRole="button"
        accessibilityState={{ disabled: !target }}
      >
        <Text style={styles.saveButtonText}>Fill in suggestion</Text>
      </Pressable>
      <Text style={styles.hint}>Estimate only, not medical advice.</Text>
    </View>
  );
}

function Chips({
  labels,
  selected,
  onSelect,
}: {
  labels: readonly string[];
  selected: number | null;
  onSelect: (index: number) => void;
}) {
  return (
    <View style={styles.chipRow}>
      {labels.map((label, i) => (
        <Pressable
          key={label}
          style={[styles.chip, selected === i && styles.chipActive]}
          onPress={() => onSelect(i)}
          accessibilityRole="button"
          accessibilityState={{ selected: selected === i }}
        >
          <Text style={selected === i ? styles.chipTextActive : styles.chipText}>{label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 14, fontWeight: '600', marginTop: 12, marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
  },
  calories: { fontSize: 20, fontWeight: '700' },
  hint: { fontSize: 13, color: colors.muted, marginTop: 4 },
  saveButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginTop: 24,
  },
  saveButtonDisabled: { opacity: 0.5 },
  saveButtonText: { color: colors.onPrimary, fontSize: 16, fontWeight: '600' },
  helper: { backgroundColor: colors.surface, borderRadius: radius.lg, overflow: 'hidden' },
  helperToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 56,
    paddingHorizontal: spacing.lg,
  },
  helperTitle: { flex: 1, fontSize: 16, fontWeight: '600', color: colors.text },
  helperBody: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg },
  helperLabel: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: spacing.xs },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: spacing.md },
  chip: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.textSecondary },
  chipTextActive: { color: colors.onPrimary },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 48 },
  stepLabel: { flex: 1, fontSize: 14, fontWeight: '600', color: colors.text },
  clampNote: { fontSize: 13, color: colors.warningText, marginTop: spacing.sm },
});
