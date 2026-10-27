import { useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useEffect, useMemo, useState } from 'react';
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

import { AppText } from '../../../components/AppText';
import { Button } from '../../../components/Button';
import { Card } from '../../../components/Card';
import { TextLink } from '../../../components/TextLink';
import { ExercisePicker } from '../../../components/workouts/ExercisePicker';
import { SwapExercisePicker } from '../../../components/workouts/SwapExercisePicker';
import { useSession } from '../../../context/AuthProvider';
import { useDefaultRest } from '../../../hooks/useDefaultRest';
import { useRestVibration } from '../../../hooks/useRestVibration';
import { useSetsHint } from '../../../hooks/useSetsHint';
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
import {
  flushPendingSets,
  newSetId,
  queueSet,
  removePending,
  usePendingSets,
  usePendingSync,
} from '../../../lib/pendingSets';
import { toNumberOrNull } from '../../../lib/numbers';
import { bestOf, findNewRecords, matchingSet, setLabels, setsVolume } from '../../../lib/records';
import { colors, radius, spacing, typography } from '../../../theme';
import type {
  Exercise,
  SetType,
  WorkoutLogExercise,
  WorkoutSet,
  WorkoutTemplateExercise,
} from '../../../types/domain';

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
  const defaultRest = useDefaultRest();
  const setsHint = useSetsHint();
  const { data: log, isLoading } = useWorkoutLog(logId);
  const { data: template } = useWorkoutTemplate(log?.templateId ?? null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);
  // When the current rest ends (ms timestamp), or null when not resting.
  const [restEndsAt, setRestEndsAt] = useState<number | null>(null);

  function refresh() {
    return queryClient.invalidateQueries({ queryKey: ['workoutLog', logId] });
  }

  // Sets saved on the phone while offline, sent as soon as there is signal.
  const pendingSets = usePendingSets(logId);
  const savedSetIds = useMemo(
    () => new Set(log?.exercises.flatMap((e) => e.sets.map((set) => set.id)) ?? []),
    [log]
  );
  usePendingSync(logId, savedSetIds, refresh);

  async function handleFinish() {
    if (!log) return;
    setIsFinishing(true);
    try {
      const { allSent } = await flushPendingSets();
      if (!allSent) {
        Alert.alert(
          'No connection',
          'Some sets are saved on your phone but not sent yet. Try finishing again when you have signal.'
        );
        return;
      }
      await finishWorkout(log.id);
      await queryClient.invalidateQueries({ queryKey: ['workoutHistory', session?.user.id] });
      // So the "Previous" column shows this workout next time.
      await queryClient.invalidateQueries({ queryKey: ['exerciseHistory'] });
      await refresh();
      router.replace(`/(tabs)/workouts/log/${log.id}`);
    } catch {
      Alert.alert('Could not finish', 'Check your connection and try again.');
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
          try {
            await deleteWorkoutLog(log.id);
          } catch {
            Alert.alert('Could not delete', 'Check your connection and try again.');
            return;
          }
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

  // Saved sets plus the ones still waiting for signal.
  const pendingIds = new Set(pendingSets.map((p) => p.id));
  const exercises = log.exercises.map((le) => ({
    ...le,
    sets: [
      ...le.sets,
      ...pendingSets
        .filter((p) => p.logExerciseId === le.id && !savedSetIds.has(p.id))
        .map((p) => ({
          id: p.id,
          setNumber: p.setNumber,
          weightKg: p.weightKg,
          reps: p.reps,
          durationS: p.durationS,
          distanceM: p.distanceM,
          setType: p.setType === 'warmup' ? ('warmup' as const) : ('normal' as const),
        })),
    ],
  }));

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <AppText variant="heading">{log.name}</AppText>
        <View style={[styles.clockRow, setsHint.open === true && styles.clockRowWithHint]}>
          <ElapsedClock startedAt={log.startedAt} />
          <Pressable
            onPress={() => setsHint.setOpen(!setsHint.open)}
            hitSlop={14}
            accessibilityRole="button"
            accessibilityLabel="How sets are saved"
            accessibilityState={{ expanded: setsHint.open === true }}
          >
            {/* web key needed: without it SymbolView renders nothing on web */}
            <SymbolView
              name={{ ios: 'info.circle', android: 'info', web: 'info' }}
              tintColor={colors.primary}
              size={20}
            />
          </Pressable>
        </View>
        {setsHint.open === true && (
          <View style={styles.hint} accessibilityLiveRegion="polite">
            <AppText variant="small" style={styles.hintText}>
              Each set saves when you tick it. Tap the green tick again to change a set. You can leave and come
              back any time.
            </AppText>
            <Pressable
              onPress={() => setsHint.setOpen(false)}
              hitSlop={{ top: 14, bottom: 14, left: 17, right: 17 }}
              accessibilityRole="button"
              accessibilityLabel="Close tip"
            >
              <AppText variant="label" style={styles.hintClose}>
                ✕
              </AppText>
            </Pressable>
          </View>
        )}

        {exercises.map((logExercise) => {
          const target = template?.exercises.find((te) => te.exercise.id === logExercise.exercise.id);
          return (
            <ExerciseCard
              // Includes the exercise so a swap resets the card's local rows.
              key={`${logExercise.id}-${logExercise.exercise.id}`}
              logId={log.id}
              logExercise={logExercise}
              pendingIds={pendingIds}
              target={target}
              onChanged={refresh}
              onSetDone={() =>
                setRestEndsAt(Date.now() + (target?.restSeconds ?? defaultRest.seconds) * 1000)
              }
            />
          );
        })}

        <Button variant="secondary" title="+ Add Exercise" onPress={() => setPickerOpen(true)} />

        <Button
          variant="success"
          title="Finish Workout"
          onPress={handleFinish}
          loading={isFinishing}
          style={styles.finishButton}
        />

        <TextLink
          tone="danger"
          title="Discard Workout"
          onPress={handleDiscard}
          style={styles.discardLink}
        />

        <ExercisePicker
          visible={pickerOpen}
          onClose={() => setPickerOpen(false)}
          onSelect={async (exercise) => {
            const lastPosition = log.exercises.at(-1)?.position ?? -1;
            try {
              await addExerciseToLog({
                logId: log.id,
                exerciseId: exercise.id,
                position: lastPosition + 1,
              });
            } catch {
              Alert.alert('Could not add exercise', 'Check your connection and try again.');
              return;
            }
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
    <AppText variant="small" style={styles.subtitle}>
      {formatDuration((now - new Date(startedAt).getTime()) / 1000)} elapsed
    </AppText>
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
      <Pressable
        style={styles.restAdjust}
        onPress={() => onChange(endsAt - 15_000)}
        accessibilityRole="button"
        accessibilityLabel="15 seconds less rest"
      >
        <AppText variant="label" style={styles.restAdjustText}>−15</AppText>
      </Pressable>
      <View style={styles.restCenter}>
        <AppText variant="caption" style={styles.restLabel}>Rest</AppText>
        <AppText variant="title" style={styles.restTime}>
          {formatDuration(Math.ceil(remaining))}
        </AppText>
      </View>
      <Pressable
        style={styles.restAdjust}
        onPress={() => onChange(endsAt + 15_000)}
        accessibilityRole="button"
        accessibilityLabel="15 seconds more rest"
      >
        <AppText variant="label" style={styles.restAdjustText}>+15</AppText>
      </Pressable>
      <Pressable
        style={styles.restSkip}
        onPress={() => onChange(null)}
        accessibilityRole="button"
        accessibilityLabel="Skip rest"
      >
        <AppText variant="label" style={styles.restSkipText}>Skip</AppText>
      </Pressable>
    </View>
  );
}

// A set row not yet saved. a/b = kg/reps (strength) or min/km (cardio).
type DraftRow = { key: number; a: string; b: string; type: SetType };

let lastDraftKey = 0;
function newRow(a = '', b = '', type: SetType = 'normal'): DraftRow {
  lastDraftKey += 1;
  return { key: lastDraftKey, a, b, type };
}

function ExerciseCard({
  logId,
  logExercise,
  pendingIds,
  target,
  onChanged,
  onSetDone,
}: {
  logId: string;
  logExercise: WorkoutLogExercise;
  pendingIds: Set<string>;
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
  // Row types, done sets first then drafts; same order as the rows on screen.
  const types = [...doneSets.map((s) => s.setType), ...drafts.map((d) => d.type)];

  function suggestion(index: number): { a: number | null; b: number | null } {
    const prev = previous && matchingSet(previous.sets, types, index);
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

  async function handleDone(draft: DraftRow, index: number) {
    const s = suggestion(index);
    const a = toNumberOrNull(draft.a) ?? s.a;
    const b = toNumberOrNull(draft.b) ?? s.b;
    if (a == null && b == null) return;

    setSavingKey(draft.key);
    try {
      const payload = {
        id: newSetId(),
        logExerciseId: logExercise.id,
        setNumber: (lastDone?.setNumber ?? 0) + 1,
        weightKg: isCardio ? null : a,
        reps: isCardio ? null : b,
        durationS: isCardio && a != null ? Math.round(a * 60) : null,
        distanceM: isCardio && b != null ? b * 1000 : null,
        setType: isCardio ? ('normal' as const) : draft.type,
      };
      // No answer within 8 seconds counts as no signal. If the save did go through, sending
      // it again later is harmless (same id).
      let saved = true;
      try {
        await Promise.race([
          addSet(payload),
          new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 8000)),
        ]);
      } catch {
        saved = false;
        await queueSet({ ...payload, logId });
      }
      setDrafts((prev) => prev.filter((d) => d.key !== draft.key));
      if (saved) await onChanged();
      if (!isCardio) onSetDone();
    } finally {
      setSavingKey(null);
    }
  }

  // A set still waiting for signal is dropped from the phone; if it already reached the
  // database in the meantime, the delete below removes it there too.
  async function deleteSetEverywhere(set: WorkoutSet) {
    const wasPending = pendingIds.has(set.id);
    if (wasPending) await removePending(set.id);
    try {
      await deleteSet(set.id);
    } catch (e) {
      if (!wasPending) throw e;
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
    try {
      await deleteSetEverywhere(set);
    } catch {
      Alert.alert('Could not undo', 'Check your connection and try again.');
      return;
    }
    setDrafts((prev) => [newRow(a, b, set.setType), ...prev]);
    await onChanged();
  }

  function handleDeleteSet(set: WorkoutSet, label: string) {
    Alert.alert(label === 'W' ? 'Delete warm-up set?' : `Delete set ${label}?`, 'This set will be removed from the workout.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteSetEverywhere(set);
          } catch {
            Alert.alert('Could not delete', 'Check your connection and try again.');
            return;
          }
          await onChanged();
        },
      },
    ]);
  }

  async function handleSwap(exercise: Exercise) {
    // No sets yet: replace in place. Sets logged: keep them and add the new exercise below.
    try {
      if (doneSets.length === 0) {
        await swapLogExercise(logExercise.id, exercise.id);
      } else {
        await insertExerciseAfter({
          logId,
          afterPosition: logExercise.position,
          exerciseId: exercise.id,
        });
      }
    } catch {
      Alert.alert('Could not swap', 'Check your connection and try again.');
      return;
    }
    await onChanged();
  }

  async function handleRemoveExercise() {
    try {
      await removeExerciseFromLog(logExercise.id);
    } catch {
      Alert.alert('Could not remove', 'Check your connection and try again.');
      return;
    }
    await onChanged();
  }

  function previousText(index: number): string {
    const prev = previous && matchingSet(previous.sets, types, index);
    if (!prev) return '—';
    if (isCardio) {
      const parts = [];
      if (prev.durationS != null) parts.push(`${Math.round(prev.durationS / 60)}m`);
      if (prev.distanceM != null) parts.push(`${prev.distanceM / 1000}km`);
      return parts.join(' ') || '—';
    }
    return `${prev.weightKg ?? 0} × ${prev.reps ?? 0}`;
  }

  const targetParts =
    target && !isCardio
      ? [
          target.targetSets || target.targetReps
            ? `Target: ${target.targetSets ?? '?'} × ${target.targetReps ?? '?'}${
                target.targetWeightKg ? ` @ ${target.targetWeightKg} kg` : ''
              }`
            : null,
          target.restSeconds ? `🕐 Rest ${formatDuration(target.restSeconds)}` : null,
        ].filter(Boolean)
      : [];
  const targetText = targetParts.length ? targetParts.join(' · ') : null;

  const waitingCount = doneSets.filter((set) => pendingIds.has(set.id)).length;

  // 🏆 when a set so far beats everything from earlier workouts.
  const records = isCardio ? null : findNewRecords(doneSets, history ?? []);
  const nowBest = bestOf(doneSets);
  const recordText = records?.weight
    ? `🏆 New personal record: ${nowBest.weightKg} kg`
    : records?.oneRM
      ? `🏆 New estimated 1RM: ${Math.round(nowBest.oneRM)} kg`
      : records?.volume
        ? `🏆 New volume record: ${Math.round(setsVolume(doneSets))} kg`
        : null;

  const [labelA, labelB] = isCardio ? ['min', 'km'] : ['kg', 'reps'];
  const labels = setLabels(types);

  return (
    <Card style={styles.card}>
      <View style={styles.cardHeader}>
        <AppText variant="label" style={styles.cardTitle}>
          {logExercise.exercise.name}
        </AppText>
        <Pressable
          onPress={() => setSwapOpen(true)}
          hitSlop={headerHitSlop}
          accessibilityRole="button"
          accessibilityLabel={`Swap ${logExercise.exercise.name}`}
        >
          <AppText style={styles.swapText}>⇄ Swap</AppText>
        </Pressable>
        {doneSets.length === 0 ? (
          <Pressable
            onPress={handleRemoveExercise}
            hitSlop={headerHitSlop}
            accessibilityRole="button"
            accessibilityLabel={`Remove ${logExercise.exercise.name}`}
          >
            <AppText style={styles.removeText}>Remove</AppText>
          </Pressable>
        ) : null}
      </View>
      {targetText ? (
        <AppText variant="small" style={styles.targetText}>
          {targetText}
        </AppText>
      ) : null}
      {waitingCount > 0 ? (
        <AppText variant="caption" style={styles.waitingText}>
          {waitingCount} set{waitingCount === 1 ? '' : 's'} saved on your phone, sending when
          there is signal
        </AppText>
      ) : null}
      {recordText ? (
        <AppText variant="labelSmall" style={styles.recordText}>
          {recordText}
        </AppText>
      ) : null}

      <View style={styles.tableHeader}>
        <AppText variant="caption" style={styles.colSet}>Set</AppText>
        <AppText variant="caption" style={styles.colPrev}>Previous</AppText>
        <AppText variant="caption" style={styles.colInput}>{labelA}</AppText>
        <AppText variant="caption" style={styles.colInput}>{labelB}</AppText>
        <View style={styles.colCheck} />
        <View style={styles.colRemove} />
      </View>

      {doneSets.map((set, index) => (
        <View key={set.id} style={[styles.row, styles.rowDone]}>
          <AppText
            variant="label"
            style={[styles.colSet, set.setType === 'warmup' && styles.warmupText]}
          >
            {labels[index]}
          </AppText>
          <AppText variant="small" style={[styles.prevDone, styles.colPrev]}>
            {previousText(index)}
          </AppText>
          <AppText style={[styles.doneValue, styles.colInput]}>
            {isCardio
              ? set.durationS != null ? Math.round(set.durationS / 60) : '—'
              : (set.weightKg ?? '—')}
          </AppText>
          <AppText style={[styles.doneValue, styles.colInput]}>
            {isCardio
              ? set.distanceM != null ? set.distanceM / 1000 : '—'
              : (set.reps ?? '—')}
          </AppText>
          <Pressable style={[styles.check, styles.checkDone]} onPress={() => handleUndo(set)}>
            <Text style={styles.checkDoneText}>✓</Text>
          </Pressable>
          <Pressable style={styles.colRemove} onPress={() => handleDeleteSet(set, labels[index])} hitSlop={6}>
            <AppText style={styles.removeSetText}>✕</AppText>
          </Pressable>
        </View>
      ))}

      {drafts.map((draft, i) => {
        const index = doneSets.length + i;
        const s = suggestion(index);
        const warmup = draft.type === 'warmup';
        const label = labels[index];
        return (
          <View key={draft.key} style={styles.row}>
            {isCardio ? (
              <AppText variant="label" style={styles.colSet}>{label}</AppText>
            ) : (
              <Pressable
                style={styles.colSet}
                onPress={() => updateDraft(draft.key, { type: warmup ? 'normal' : 'warmup' })}
                hitSlop={6}
                accessibilityRole="button"
                accessibilityLabel={`Set ${label}, ${warmup ? 'warm-up' : 'working set'}`}
                accessibilityHint={warmup ? 'Tap to make it a working set' : 'Tap to mark as warm-up'}
              >
                <AppText variant="label" style={[styles.setBadge, warmup && styles.warmupText]}>
                  {label}
                </AppText>
              </Pressable>
            )}
            <AppText variant="small" style={styles.colPrev}>{previousText(index)}</AppText>
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
              onPress={() => handleDone(draft, index)}
              disabled={savingKey != null}
            >
              {savingKey === draft.key ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Text style={styles.checkText}>✓</Text>
              )}
            </Pressable>
            <Pressable
              style={styles.colRemove}
              onPress={() => setDrafts((prev) => prev.filter((d) => d.key !== draft.key))}
              hitSlop={6}
            >
              <AppText style={styles.removeSetText}>✕</AppText>
            </Pressable>
          </View>
        );
      })}

      <Pressable
        style={styles.addSetButton}
        accessibilityRole="button"
        accessibilityLabel={`Add set to ${logExercise.exercise.name}`}
        onPress={() => {
          const last = drafts.at(-1);
          setDrafts((prev) => [...prev, newRow(last?.a, last?.b, last?.type)]);
        }}
      >
        <AppText variant="label" style={styles.addSetText}>+ Add set</AppText>
      </Pressable>

      <SwapExercisePicker
        current={logExercise.exercise}
        visible={swapOpen}
        onClose={() => setSwapOpen(false)}
        onSelect={handleSwap}
      />
    </Card>
  );
}

