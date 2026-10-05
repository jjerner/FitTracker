import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { ExerciseList } from '../../../../components/workouts/ExerciseList';
import { useSession } from '../../../../context/AuthProvider';
import { MOVEMENT_PATTERNS, createCustomExercise } from '../../../../lib/workouts';
import type { ExerciseCategory } from '../../../../types/domain';
import { colors } from '../../../../theme';

const CATEGORIES: ExerciseCategory[] = ['strength', 'cardio'];

export default function ExerciseCatalog() {
  const { session } = useSession();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [category, setCategory] = useState<ExerciseCategory>('strength');
  const [muscleGroup, setMuscleGroup] = useState('');
  const [movementPattern, setMovementPattern] = useState<string | null>(null);
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
        movementPattern: category === 'strength' ? movementPattern : 'cardio',
      });
      await queryClient.invalidateQueries({ queryKey: ['exercises', session.user.id] });
      setName('');
      setMuscleGroup('');
      setMovementPattern(null);
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
          {category === 'strength' ? (
            <>
              <Text style={styles.label}>Movement (optional, used for swap suggestions)</Text>
              <View style={[styles.chipRow, styles.chipWrap]}>
                {MOVEMENT_PATTERNS.map((p) => (
                  <Pressable
                    key={p.value}
                    style={[styles.smallChip, movementPattern === p.value && styles.chipActive]}
                    onPress={() =>
                      setMovementPattern((cur) => (cur === p.value ? null : p.value))
                    }
                  >
                    <Text
                      style={movementPattern === p.value ? styles.chipTextActive : styles.chipText}
                    >
                      {p.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </>
          ) : null}
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Pressable style={styles.saveButton} onPress={handleCreate} disabled={isSaving}>
            {isSaving ? (
              <ActivityIndicator color={colors.onPrimary} />
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
  container: { flex: 1, backgroundColor: colors.background, padding: 16 },
  form: { marginBottom: 16, gap: 10 },
  input: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
  },
  chipRow: { flexDirection: 'row', gap: 8 },
  chip: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  chipWrap: { flexWrap: 'wrap' },
  smallChip: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  label: { fontSize: 13, color: colors.textSecondary },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.textSecondary },
  chipTextActive: { color: colors.onPrimary },
  error: { color: colors.danger },
  saveButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
  },
  saveButtonText: { color: colors.onPrimary, fontSize: 16, fontWeight: '600' },
  cancelButton: { alignItems: 'center', padding: 8 },
  addButton: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  addButtonText: { fontSize: 15, fontWeight: '600' },
});
