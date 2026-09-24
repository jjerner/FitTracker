import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { ExerciseList } from '../../../../components/workouts/ExerciseList';
import { useSession } from '../../../../context/AuthProvider';
import { createCustomExercise } from '../../../../lib/workouts';
import type { ExerciseCategory } from '../../../../types/domain';

const CATEGORIES: ExerciseCategory[] = ['strength', 'cardio'];

export default function ExerciseCatalog() {
  const { session } = useSession();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [category, setCategory] = useState<ExerciseCategory>('strength');
  const [muscleGroup, setMuscleGroup] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    if (!session) return;
    if (!name.trim()) {
      setError('Enter a name.');
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      await createCustomExercise({
        userId: session.user.id,
        name: name.trim(),
        category,
        muscleGroup: muscleGroup.trim() || null,
      });
      await queryClient.invalidateQueries({ queryKey: ['exercises', session.user.id] });
      setName('');
      setMuscleGroup('');
      setShowForm(false);
    } catch {
      setError('Could not save. Try again.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <View style={styles.container}>
      {showForm ? (
        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Exercise name"
            value={name}
            onChangeText={setName}
          />
          <View style={styles.chipRow}>
            {CATEGORIES.map((c) => (
              <Pressable
                key={c}
                style={[styles.chip, category === c && styles.chipActive]}
                onPress={() => setCategory(c)}
              >
                <Text style={category === c ? styles.chipTextActive : styles.chipText}>
                  {c === 'strength' ? 'Strength' : 'Cardio'}
                </Text>
              </Pressable>
            ))}
          </View>
          <TextInput
            style={styles.input}
            placeholder="Muscle group (optional)"
            value={muscleGroup}
            onChangeText={setMuscleGroup}
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Pressable style={styles.saveButton} onPress={handleCreate} disabled={isSaving}>
            {isSaving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveButtonText}>Save Exercise</Text>
            )}
          </Pressable>
          <Pressable style={styles.cancelButton} onPress={() => setShowForm(false)}>
            <Text>Cancel</Text>
          </Pressable>
        </View>
      ) : (
        <Pressable style={styles.addButton} onPress={() => setShowForm(true)}>
          <Text style={styles.addButtonText}>+ Custom Exercise</Text>
        </Pressable>
      )}

      <ExerciseList onSelect={(e) => router.push(`/(tabs)/workouts/exercises/${e.id}`)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 16 },
  form: { marginBottom: 16, gap: 10 },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
  },
  chipRow: { flexDirection: 'row', gap: 8 },
  chip: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  chipActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  chipText: { color: '#333' },
  chipTextActive: { color: '#fff' },
  error: { color: '#dc2626' },
  saveButton: {
    backgroundColor: '#2563eb',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
  },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  cancelButton: { alignItems: 'center', padding: 8 },
  addButton: {
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  addButtonText: { fontSize: 15, fontWeight: '600' },
});
