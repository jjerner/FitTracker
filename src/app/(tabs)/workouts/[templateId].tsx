import { useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
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

import { RestTimeInput } from '../../../components/RestTimeInput';
import { ExercisePicker } from '../../../components/workouts/ExercisePicker';
import { useSession } from '../../../context/AuthProvider';
import { useDefaultRest } from '../../../hooks/useDefaultRest';
import { useWorkoutTemplate } from '../../../hooks/useWorkouts';
import { toNumberOrNull } from '../../../lib/numbers';
import { formatRest } from '../../../lib/restTime';
import { deleteTemplate, saveTemplate, setTemplateArchived } from '../../../lib/workouts';
import type { WorkoutTemplate, WorkoutTemplateExercise } from '../../../types/domain';
import { colors } from '../../../theme';

export default function TemplateScreen() {
  const { templateId } = useLocalSearchParams<{ templateId: string }>();
  const id = templateId === 'new' ? null : (templateId ?? null);
  const { data: template, isLoading } = useWorkoutTemplate(id);

  if (id && (isLoading || !template)) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  // Keyed so the form's initial state resets if a different template loads.
  return <TemplateForm key={id ?? 'new'} template={template ?? null} />;
}

// Text inputs hold strings; converted to numbers on save.
type DraftExercise = {
  // Stable list key, so inputs that keep their own state stay with their exercise when moved or removed.
  key: number;
  exercise: WorkoutTemplateExercise['exercise'];
  sets: string;
  reps: string;
  weight: string;
  // Targets are optional; the inputs stay hidden until asked for.
  showTargets: boolean;
  // Own rest time for this exercise; null = the default from Profile.
  restSeconds: number | null;
};

let nextDraftKey = 0;

function TemplateForm({ template }: { template: WorkoutTemplate | null }) {
  const { session } = useSession();
  const queryClient = useQueryClient();
  const defaultRest = useDefaultRest();
  const [name, setName] = useState(template?.name ?? '');
  const [exercises, setExercises] = useState<DraftExercise[]>(
    (template?.exercises ?? []).map((te) => ({
      key: nextDraftKey++,
      exercise: te.exercise,
      sets: te.targetSets?.toString() ?? '',
      reps: te.targetReps?.toString() ?? '',
      weight: te.targetWeightKg?.toString() ?? '',
      showTargets: te.targetSets != null || te.targetReps != null || te.targetWeightKg != null,
      restSeconds: te.restSeconds,
    }))
  );
  const [pickerOpen, setPickerOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateExercise(index: number, patch: Partial<DraftExercise>) {
    setExercises((prev) => prev.map((e, i) => (i === index ? { ...e, ...patch } : e)));
  }

  function moveExercise(index: number, direction: -1 | 1) {
    setExercises((prev) => {
      const next = [...prev];
      [next[index], next[index + direction]] = [next[index + direction], next[index]];
      return next;
    });
  }

  function draftToTemplateExercises(): WorkoutTemplateExercise[] {
    return exercises.map((e) => ({
      exercise: e.exercise,
      targetSets: toNumberOrNull(e.sets),
      targetReps: toNumberOrNull(e.reps),
      targetWeightKg: toNumberOrNull(e.weight),
      restSeconds: e.exercise.category === 'strength' ? e.restSeconds : null,
    }));
  }

  async function invalidate() {
    await queryClient.invalidateQueries({ queryKey: ['workoutTemplates', session?.user.id] });
    if (template) {
      await queryClient.invalidateQueries({ queryKey: ['workoutTemplate', template.id] });
    }
  }

  async function handleSave() {
    if (!session) return;
    if (!name.trim()) {
      setError('Give the routine a name.');
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      await saveTemplate({
        id: template?.id ?? null,
        userId: session.user.id,
        name: name.trim(),
        exercises: draftToTemplateExercises(),
      });
      await invalidate();
      router.back();
    } catch {
      setError('Could not save. Try again.');
    } finally {
      setIsSaving(false);
    }
  }

  // Copies what's currently in the form, including unsaved edits.
  async function handleDuplicate() {
    if (!session) return;
    setIsSaving(true);
    setError(null);
    try {
      const newId = await saveTemplate({
        id: null,
        userId: session.user.id,
        name: `${name.trim() || 'Routine'} (copy)`,
        exercises: draftToTemplateExercises(),
      });
      await invalidate();
      router.replace(`/(tabs)/workouts/${newId}`);
    } catch {
      setError('Could not duplicate. Try again.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleToggleArchived() {
    if (!template) return;
    setIsSaving(true);
    setError(null);
    try {
      await setTemplateArchived(template.id, !template.isArchived);
      await invalidate();
      router.back();
    } catch {
      setError('Could not update. Try again.');
    } finally {
      setIsSaving(false);
    }
  }

  function handleDelete() {
    if (!template) return;
    Alert.alert('Delete routine?', template.name, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteTemplate(template.id);
          } catch {
            Alert.alert('Could not delete', 'Check your connection and try again.');
            return;
          }
          await invalidate();
          router.back();
        },
      },
    ]);
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.label}>Name</Text>
      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
        placeholder="e.g. Push Day"
      />

      <Text style={styles.label}>Exercises</Text>
      {exercises.length === 0 ? <Text style={styles.emptyText}>No exercises yet</Text> : null}
      {exercises.map((e, index) => (
        <View key={e.key} style={styles.exerciseCard}>
          <View style={styles.exerciseHeader}>
            <Text style={styles.exerciseName}>{e.exercise.name}</Text>
            <Pressable
              style={styles.moveButton}
              onPress={() => moveExercise(index, -1)}
              disabled={index === 0}
            >
              <Text style={index === 0 ? styles.moveTextDisabled : styles.moveText}>↑</Text>
            </Pressable>
            <Pressable
              style={styles.moveButton}
              onPress={() => moveExercise(index, 1)}
              disabled={index === exercises.length - 1}
            >
              <Text
                style={index === exercises.length - 1 ? styles.moveTextDisabled : styles.moveText}
              >
                ↓
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setExercises((prev) => prev.filter((_, i) => i !== index))}
              hitSlop={8}
            >
              <Text style={styles.removeText}>Remove</Text>
            </Pressable>
          </View>
          {e.exercise.category === 'strength' ? (
            <>
              {!e.showTargets ? (
                <Pressable
                  style={styles.linkButton}
                  onPress={() => updateExercise(index, { showTargets: true })}
                  hitSlop={12}
                  accessibilityRole="button"
                >
                  <Text style={styles.addTargetsText}>+ Targets</Text>
                </Pressable>
              ) : null}
              {e.showTargets ? (
                <View style={styles.targetsRow}>
                  <TargetInput label="Sets" value={e.sets} onChange={(v) => updateExercise(index, { sets: v })} />
                  <TargetInput label="Reps" value={e.reps} onChange={(v) => updateExercise(index, { reps: v })} />
                  <TargetInput label="kg" value={e.weight} onChange={(v) => updateExercise(index, { weight: v })} />
                </View>
              ) : null}
              {e.restSeconds == null ? (
                <View style={styles.defaultRestRow}>
                  <Text style={styles.defaultRestText}>
                    Uses your default rest ({formatRest(defaultRest.seconds)})
                  </Text>
                  <Pressable
                    onPress={() => updateExercise(index, { restSeconds: defaultRest.seconds })}
                    hitSlop={12}
                    accessibilityRole="button"
                  >
                    <Text style={styles.addTargetsText}>+ Rest time</Text>
                  </Pressable>
                </View>
              ) : (
                <View style={styles.restRow}>
                  <Text style={styles.restLabel}>Rest</Text>
                  <RestTimeInput
                    initialSeconds={e.restSeconds}
                    min={5}
                    label={`${e.exercise.name} rest`}
                    onChange={(v) => updateExercise(index, { restSeconds: v })}
                  />
                  <Pressable
                    onPress={() => updateExercise(index, { restSeconds: null })}
                    hitSlop={12}
                    accessibilityRole="button"
                    accessibilityLabel="Use default rest"
                  >
                    <Text style={styles.useDefaultText}>✕ Use default</Text>
                  </Pressable>
                </View>
              )}
            </>
          ) : null}
        </View>
      ))}

      <Pressable style={styles.secondaryButton} onPress={() => setPickerOpen(true)}>
        <Text style={styles.secondaryButtonText}>+ Add Exercise</Text>
      </Pressable>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable style={styles.saveButton} onPress={handleSave} disabled={isSaving}>
        {isSaving ? (
          <ActivityIndicator color={colors.onPrimary} />
        ) : (
          <Text style={styles.saveButtonText}>Save Routine</Text>
        )}
      </Pressable>

      {template ? (
        <>
          <Pressable style={styles.secondaryButton} onPress={handleDuplicate} disabled={isSaving}>
            <Text style={styles.secondaryButtonText}>Duplicate</Text>
          </Pressable>
          <Pressable
            style={styles.secondaryButton}
            onPress={handleToggleArchived}
            disabled={isSaving}
          >
            <Text style={styles.secondaryButtonText}>
              {template.isArchived ? 'Unarchive' : 'Archive'}
            </Text>
          </Pressable>
        </>
      ) : null}

      {template ? (
        <Pressable style={styles.deleteButton} onPress={handleDelete}>
          <Text style={styles.deleteButtonText}>Delete Routine</Text>
        </Pressable>
      ) : null}

      <ExercisePicker
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={(exercise) =>
          setExercises((prev) => [
            ...prev,
            {
              key: nextDraftKey++,
              exercise,
              sets: '',
              reps: '',
              weight: '',
              showTargets: false,
              restSeconds: null,
            },
          ])
        }
      />
    </ScrollView>
  );
}

function TargetInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <View style={styles.targetField}>
      <Text style={styles.targetLabel}>{label}</Text>
      <TextInput
        style={styles.targetInput}
        value={value}
        onChangeText={onChange}
        keyboardType="numeric"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16, paddingBottom: 40 },
  label: { fontSize: 14, fontWeight: '600', marginTop: 16, marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
  },
  emptyText: { color: colors.subtle, fontSize: 14 },
  exerciseCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  exerciseHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  exerciseName: { fontSize: 15, fontWeight: '600', flex: 1 },
  removeText: { color: colors.danger, marginLeft: 8 },
  moveButton: { paddingHorizontal: 8, paddingVertical: 2 },
  moveText: { fontSize: 18, color: colors.primary },
  moveTextDisabled: { fontSize: 18, color: colors.borderStrong },
  linkButton: { alignSelf: 'flex-start' },
  defaultRestRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 20 },
  addTargetsText: { color: colors.primary, fontSize: 14, marginTop: 6 },
  defaultRestText: { color: colors.muted, fontSize: 13, marginTop: 6 },
  restLabel: { fontSize: 12, color: colors.textSecondary },
  useDefaultText: { color: colors.primary, fontSize: 14 },
  restRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  targetsRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  targetField: { flex: 1 },
  targetLabel: { fontSize: 12, color: colors.textSecondary, marginBottom: 4 },
  targetInput: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: 6,
    padding: 8,
    fontSize: 15,
  },
  secondaryButton: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  secondaryButtonText: { fontSize: 15, fontWeight: '600' },
  error: { color: colors.danger, marginTop: 12 },
  saveButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginTop: 24,
  },
  saveButtonText: { color: colors.onPrimary, fontSize: 16, fontWeight: '600' },
  deleteButton: { padding: 14, alignItems: 'center', marginTop: 8 },
  deleteButtonText: { color: colors.danger, fontSize: 15 },
});
