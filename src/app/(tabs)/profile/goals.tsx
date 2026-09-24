import { router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useNutritionGoals } from '../../../hooks/useNutritionGoals';
import type { NutritionGoals } from '../../../types/domain';

const DEFAULT_GOALS: NutritionGoals = {
  caloriesKcal: 2000,
  proteinG: 150,
  carbsG: 200,
  fatG: 65,
  fiberG: null,
};

export default function NutritionGoalsScreen() {
  const { data: goals, isLoading, saveGoals } = useNutritionGoals();

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <GoalsForm
      initialGoals={goals ?? DEFAULT_GOALS}
      onSave={(next, options) => saveGoals(next, options)}
    />
  );
}

function GoalsForm({
  initialGoals,
  onSave,
}: {
  initialGoals: NutritionGoals;
  onSave: (goals: NutritionGoals, options: { onSuccess: () => void; onSettled: () => void }) => void;
}) {
  const [calories, setCalories] = useState(String(initialGoals.caloriesKcal));
  const [protein, setProtein] = useState(String(initialGoals.proteinG));
  const [carbs, setCarbs] = useState(String(initialGoals.carbsG));
  const [fat, setFat] = useState(String(initialGoals.fatG));
  const [isSaving, setIsSaving] = useState(false);

  const isValid = calories !== '' && protein !== '' && carbs !== '' && fat !== '';

  function handleSave() {
    if (!isValid) return;
    setIsSaving(true);
    onSave(
      {
        caloriesKcal: Number(calories),
        proteinG: Number(protein),
        carbsG: Number(carbs),
        fatG: Number(fat),
        fiberG: null,
      },
      {
        onSuccess: () => router.back(),
        onSettled: () => setIsSaving(false),
      }
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Daily Calories (kcal)</Text>
      <TextInput
        style={styles.input}
        keyboardType="numeric"
        value={calories}
        onChangeText={setCalories}
      />

      <Text style={styles.label}>Protein (g)</Text>
      <TextInput
        style={styles.input}
        keyboardType="numeric"
        value={protein}
        onChangeText={setProtein}
      />

      <Text style={styles.label}>Carbs (g)</Text>
      <TextInput style={styles.input} keyboardType="numeric" value={carbs} onChangeText={setCarbs} />

      <Text style={styles.label}>Fat (g)</Text>
      <TextInput style={styles.input} keyboardType="numeric" value={fat} onChangeText={setFat} />

      <Pressable
        style={[styles.saveButton, !isValid && styles.saveButtonDisabled]}
        onPress={handleSave}
        disabled={!isValid || isSaving}
      >
        {isSaving ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.saveButtonText}>Save Goals</Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 16 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 14, fontWeight: '600', marginTop: 12, marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
  },
  saveButton: {
    backgroundColor: '#2563eb',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginTop: 24,
  },
  saveButtonDisabled: { opacity: 0.5 },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
