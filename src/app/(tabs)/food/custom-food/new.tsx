import { router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
} from 'react-native';

import { useSession } from '../../../../context/AuthProvider';
import { createCustomFood } from '../../../../lib/foods';

export default function NewCustomFood() {
  const { session } = useSession();
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
        <Text style={styles.hint}>Enter nutrition per 100g.</Text>

        <TextInput style={styles.input} placeholder="Name" value={name} onChangeText={setName} />
        <TextInput
          style={styles.input}
          placeholder="Calories (kcal)"
          keyboardType="numeric"
          value={calories}
          onChangeText={setCalories}
        />
        <TextInput
          style={styles.input}
          placeholder="Protein (g)"
          keyboardType="numeric"
          value={protein}
          onChangeText={setProtein}
        />
        <TextInput
          style={styles.input}
          placeholder="Carbs (g)"
          keyboardType="numeric"
          value={carbs}
          onChangeText={setCarbs}
        />
        <TextInput
          style={styles.input}
          placeholder="Fat (g)"
          keyboardType="numeric"
          value={fat}
          onChangeText={setFat}
        />
        <TextInput
          style={styles.input}
          placeholder="Fiber (g) — optional"
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
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
    marginBottom: 12,
  },
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
