import { useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  Vibration,
  View,
} from 'react-native';

import { ExercisePicker } from '../../../components/workouts/ExercisePicker';
import { SwapExercisePicker } from '../../../components/workouts/SwapExercisePicker';
import { useSession } from '../../../context/AuthProvider';
import { useRestVibration } from '../../../hooks/useRestVibration';
import {
  useExerciseHistory,
  useWorkoutLog,
  useWorkoutTemplate,
} from '../../../hooks/useWorkouts';
import {
  addExerciseToLog,
  addSet,
  deleteSet,
  deleteWorkoutLog,
  finishWorkout,
  insertExerciseAfter,
  removeExerciseFromLog,
  swapLogExercise,
} from '../../../lib/workouts';
import { colors, radius, spacing } from '../../../theme';
import type {
  Exercise,
  WorkoutLogExercise,
  WorkoutSet,
  WorkoutTemplateExercise,
} from '../../../types/domain';

const DEFAULT_REST_S = 90;

function toNumberOrNull(value: string): number | null {
  const n = Number(value.replace(',', '.'));
  return value.trim() === '' || Number.isNaN(n) ? null : n;
}

function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = String(s % 60).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`;
}

export default function ActiveWorkout() {
  const { logId } = useLocalSearchParams<{ logId: string }>();
  const { session } = useSession();
  const queryClient = useQueryClient();
  const { data: log, isLoading } = useWorkoutLog(logId);
  const { data: template } = useWorkoutTemplate(log?.templateId ?? null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);
  // When the current rest ends (ms timestamp), or null when not resting.
  const [restEndsAt, setRestEndsAt] = useState<number | null>(null);

  function refresh() {
    return queryClient.invalidateQueries({ queryKey: ['workoutLog', logId] });
  }

  async function handleFinish() {
    if (!log) return;
    setIsFinishing(true);
    try {
      await finishWorkout(log.id);
      await queryClient.invalidateQueries({ queryKey: ['workoutHistory', session?.user.id] });
      // So the "Previous" column shows this workout next time.
      await queryClient.invalidateQueries({ queryKey: ['exerciseHistory'] });
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
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>{log.name}</Text>
        <ElapsedClock startedAt={log.startedAt} />

        {log.exercises.map((logExercise) => (
          <ExerciseCard
            // Includes the exercise so a swap resets the card's local rows.
            key={`${logExercise.id}-${logExercise.exercise.id}`}
            logId={log.id}
            logExercise={logExercise}
            target={template?.exercises.find((te) => te.exercise.id === logExercise.exercise.id)}
            onChanged={refresh}
            onSetDone={() => setRestEndsAt(Date.now() + DEFAULT_REST_S * 1000)}
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

      {restEndsAt != null ? <RestTimer endsAt={restEndsAt} onChange={setRestEndsAt} /> : null}
    </View>
  );
}

// Own component so only the clock re-renders every second.
function ElapsedClock({ startedAt }: { startedAt: string }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <Text style={styles.subtitle}>
      {formatDuration((now - new Date(startedAt).getTime()) / 1000)} elapsed
    </Text>
  );
}

function RestTimer({
  endsAt,
  onChange,
}: {
  endsAt: number;
  onChange: (endsAt: number | null) => void;
}) {
  const [now, setNow] = useState(() => Date.now());
  const remaining = (endsAt - now) / 1000;
  const { enabled: vibrate } = useRestVibration();

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (remaining <= 0) {
      if (vibrate) Vibration.vibrate([0, 400, 200, 400]);
      onChange(null);
    }
  }, [remaining, onChange, vibrate]);

  return (
    <View style={styles.restBar}>
      <Pressable style={styles.restAdjust} onPress={() => onChange(endsAt - 15_000)}>
        <Text style={styles.restAdjustText}>−15</Text>
      </Pressable>
      <View style={styles.restCenter}>
        <Text style={styles.restLabel}>Rest</Text>
        <Text style={styles.restTime}>{formatDuration(Math.ceil(remaining))}</Text>
      </View>
      <Pressable style={styles.restAdjust} onPress={() => onChange(endsAt + 15_000)}>
        <Text style={styles.restAdjustText}>+15</Text>
      </Pressable>
      <Pressable style={styles.restSkip} onPress={() => onChange(null)}>
        <Text style={styles.restSkipText}>Skip</Text>
      </Pressable>
    </View>
  );
}

// A set row not yet saved. a/b = kg/reps (strength) or min/km (cardio).
type DraftRow = { key: number; a: string; b: string };

let lastDraftKey = 0;
function newRow(a = '', b = ''): DraftRow {
  lastDraftKey += 1;
  return { key: lastDraftKey, a, b };
}

function ExerciseCard({
  logId,
  logExercise,
  target,
  onChanged,
  onSetDone,
}: {
  logId: string;
  logExercise: WorkoutLogExercise;
  target: WorkoutTemplateExercise | undefined;
  onChanged: () => Promise<void>;
  onSetDone: () => void;
}) {
  const isCardio = logExercise.exercise.category === 'cardio';
  const doneSets = logExercise.sets;
  const lastDone = doneSets.at(-1);
  const { data: history } = useExerciseHistory(logExercise.exercise.id);
  // History only has completed workouts, so [0] is the last time before this one.
  const previous = history?.[0];

  // Start with the template's remaining sets, or one empty row.
  const [drafts, setDrafts] = useState<DraftRow[]>(() => {
    const count = Math.max((target?.targetSets ?? 0) - doneSets.length, doneSets.length ? 0 : 1);
    return Array.from({ length: count }, () => newRow());
  });
  const [savingKey, setSavingKey] = useState<number | null>(null);
  const [swapOpen, setSwapOpen] = useState(false);

  // Suggested values shown greyed out; used when the input is left empty.
  function suggestion(setNumber: number): { a: number | null; b: number | null } {
    const prev = previous?.sets[setNumber - 1];
    if (isCardio) {
      const src = prev ?? lastDone;
      return {
        a: src?.durationS != null ? Math.round(src.durationS / 60) : null,
        b: src?.distanceM != null ? src.distanceM / 1000 : null,
      };
    }
    return {
      a: prev?.weightKg ?? target?.targetWeightKg ?? lastDone?.weightKg ?? null,
      b: prev?.reps ?? target?.targetReps ?? lastDone?.reps ?? null,
    };
  }

  function updateDraft(key: number, patch: Partial<DraftRow>) {
    setDrafts((prev) => prev.map((d) => (d.key === key ? { ...d, ...patch } : d)));
  }

  async function handleDone(draft: DraftRow, setNumber: number) {
    const s = suggestion(setNumber);
    const a = toNumberOrNull(draft.a) ?? s.a;
    const b = toNumberOrNull(draft.b) ?? s.b;
    if (a == null && b == null) return;

    setSavingKey(draft.key);
    try {
      await addSet({
        logExerciseId: logExercise.id,
        setNumber: (lastDone?.setNumber ?? 0) + 1,
        weightKg: isCardio ? null : a,
        reps: isCardio ? null : b,
        durationS: isCardio && a != null ? Math.round(a * 60) : null,
        distanceM: isCardio && b != null ? b * 1000 : null,
      });
      setDrafts((prev) => prev.filter((d) => d.key !== draft.key));
      await onChanged();
      if (!isCardio) onSetDone();
    } finally {
      setSavingKey(null);
    }
  }

  // Un-ticking a set deletes it but keeps its numbers in a row to redo.
  async function handleUndo(set: WorkoutSet) {
    const a = isCardio
      ? set.durationS != null ? String(Math.round(set.durationS / 60)) : ''
      : set.weightKg?.toString() ?? '';
    const b = isCardio
      ? set.distanceM != null ? String(set.distanceM / 1000) : ''
      : set.reps?.toString() ?? '';
    await deleteSet(set.id);
    setDrafts((prev) => [newRow(a, b), ...prev]);
    await onChanged();
  }

  async function handleSwap(exercise: Exercise) {
    // No sets yet: replace in place. Sets logged: keep them and add the new exercise below.
    if (doneSets.length === 0) {
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

  async function handleRemoveExercise() {
    await removeExerciseFromLog(logExercise.id);
    await onChanged();
  }

  function previousText(setNumber: number): string {
    const prev = previous?.sets[setNumber - 1];
    if (!prev) return '—';
    if (isCardio) {
      const parts = [];
      if (prev.durationS != null) parts.push(`${Math.round(prev.durationS / 60)}m`);
      if (prev.distanceM != null) parts.push(`${prev.distanceM / 1000}km`);
      return parts.join(' ') || '—';
    }
    return `${prev.weightKg ?? 0} × ${prev.reps ?? 0}`;
  }

  const targetText =
    target && !isCardio && (target.targetSets || target.targetReps)
      ? `Target: ${target.targetSets ?? '?'} × ${target.targetReps ?? '?'}${
          target.targetWeightKg ? ` @ ${target.targetWeightKg} kg` : ''
        }`
      : null;

  const [labelA, labelB] = isCardio ? ['min', 'km'] : ['kg', 'reps'];

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{logExercise.exercise.name}</Text>
        <Pressable onPress={() => setSwapOpen(true)} hitSlop={8}>
          <Text style={styles.swapText}>⇄ Swap</Text>
        </Pressable>
        {doneSets.length === 0 ? (
          <Pressable onPress={handleRemoveExercise} hitSlop={8}>
            <Text style={styles.removeText}>Remove</Text>
          </Pressable>
        ) : null}
      </View>
      {targetText ? <Text style={styles.targetText}>{targetText}</Text> : null}

      <View style={styles.tableHeader}>
        <Text style={[styles.headerCell, styles.colSet]}>Set</Text>
        <Text style={[styles.headerCell, styles.colPrev]}>Previous</Text>
        <Text style={[styles.headerCell, styles.colInput]}>{labelA}</Text>
        <Text style={[styles.headerCell, styles.colInput]}>{labelB}</Text>
        <View style={styles.colCheck} />
      </View>

      {doneSets.map((set, index) => (
        <View key={set.id} style={[styles.row, styles.rowDone]}>
          <Text style={[styles.cell, styles.colSet]}>{index + 1}</Text>
          <Text style={[styles.prevCell, styles.colPrev]}>{previousText(index + 1)}</Text>
          <Text style={[styles.doneValue, styles.colInput]}>
            {isCardio
              ? set.durationS != null ? Math.round(set.durationS / 60) : '—'
              : (set.weightKg ?? '—')}
          </Text>
          <Text style={[styles.doneValue, styles.colInput]}>
            {isCardio
              ? set.distanceM != null ? set.distanceM / 1000 : '—'
              : (set.reps ?? '—')}
          </Text>
          <Pressable style={[styles.check, styles.checkDone]} onPress={() => handleUndo(set)}>
            <Text style={styles.checkDoneText}>✓</Text>
          </Pressable>
        </View>
      ))}

      {drafts.map((draft, i) => {
        const setNumber = doneSets.length + i + 1;
        const s = suggestion(setNumber);
        return (
          <View key={draft.key} style={styles.row}>
            <Text style={[styles.cell, styles.colSet]}>{setNumber}</Text>
            <Text style={[styles.prevCell, styles.colPrev]}>{previousText(setNumber)}</Text>
            <TextInput
              style={[styles.input, styles.colInput]}
              value={draft.a}
              onChangeText={(v) => updateDraft(draft.key, { a: v })}
              placeholder={s.a != null ? String(s.a) : labelA}
              placeholderTextColor={colors.muted}
              keyboardType="numeric"
            />
            <TextInput
              style={[styles.input, styles.colInput]}
              value={draft.b}
              onChangeText={(v) => updateDraft(draft.key, { b: v })}
              placeholder={s.b != null ? String(s.b) : labelB}
              placeholderTextColor={colors.muted}
              keyboardType="numeric"
            />
            <Pressable
              style={styles.check}
              onPress={() => handleDone(draft, setNumber)}
              disabled={savingKey != null}
            >
              {savingKey === draft.key ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Text style={styles.checkText}>✓</Text>
              )}
            </Pressable>
          </View>
        );
      })}

      <Pressable
        style={styles.addSetButton}
        onPress={() => {
          const last = drafts.at(-1);
          setDrafts((prev) => [...prev, newRow(last?.a, last?.b)]);
        }}
      >
        <Text style={styles.addSetText}>+ Add set</Text>
      </Pressable>

      <SwapExercisePicker
        current={logExercise.exercise}
        visible={swapOpen}
        onClose={() => setSwapOpen(false)}
        onSelect={handleSwap}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: spacing.lg, paddingBottom: 40 },
  title: { fontSize: 20, fontWeight: '700', color: colors.text },
  subtitle: { fontSize: 14, color: colors.muted, marginTop: 2, marginBottom: spacing.lg },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  cardTitle: { fontSize: 16, fontWeight: '600', flex: 1, color: colors.text },
  swapText: { color: colors.primary, fontSize: 15 },
  removeText: { color: colors.danger, fontSize: 15 },
  targetText: { fontSize: 13, color: colors.muted, marginTop: 2 },
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  headerCell: { fontSize: 12, fontWeight: '600', color: colors.muted, textAlign: 'center' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
  },
  rowDone: { backgroundColor: '#dcfce7' },
  colSet: { width: 28, textAlign: 'center' },
  colPrev: { flex: 1.4, textAlign: 'center' },
  colInput: { flex: 1, textAlign: 'center' },
  colCheck: { width: 36 },
  cell: { fontSize: 15, fontWeight: '600', color: colors.text },
  prevCell: { fontSize: 13, color: colors.muted },
  doneValue: { fontSize: 15, color: colors.text, paddingVertical: 8 },
  input: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingVertical: 6,
    fontSize: 15,
    color: colors.text,
  },
  check: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    backgroundColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkText: { fontSize: 18, color: colors.muted, fontWeight: '700' },
  checkDone: { backgroundColor: colors.success },
  checkDoneText: { fontSize: 18, color: '#fff', fontWeight: '700' },
  addSetButton: { alignItems: 'center', paddingVertical: spacing.sm, marginTop: spacing.xs },
  addSetText: { color: colors.primary, fontSize: 15, fontWeight: '600' },
  secondaryButton: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
  },
  secondaryButtonText: { fontSize: 15, fontWeight: '600', color: colors.text },
  finishButton: {
    backgroundColor: colors.success,
    borderRadius: radius.md,
    padding: 14,
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  finishButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  discardButton: { padding: 14, alignItems: 'center', marginTop: spacing.sm },
  discardButtonText: { color: colors.danger, fontSize: 15 },
  restBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.text,
  },
  restCenter: { flex: 1, alignItems: 'center' },
  restLabel: { fontSize: 12, color: '#9ca3af' },
  restTime: { fontSize: 22, fontWeight: '700', color: '#fff' },
  restAdjust: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    backgroundColor: '#374151',
  },
  restAdjustText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  restSkip: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md },
  restSkipText: { color: '#93c5fd', fontSize: 15, fontWeight: '600' },
});