// Swap and Remove sit 12 apart, so the side slop stays small (48 dp tall tap area).
const headerHitSlop = { top: 13, bottom: 13, left: 6, right: 6 };

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  subtitle: { color: colors.textSecondary },
  clockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
  },
  clockRowWithHint: { marginBottom: spacing.sm },
  hint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.primaryBg,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  hintText: { flex: 1, color: colors.text },
  hintClose: { color: colors.textSecondary },
  card: { padding: spacing.md, gap: 0, marginBottom: spacing.md },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  cardTitle: { flex: 1 },
  swapText: { color: colors.primary },
  removeText: { color: colors.danger },
  waitingText: { color: colors.warning, marginBottom: spacing.sm },
  recordText: { color: colors.warning, marginBottom: spacing.sm },
  targetText: { marginTop: spacing.xs },
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
  },
  rowDone: { backgroundColor: colors.successBg },
  colSet: { width: 28, textAlign: 'center' },
  colPrev: { flex: 1.4, textAlign: 'center' },
  colInput: { flex: 1, textAlign: 'center' },
  colCheck: { width: 36 },
  colRemove: { width: 28, height: 36, alignItems: 'center', justifyContent: 'center' },
  removeSetText: { color: colors.muted },
  // Looks tappable: the set number toggles warm-up on unticked strength rows.
  setBadge: {
    textAlign: 'center',
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    backgroundColor: colors.border,
    overflow: 'hidden',
  },
  warmupText: { color: colors.warningText },
  // muted is too faint on the green done row.
  prevDone: { color: colors.textSecondary },
  doneValue: { paddingVertical: spacing.sm },
  input: {
    ...typography.body,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.sm,
    paddingVertical: spacing.sm,
  },
  check: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    backgroundColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // icon glyph, not text
  checkText: { fontSize: 18, color: colors.muted, fontWeight: '700' },
  checkDone: { backgroundColor: colors.success },
  // icon glyph, not text
  checkDoneText: { fontSize: 18, color: colors.onPrimary, fontWeight: '700' },
  addSetButton: {
    alignItems: 'center',
    minHeight: 48,
    justifyContent: 'center',
    marginTop: spacing.xs,
  },
  addSetText: { color: colors.primary },
  finishButton: { marginTop: spacing.xl },
  discardLink: { marginTop: spacing.md },
  restBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.text,
  },
  restCenter: { flex: 1, alignItems: 'center' },
  restLabel: { color: colors.subtle },
  restTime: { color: colors.onPrimary },
  restAdjust: {
    minHeight: 48,
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.textSecondary,
  },
  restAdjustText: { color: colors.onPrimary },
  restSkip: {
    minHeight: 48,
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  restSkipText: { color: colors.primaryLight },
});
