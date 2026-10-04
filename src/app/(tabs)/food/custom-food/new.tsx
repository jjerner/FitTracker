import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
} from 'react-native';

import { LabeledInput } from '../../../../components/LabeledInput';
import { useSession } from '../../../../context/AuthProvider';
import { createCustomFood } from '../../../../lib/foods';

export default function NewCustomFood() {
  const { session } = useSession();
  const { barcode } = useLocalSearchParams<{ barcode?: string }>();
  const [name, setName] = useState('');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [fiber, setFiber] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const isValid = name.trim().length > 0 && calories !== '' && protein !== '' && carbs !== '' && fat !== '';

  async function handleSave() {
    if (!session || !isValid) return;
    setError(null);
    setIsSaving(true);
    try {
      const food = await createCustomFood({
        name: name.trim(),
        caloriesKcal: Number(calories),
        proteinG: Number(protein),
        carbsG: Number(carbs),
        fatG: Number(fat),
        fiberG: fiber !== '' ? Number(fiber) : null,
        userId: session.user.id,
        barcode,
      });
      router.replace(`/(tabs)/food/food/${food.id}`);
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
        <Text style={styles.hint}>
          {barcode ? `Barcode ${barcode} wasn't found. ` : ''}Enter nutrition per 100g.
        </Text>

        <LabeledInput label="Name" placeholder="e.g. Oat bar" value={name} onChangeText={setName} />
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

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable
          style={[styles.saveButton, !isValid && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={!isValid || isSaving}
        >
          {isSaving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>Save Food</Text>
          )}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#fff' },
  container: { padding: 16 },
  hint: { color: '#888', marginBottom: 16 },
  error: { color: '#dc2626', marginBottom: 12 },
  saveButton: {
    backgroundColor: '#2563eb',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  saveButtonDisabled: { opacity: 0.5 },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
