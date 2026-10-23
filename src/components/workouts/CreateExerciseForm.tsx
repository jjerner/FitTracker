import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '../AppText';
import { Button } from '../Button';
import { Card } from '../Card';
import { Chips } from '../Chips';
import { LabeledInput } from '../LabeledInput';
import { useSession } from '../../context/AuthProvider';
import { MOVEMENT_PATTERNS, createCustomExercise } from '../../lib/workouts';
import type { Exercise, ExerciseCategory } from '../../types/domain';
import { colors, radius, spacing } from '../../theme';

const CATEGORIES: ExerciseCategory[] = ['strength', 'cardio'];

export function CreateExerciseForm({
  onCreated,
  onCancel,
}: {
  onCreated: (exercise: Exercise) => void;
  onCancel: () => void;
}) {
  const { session } = useSession();
  const queryClient = useQueryClient();
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
      const exercise = await createCustomExercise({
        userId: session.user.id,
        name: name.trim(),
        category,
        muscleGroup: muscleGroup.trim() || null,
        movementPattern: category === 'strength' ? movementPattern : 'cardio',
      });
      await queryClient.invalidateQueries({ queryKey: ['exercises', session.user.id] });
      onCreated(exercise);
    } catch {
      setError('Could not save. Try again.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Card style={styles.form}>
      <LabeledInput
        label="Exercise name"
        placeholder="e.g. Bulgarian split squat"
        value={name}
        onChangeText={setName}
      />
      <Chips
        labels={['Strength', 'Cardio']}
        selected={CATEGORIES.indexOf(category)}
        onSelect={(i) => setCategory(CATEGORIES[i])}
        style={styles.chips}
      />
      <LabeledInput
        label="Muscle group (optional)"
        placeholder="e.g. Quads"
        value={muscleGroup}
        onChangeText={setMuscleGroup}
      />
      {category === 'strength' ? (
        <>
          <AppText variant="labelSmall">Movement (optional, used for swap suggestions)</AppText>
          <View style={styles.chipRow}>
            {MOVEMENT_PATTERNS.map((p) => (
              <Pressable
                key={p.value}
                style={[styles.smallChip, movementPattern === p.value && styles.chipActive]}
                onPress={() => setMovementPattern((cur) => (cur === p.value ? null : p.value))}
              >
                <AppText
                  variant="small"
                  style={movementPattern === p.value ? styles.chipTextActive : styles.chipText}
                >
                  {p.label}
                </AppText>
              </Pressable>
            ))}
          </View>
        </>
      ) : null}
      {error ? (
        <AppText style={styles.error} accessibilityRole="alert" accessibilityLiveRegion="polite">
          {error}
        </AppText>
      ) : null}
      <Button title="Save Exercise" onPress={handleCreate} loading={isSaving} />
      <Button variant="secondary" title="Cancel" onPress={onCancel} />
    </Card>
  );
}

const styles = StyleSheet.create({
  form: { gap: spacing.md, marginBottom: spacing.lg },
  chips: { marginBottom: 0 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  smallChip: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.full,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.textSecondary },
  chipTextActive: { color: colors.onPrimary },
  error: { color: colors.danger },
});
