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
import { SwapExercisePicker } from '../../../components/workouts/SwapExercisePicker';
import { useSession } from '../../../context/AuthProvider';
import { useWorkoutLog, useWorkoutTemplate } from '../../../hooks/useWorkouts';
import {
  addExerciseToLog,
  addSet,
  deleteSet,
  deleteWorkoutLog,
  finishWorkout,
  formatSet,
  insertExerciseAfter,
  removeExerciseFromLog,
  swapLogExercise,
} from '../../../lib/workouts';
import type { Exercise, WorkoutLogExercise, WorkoutTemplateExercise } from '../../../types/domain';

function toNumberOrNull(value: string): number | null {
  const n = Number(value.replace(',', '.'));
  return value.trim() === '' || Number.isNaN(n) ? null : n;
}

export default function ActiveWorkout() {
  const { logId } = useLocalSearchParams<{ logId: string }>();
  const { session } = useSession();
  const queryClient = useQueryClient();
  const { data: log, isLoading } = useWorkoutLog(logId);
  const { data: template } = useWorkoutTemplate(log?.templateId ?? null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);

  function refresh() {
    return queryClient.invalidateQueries({ queryKey: ['workoutLog', logId] });
  }

  async function handleFinish() {
    if (!log) return;
    setIsFinishing(true);
    try {
      await finishWorkout(log.id);
      await queryClient.invalidateQueries({ queryKey: ['workoutHistory', session?.user.id] });
      await refresh();
      router.replace(`/(tabs)/workouts/log/${log.id}`);
    } finally {
      setIsFinishing(false);
    }
  }

  function handleDiscard() {
    if (!log) return;
    Alert.alert('Discard workout?', 'All sets in this workout will be deleted.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Discard',
        style: 'destructive',
        onPress: async () => {
          await deleteWorkoutLog(log.id);
          await queryClient.invalidateQueries({ queryKey: ['workoutHistory', session?.user.id] });
          router.back();
        },
      },
    ]);
  }

  if (isLoading || !log) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.title}>{log.name}</Text>
      <Text style={styles.subtitle}>
        Started {new Date(log.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </Text>

      {log.exercises.map((logExercise) => (
        <ExerciseCard
          // Includes the exercise so a swap resets the card's pre-filled inputs.
          key={`${logExercise.id}-${logExercise.exercise.id}`}
          logId={log.id}
          logExercise={logExercise}
          target={template?.exercises.find((te) => te.exercise.id === logExercise.exercise.id)}
          onChanged={refresh}
        />
      ))}

      <Pressable style={styles.secondaryButton} onPress={() => setPickerOpen(true)}>
        <Text style={styles.secondaryButtonText}>+ Add Exercise</Text>
      </Pressable>

      <Pressable style={styles.finishButton} onPress={handleFinish} disabled={isFinishing}>
        {isFinishing ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.finishButtonText}>Finish Workout</Text>
        )}
      </Pressable>

      <Pressable style={styles.discardButton} onPress={handleDiscard}>
        <Text style={styles.discardButtonText}>Discard Workout</Text>
      </Pressable>

      <ExercisePicker
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={async (exercise) => {
          const lastPosition = log.exercises.at(-1)?.position ?? -1;
          await addExerciseToLog({
            logId: log.id,
            exerciseId: exercise.id,
            position: lastPosition + 1,
          });
          await refresh();
        }}
      />
    </ScrollView>
  );
}

