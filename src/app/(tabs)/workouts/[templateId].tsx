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

import { AppText } from '../../../components/AppText';
import { Button } from '../../../components/Button';
import { Card } from '../../../components/Card';
import { EmptyState } from '../../../components/EmptyState';
import { LabeledInput } from '../../../components/LabeledInput';
import { RestTimeInput } from '../../../components/RestTimeInput';
import { TextLink } from '../../../components/TextLink';
import { ExercisePicker } from '../../../components/workouts/ExercisePicker';
import { useSession } from '../../../context/AuthProvider';
import { useDefaultRest } from '../../../hooks/useDefaultRest';
import { useWorkoutTemplate } from '../../../hooks/useWorkouts';
import { toNumberOrNull } from '../../../lib/numbers';
import { formatRest } from '../../../lib/restTime';
import { deleteTemplate, saveTemplate, setTemplateArchived } from '../../../lib/workouts';
import type { WorkoutTemplate, WorkoutTemplateExercise } from '../../../types/domain';
import { colors, radius, spacing, typography } from '../../../theme';

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
      <LabeledInput label="Name" value={name} onChangeText={setName} placeholder="e.g. Push Day" />

      <AppText variant="labelSmall" accessibilityRole="header" style={styles.label}>
        Exercises
      </AppText>
      {exercises.length === 0 ? (
        <Card style={styles.emptyCard}>
          <EmptyState message="No exercises yet. Tap + Add Exercise to add one." />
        </Card>
      ) : null}
      {exercises.map((e, index) => (
        <Card key={e.key} style={styles.exerciseCard}>
          <View style={styles.exerciseHeader}>
            <AppText variant="label" style={styles.exerciseName}>
              {e.exercise.name}
            </AppText>
            <Pressable
              style={styles.moveButton}
              onPress={() => moveExercise(index, -1)}
              disabled={index === 0}
              accessibilityRole="button"
              accessibilityLabel={`Move ${e.exercise.name} up`}
              accessibilityState={{ disabled: index === 0 }}
            >
              <Text style={index === 0 ? styles.moveTextDisabled : styles.moveText}>↑</Text>
            </Pressable>
            <Pressable
              style={styles.moveButton}
              onPress={() => moveExercise(index, 1)}
              disabled={index === exercises.length - 1}
              accessibilityRole="button"
              accessibilityLabel={`Move ${e.exercise.name} down`}
              accessibilityState={{ disabled: index === exercises.length - 1 }}
            >
              <Text
                style={index === exercises.length - 1 ? styles.moveTextDisabled : styles.moveText}
              >
                ↓
              </Text>
            </Pressable>
            <Pressable
              style={styles.removeButton}
              onPress={() => setExercises((prev) => prev.filter((_, i) => i !== index))}
              accessibilityRole="button"
              accessibilityLabel={`Remove ${e.exercise.name}`}
            >
              <AppText variant="small" style={styles.removeText}>
                Remove
              </AppText>
            </Pressable>
          </View>
          {e.exercise.category === 'strength' ? (
            <>
              {!e.showTargets ? (
                <Pressable
                  style={styles.linkButton}
                  onPress={() => updateExercise(index, { showTargets: true })}
                  hitSlop={14}
                  accessibilityRole="button"
                >
                  <AppText variant="small" style={styles.addTargetsText}>
                    + Targets
                  </AppText>
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
                  <AppText variant="small" style={styles.defaultRestText}>
                    Uses your default rest ({formatRest(defaultRest.seconds)})
                  </AppText>
                  <Pressable
                    onPress={() => updateExercise(index, { restSeconds: defaultRest.seconds })}
                    hitSlop={14}
                    accessibilityRole="button"
                  >
                    <AppText variant="small" style={styles.addTargetsText}>
                      + Rest time
                    </AppText>
                  </Pressable>
                </View>
              ) : (
                <View style={styles.restRow}>
                  <AppText variant="caption" style={styles.restLabel}>
                    Rest
                  </AppText>
                  <RestTimeInput
                    initialSeconds={e.restSeconds}
                    min={5}
                    label={`${e.exercise.name} rest`}
                    onChange={(v) => updateExercise(index, { restSeconds: v })}
                  />
                  <Pressable
                    onPress={() => updateExercise(index, { restSeconds: null })}
                    hitSlop={14}
                    accessibilityRole="button"
                    accessibilityLabel="Use default rest"
                  >
                    <AppText variant="small" style={styles.useDefaultText}>
                      ✕ Use default
                    </AppText>
                  </Pressable>
                </View>
              )}
            </>
          ) : null}
        </Card>
      ))}

      <Button
        variant="secondary"
        title="+ Add Exercise"
        onPress={() => setPickerOpen(true)}
        style={styles.secondaryButton}
      />

      {error ? (
        <AppText style={styles.error} accessibilityRole="alert" accessibilityLiveRegion="polite">
          {error}
        </AppText>
      ) : null}

      <Button title="Save Routine" onPress={handleSave} loading={isSaving} style={styles.saveButton} />

      {template ? (
        <>
          <Button
            variant="secondary"
            title="Duplicate"
            onPress={handleDuplicate}
            disabled={isSaving}
            style={styles.secondaryButton}
          />
          <Button
            variant="secondary"
            title={template.isArchived ? 'Unarchive' : 'Archive'}
            onPress={handleToggleArchived}
            disabled={isSaving}
            style={styles.secondaryButton}
          />
        </>
      ) : null}

      {template ? (
        <TextLink
          tone="danger"
          title="Delete Routine"
          onPress={handleDelete}
          style={styles.deleteLink}
        />
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
      <AppText variant="caption" style={styles.targetLabel}>
        {label}
      </AppText>
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
  container: { flex: 1, backgroundColor: colors.surface },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  label: { marginTop: spacing.lg, marginBottom: spacing.sm },
  emptyCard: { paddingVertical: 0 },
  exerciseCard: { padding: spacing.md, gap: 0, marginBottom: spacing.sm },
  exerciseHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  exerciseName: { flex: 1 },
  removeButton: { minHeight: 48, justifyContent: 'center', paddingLeft: spacing.sm },
  removeText: { color: colors.danger },
  moveButton: { minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  // icon glyph, not text
  moveText: { fontSize: 18, color: colors.primary },
  // icon glyph, not text
  moveTextDisabled: { fontSize: 18, color: colors.borderStrong },
  linkButton: { alignSelf: 'flex-start' },
  defaultRestRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    columnGap: spacing.xl,
  },
  addTargetsText: { color: colors.primary, marginTop: spacing.sm },
  defaultRestText: { marginTop: spacing.sm },
  restLabel: { color: colors.textSecondary },
  useDefaultText: { color: colors.primary },
  restRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  targetsRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  targetField: { flex: 1 },
  targetLabel: { color: colors.textSecondary, marginBottom: spacing.xs },
  targetInput: {
    ...typography.body,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.sm,
    padding: spacing.sm,
  },
  secondaryButton: { marginTop: spacing.sm },
  error: { color: colors.dangerDark, marginTop: spacing.md },
  saveButton: { marginTop: spacing.xl },
  deleteLink: { marginTop: spacing.md },
});
