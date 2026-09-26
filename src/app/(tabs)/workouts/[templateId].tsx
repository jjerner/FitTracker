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

import { ExercisePicker } from '../../../components/workouts/ExercisePicker';
import { useSession } from '../../../context/AuthProvider';
import { useWorkoutTemplate } from '../../../hooks/useWorkouts';
import { deleteTemplate, saveTemplate, setTemplateArchived } from '../../../lib/workouts';
import type { WorkoutTemplate, WorkoutTemplateExercise } from '../../../types/domain';

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
  exercise: WorkoutTemplateExercise['exercise'];
  sets: string;
  reps: string;
  weight: string;
  // Targets are optional; the inputs stay hidden until asked for.
  showTargets: boolean;
};

function toNumberOrNull(value: string): number | null {
  const n = Number(value.replace(',', '.'));
  return value.trim() === '' || Number.isNaN(n) ? null : n;
}

function TemplateForm({ template }: { template: WorkoutTemplate | null }) {
  const { session } = useSession();
  const queryClient = useQueryClient();
  const [name, setName] = useState(template?.name ?? '');
  const [exercises, setExercises] = useState<DraftExercise[]>(
    (template?.exercises ?? []).map((te) => ({
      exercise: te.exercise,
      sets: te.targetSets?.toString() ?? '',
      reps: te.targetReps?.toString() ?? '',
      weight: te.targetWeightKg?.toString() ?? '',
      showTargets: te.targetSets != null || te.targetReps != null || te.targetWeightKg != null,
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
      setError('Give the template a name.');
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
        name: `${name.trim() || 'Template'} (copy)`,
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
    Alert.alert('Delete template?', template.name, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteTemplate(template.id);
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
        <View key={`${e.exercise.id}-${index}`} style={styles.exerciseCard}>
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
            >
              <Text style={styles.removeText}>Remove</Text>
            </Pressable>
          </View>
          {e.exercise.category === 'strength' && !e.showTargets ? (
            <Pressable onPress={() => updateExercise(index, { showTargets: true })}>
              <Text style={styles.addTargetsText}>+ Targets</Text>
            </Pressable>
          ) : null}
          {e.exercise.category === 'strength' && e.showTargets ? (
            <View style={styles.targetsRow}>
              <TargetInput label="Sets" value={e.sets} onChange={(v) => updateExercise(index, { sets: v })} />
              <TargetInput label="Reps" value={e.reps} onChange={(v) => updateExercise(index, { reps: v })} />
              <TargetInput label="kg" value={e.weight} onChange={(v) => updateExercise(index, { weight: v })} />
            </View>
          ) : null}
        </View>
      ))}

      <Pressable style={styles.secondaryButton} onPress={() => setPickerOpen(true)}>
        <Text style={styles.secondaryButtonText}>+ Add Exercise</Text>
      </Pressable>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable style={styles.saveButton} onPress={handleSave} disabled={isSaving}>
        {isSaving ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.saveButtonText}>Save Template</Text>
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
          <Text style={styles.deleteButtonText}>Delete Template</Text>
        </Pressable>
      ) : null}

      <ExercisePicker
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={(exercise) =>
          setExercises((prev) => [
            ...prev,
            { exercise, sets: '', reps: '', weight: '', showTargets: false },
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
  container: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16, paddingBottom: 40 },
  label: { fontSize: 14, fontWeight: '600', marginTop: 16, marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
  },
  emptyText: { color: '#999', fontSize: 14 },
  exerciseCard: {
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  exerciseHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  exerciseName: { fontSize: 15, fontWeight: '600', flex: 1 },
  removeText: { color: '#dc2626', marginLeft: 8 },
  moveButton: { paddingHorizontal: 8, paddingVertical: 2 },
  moveText: { fontSize: 18, color: '#2563eb' },
  moveTextDisabled: { fontSize: 18, color: '#ccc' },
  addTargetsText: { color: '#2563eb', fontSize: 14, marginTop: 6 },
  targetsRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  targetField: { flex: 1 },
  targetLabel: { fontSize: 12, color: '#555', marginBottom: 4 },
  targetInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    padding: 8,
    fontSize: 15,
  },
  secondaryButton: {
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  secondaryButtonText: { fontSize: 15, fontWeight: '600' },
  error: { color: '#dc2626', marginTop: 12 },
  saveButton: {
    backgroundColor: '#2563eb',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginTop: 24,
  },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  deleteButton: { padding: 14, alignItems: 'center', marginTop: 8 },
  deleteButtonText: { color: '#dc2626', fontSize: 15 },
});