function ExerciseCard({
  logId,
  logExercise,
  target,
  onChanged,
}: {
  logId: string;
  logExercise: WorkoutLogExercise;
  target: WorkoutTemplateExercise | undefined;
  onChanged: () => Promise<void>;
}) {
  const isCardio = logExercise.exercise.category === 'cardio';
  const lastSet = logExercise.sets.at(-1);

  // Pre-fill from the last logged set, falling back to the template's targets.
  const [weight, setWeight] = useState(
    lastSet?.weightKg?.toString() ?? target?.targetWeightKg?.toString() ?? ''
  );
  const [reps, setReps] = useState(
    lastSet?.reps?.toString() ?? target?.targetReps?.toString() ?? ''
  );
  const [minutes, setMinutes] = useState(
    lastSet?.durationS != null ? String(Math.round(lastSet.durationS / 60)) : ''
  );
  const [km, setKm] = useState(lastSet?.distanceM != null ? String(lastSet.distanceM / 1000) : '');
  const [isSaving, setIsSaving] = useState(false);
  const [swapOpen, setSwapOpen] = useState(false);

  // No sets yet: replace in place. Sets logged: keep them and add the new exercise below.
  async function handleSwap(exercise: Exercise) {
    if (logExercise.sets.length === 0) {
      await swapLogExercise(logExercise.id, exercise.id);
    } else {
      await insertExerciseAfter({
        logId,
        afterPosition: logExercise.position,
        exerciseId: exercise.id,
      });
    }
    await onChanged();
  }

  async function handleAddSet() {
    const minutesNum = toNumberOrNull(minutes);
    const kmNum = toNumberOrNull(km);
    setIsSaving(true);
    try {
      await addSet({
        logExerciseId: logExercise.id,
        setNumber: (lastSet?.setNumber ?? 0) + 1,
        weightKg: isCardio ? null : toNumberOrNull(weight),
        reps: isCardio ? null : toNumberOrNull(reps),
        durationS: isCardio && minutesNum != null ? Math.round(minutesNum * 60) : null,
        distanceM: isCardio && kmNum != null ? kmNum * 1000 : null,
      });
      await onChanged();
    } finally {
      setIsSaving(false);
    }
  }

  async function handleRemoveExercise() {
    await removeExerciseFromLog(logExercise.id);
    await onChanged();
  }

  const targetText =
    target && !isCardio && (target.targetSets || target.targetReps)
      ? `Target: ${target.targetSets ?? '?'} × ${target.targetReps ?? '?'}${
          target.targetWeightKg ? ` @ ${target.targetWeightKg} kg` : ''
        }`
      : null;

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{logExercise.exercise.name}</Text>
        <Pressable onPress={() => setSwapOpen(true)}>
          <Text style={styles.swapText}>⇄ Swap</Text>
        </Pressable>
        {logExercise.sets.length === 0 ? (
          <Pressable onPress={handleRemoveExercise}>
            <Text style={styles.removeText}>Remove</Text>
          </Pressable>
        ) : null}
      </View>
      {targetText ? <Text style={styles.targetText}>{targetText}</Text> : null}

      {logExercise.sets.map((set) => (
        <View key={set.id} style={styles.setRow}>
          <Text style={styles.setText}>
            Set {set.setNumber}: {formatSet(set)}
          </Text>
          <Pressable
            onPress={async () => {
              await deleteSet(set.id);
              await onChanged();
            }}
          >
            <Text style={styles.removeText}>✕</Text>
          </Pressable>
        </View>
      ))}

      <View style={styles.inputRow}>
        {isCardio ? (
          <>
            <SetInput label="min" value={minutes} onChange={setMinutes} />
            <SetInput label="km" value={km} onChange={setKm} />
          </>
        ) : (
          <>
            <SetInput label="kg" value={weight} onChange={setWeight} />
            <SetInput label="reps" value={reps} onChange={setReps} />
          </>
        )}
        <Pressable style={styles.addSetButton} onPress={handleAddSet} disabled={isSaving}>
          {isSaving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.addSetButtonText}>Add Set</Text>
          )}
        </Pressable>
      </View>

      <SwapExercisePicker
        current={logExercise.exercise}
        visible={swapOpen}
        onClose={() => setSwapOpen(false)}
        onSelect={handleSwap}
      />
    </View>
  );
}

function SetInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <View style={styles.setInputField}>
      <TextInput
        style={styles.setInput}
        value={value}
        onChangeText={onChange}
        keyboardType="numeric"
        placeholder={label}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16, paddingBottom: 40 },
  title: { fontSize: 20, fontWeight: '700' },
  subtitle: { fontSize: 14, color: '#888', marginTop: 2, marginBottom: 16 },
  card: { backgroundColor: '#f3f4f6', borderRadius: 12, padding: 12, marginBottom: 12 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontSize: 16, fontWeight: '600', flex: 1 },
  targetText: { fontSize: 13, color: '#555', marginTop: 2 },
  removeText: { color: '#dc2626', fontSize: 15, marginLeft: 12 },
  swapText: { color: '#2563eb', fontSize: 15 },
  setRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  setText: { fontSize: 15 },
  inputRow: { flexDirection: 'row', gap: 8, marginTop: 10, alignItems: 'center' },
  setInputField: { flex: 1 },
  setInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    padding: 8,
    fontSize: 15,
  },
  addSetButton: {
    backgroundColor: '#2563eb',
    borderRadius: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  addSetButtonText: { color: '#fff', fontWeight: '600' },
  secondaryButton: {
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  secondaryButtonText: { fontSize: 15, fontWeight: '600' },
  finishButton: {
    backgroundColor: '#16a34a',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginTop: 24,
  },
  finishButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  discardButton: { padding: 14, alignItems: 'center', marginTop: 8 },
  discardButtonText: { color: '#dc2626', fontSize: 15 },
});
