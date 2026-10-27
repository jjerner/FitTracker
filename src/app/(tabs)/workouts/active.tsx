import { useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Keyboard,
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
import { LabeledInput } from '../../../components/LabeledInput';
import { TextLink } from '../../../components/TextLink';
import { ExercisePicker } from '../../../components/workouts/ExercisePicker';
import { SupersetFrame } from '../../../components/workouts/SupersetFrame';
import { SwapExercisePicker } from '../../../components/workouts/SwapExercisePicker';
import { useSession } from '../../../context/AuthProvider';
import { useDefaultRest } from '../../../hooks/useDefaultRest';
import { useRestVibration } from '../../../hooks/useRestVibration';
import { useSetsHint } from '../../../hooks/useSetsHint';
import {
  useExerciseHistory,
  useExerciseNotes,
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
  saveExerciseNote,
  saveWorkoutNote,
  setLogSuperset,
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
import {
  bestOf,
  findNewRecords,
  matchingSet,
  nextSetType,
  setLabels,
  setsVolume,
  shownSets,
  supersetRoles,
  withDrops,
} from '../../../lib/records';
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
  // Workout note being typed; null = not touched yet, so the saved one shows.
  const [note, setNote] = useState<string | null>(null);
  const noteChanged = note != null && note.trim() !== (log?.notes ?? '');

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
    // A tap on Finish doesn't blur a focused box on Android; dismissing starts its blur save.
    Keyboard.dismiss();
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
      // So the summary shows a note typed without leaving the box first.
      if (noteChanged) await saveWorkoutNote(log.id, note);
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

  async function handleNoteBlur() {
    if (!log || !noteChanged) return;
    try {
      await saveWorkoutNote(log.id, note);
    } catch {
      Alert.alert('Could not save note', 'Check your connection and try again.');
      return;
    }
    await refresh();
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
          setType: p.setType ?? 'normal',
        })),
    ],
  }));
  const roles = supersetRoles(exercises.map((e) => e.supersetWithNext));

  async function handleUnlink(first: WorkoutLogExercise) {
    try {
      await setLogSuperset(first.id, false);
    } catch {
      Alert.alert('Could not unlink', 'Check your connection and try again.');
      return;
    }
    await refresh();
  }

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

        <LabeledInput
          label="Workout note"
          multiline
          maxLength={500}
          value={note ?? log.notes ?? ''}
          onChangeText={setNote}
          onBlur={handleNoteBlur}
        />

        {exercises.map((logExercise, index) => {
          const target = template?.exercises.find((te) => te.exercise.id === logExercise.exercise.id);
          const next = exercises[index + 1];
          return (
            <SupersetFrame
              // Includes the exercise so a swap resets the card's local rows.
              key={`${logExercise.id}-${logExercise.exercise.id}`}
              role={roles[index]}
              spaceBelow={spacing.md}
              onUnlink={() => handleUnlink(logExercise)}
              unlinkLabel={`Unlink ${logExercise.exercise.name} and ${next?.exercise.name}`}
            >
              <ExerciseCard
                logId={log.id}
                logExercise={logExercise}
                pendingIds={pendingIds}
                target={target}
                pairedWithNext={roles[index] === 'first'}
                pairFirst={roles[index] === 'second' ? exercises[index - 1] : undefined}
                canLink={roles[index] == null && next != null && roles[index + 1] == null}
                nextName={next?.exercise.name}
                onChanged={refresh}
                onSetDone={() =>
                  setRestEndsAt(Date.now() + (target?.restSeconds ?? defaultRest.seconds) * 1000)
                }
              />
            </SupersetFrame>
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
  pairedWithNext,
  pairFirst,
  canLink,
  nextName,
  onChanged,
  onSetDone,
}: {
  logId: string;
  logExercise: WorkoutLogExercise;
  pendingIds: Set<string>;
  target: WorkoutTemplateExercise | undefined;
  // First card of a superset: its sets start no rest.
  pairedWithNext: boolean;
  // The card above, when this one is the second card of a superset.
  pairFirst: WorkoutLogExercise | undefined;
  canLink: boolean;
  nextName: string | undefined;
  onChanged: () => Promise<void>;
  onSetDone: () => void;
}) {
  const isCardio = logExercise.exercise.category === 'cardio';
  // Sets ticked / deleted here, shown at once instead of waiting for the reloaded log.
  const [addedSets, setAddedSets] = useState<WorkoutSet[]>([]);
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());
  const doneSets = shownSets(logExercise.sets, addedSets, hiddenIds);
  const lastDone = doneSets.at(-1);
  const { data: history } = useExerciseHistory(logExercise.exercise.id);
  const { session } = useSession();
  const userId = session?.user.id;
  const queryClient = useQueryClient();
  const { data: notes, isLoading: notesLoading } = useExerciseNotes();
  const savedNote = notes?.[logExercise.exercise.id];
  // Note being edited; null = not editing.
  const [noteDraft, setNoteDraft] = useState<string | null>(null);
  // History only has completed workouts, so [0] is the last time before this one.
  const previous = history?.[0];

  // Start with the template's remaining sets, or one empty row.
  const [drafts, setDrafts] = useState<DraftRow[]>(() => {
    const count = Math.max((target?.targetSets ?? 0) - doneSets.length, doneSets.length ? 0 : 1);
    return Array.from({ length: count }, () => newRow());
  });
  const [savingKey, setSavingKey] = useState<number | null>(null);
  // Un-tick runs several deletes; a second tap meanwhile would bring the rows back twice.
  const [undoing, setUndoing] = useState(false);
  const [swapOpen, setSwapOpen] = useState(false);
  const [linking, setLinking] = useState(false);

  // Suggested values shown greyed out; used when the input is left empty.
  // Row types, done sets first then drafts; same order as the rows on screen.
  const doneTypes = doneSets.map((s) => s.setType);
  const types = [...doneTypes, ...drafts.map((d) => d.type)];

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

  // No answer within 8 seconds counts as no signal. If the save did go through, sending
  // it again later is harmless (same id).
  async function save(payload: Parameters<typeof addSet>[0]): Promise<boolean> {
    try {
      await Promise.race([
        addSet(payload),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 8000)),
      ]);
      return true;
    } catch {
      await queueSet({ ...payload, logId });
      return false;
    }
  }

  // Saves the row and the ↓ rows below it, top first, as one drop set.
  async function handleDone(draft: DraftRow, index: number) {
    const rows = withDrops(types, index).map((j) => {
      const d = drafts[j - doneSets.length];
      const s = suggestion(j);
      return { d, a: toNumberOrNull(d.a) ?? s.a, b: toNumberOrNull(d.b) ?? s.b };
    });
    if (rows[0].a == null && rows[0].b == null) return;

    setSavingKey(draft.key);
    try {
      const lastNumber = lastDone?.setNumber ?? 0;
      // An empty ↓ row with no suggestion is not saved, just removed with the group.
      const payloads = rows
        .filter((r) => r.a != null || r.b != null)
        .map(({ d, a, b }, n) => ({
          id: newSetId(),
          logExerciseId: logExercise.id,
          setNumber: lastNumber + n + 1,
          weightKg: isCardio ? null : a,
          reps: isCardio ? null : b,
          durationS: isCardio && a != null ? Math.round(a * 60) : null,
          distanceM: isCardio && b != null ? b * 1000 : null,
          setType: isCardio ? ('normal' as const) : d.type,
        }));
      // Once one row is queued, queue the rest too: one 8 s wait, and the order holds.
      let anySaved = false;
      let queued = false;
      for (const payload of payloads) {
        if (queued) await queueSet({ ...payload, logId });
        else if (await save(payload)) anySaved = true;
        else queued = true;
      }
      const keys = new Set(rows.map((r) => r.d.key));
      setDrafts((prev) => prev.filter((d) => !keys.has(d.key)));
      setAddedSets((prev) => [
        ...prev,
        ...payloads.map(({ id, setNumber, weightKg, reps, durationS, distanceM, setType }) => ({
          id, setNumber, weightKg, reps, durationS, distanceM, setType,
        })),
      ]);
      if (anySaved) await onChanged();
      // No rest after the first exercise of a superset.
      if (!isCardio && !pairedWithNext) onSetDone();
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

  // Un-ticking a set (and its ↓ rows) deletes it but keeps its numbers in rows to redo.
  async function handleUndo(index: number) {
    setUndoing(true);
    const group = withDrops(doneTypes, index).map((j) => doneSets[j]);
    // Bottom up: if a delete fails, what stays done is the top of the group.
    const deleted: WorkoutSet[] = [];
    for (const set of [...group].reverse()) {
      try {
        await deleteSetEverywhere(set);
      } catch {
        Alert.alert('Could not undo', 'Check your connection and try again.');
        break;
      }
      deleted.unshift(set);
    }
    setUndoing(false);
    if (!deleted.length) return;
    const rows = deleted.map((set) => {
      const a = isCardio
        ? set.durationS != null ? String(Math.round(set.durationS / 60)) : ''
        : set.weightKg?.toString() ?? '';
      const b = isCardio
        ? set.distanceM != null ? String(set.distanceM / 1000) : ''
        : set.reps?.toString() ?? '';
      return newRow(a, b, set.setType);
    });
    setDrafts((prev) => [...rows, ...prev]);
    setHiddenIds((prev) => new Set([...prev, ...deleted.map((set) => set.id)]));
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
          setHiddenIds((prev) => new Set(prev).add(set.id));
          await onChanged();
        },
      },
    ]);
  }

  async function handleSwap(exercise: Exercise) {
    // No sets yet: replace in place. Sets logged: keep them and add the new exercise below.
    // In a superset the new exercise takes the old one's place, and the old one leaves with its sets.
    try {
      if (doneSets.length === 0) {
        await swapLogExercise(logExercise.id, exercise.id);
      } else if (pairFirst) {
        await insertExerciseAfter({ logId, afterPosition: pairFirst.position, exerciseId: exercise.id });
      } else {
        await insertExerciseAfter({
          logId,
          afterPosition: logExercise.position,
          exerciseId: exercise.id,
          supersetWithNext: pairedWithNext,
        });
        if (pairedWithNext) await setLogSuperset(logExercise.id, false);
      }
    } catch {
      Alert.alert('Could not swap', 'Check your connection and try again.');
    }
    // Also after an error: the new exercise may already be in.
    await onChanged();
  }

  async function handleRemoveExercise() {
    try {
      // Otherwise the card above would pair with the next card.
      if (pairFirst) await setLogSuperset(pairFirst.id, false);
      await removeExerciseFromLog(logExercise.id);
    } catch {
      Alert.alert('Could not remove', 'Check your connection and try again.');
    }
    // Also after a failure: the unlink above may have gone through.
    await onChanged();
  }

  async function handleLink() {
    setLinking(true);
    try {
      await setLogSuperset(logExercise.id, true);
    } catch {
      Alert.alert('Could not link', 'Check your connection and try again.');
    } finally {
      setLinking(false);
    }
    await onChanged();
  }

  async function handleNoteBlur() {
    if (noteDraft == null || !userId) return;
    if (noteDraft.trim() === (savedNote ?? '')) {
      setNoteDraft(null);
      return;
    }
    try {
      await saveExerciseNote(userId, logExercise.exercise.id, noteDraft);
    } catch {
      Alert.alert('Could not save note', 'Check your connection and try again.');
      return;
    }
    // Wait for the new note so the old one doesn't flash back.
    await queryClient.invalidateQueries({ queryKey: ['exerciseNotes', userId] });
    setNoteDraft(null);
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
      {noteDraft != null ? (
        <LabeledInput
          label="Note"
          placeholder="e.g. Seat at 4"
          multiline
          autoFocus
          maxLength={200}
          value={noteDraft}
          onChangeText={setNoteDraft}
          onBlur={handleNoteBlur}
        />
      ) : notesLoading ? null : savedNote ? (
        <Pressable
          hitSlop={headerHitSlop}
          onPress={() => setNoteDraft(savedNote)}
          accessibilityRole="button"
          accessibilityHint="Edit note"
        >
          <AppText variant="small">Note: {savedNote}</AppText>
        </Pressable>
      ) : (
        <Pressable
          style={styles.addNote}
          onPress={() => setNoteDraft('')}
          hitSlop={headerHitSlop}
          accessibilityRole="button"
          accessibilityLabel={`Add note to ${logExercise.exercise.name}`}
        >
          <AppText style={styles.swapText}>+ Note</AppText>
        </Pressable>
      )}
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
        <View key={set.id} style={[styles.row, styles.rowDone, set.setType === 'drop' && styles.rowDrop]}>
          <AppText
            variant="label"
            style={[styles.colSet, set.setType !== 'normal' && styles.warmupText]}
            accessibilityLabel={set.setType === 'drop' ? 'Drop step' : undefined}
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
          {set.setType === 'drop' ? (
            <View style={styles.colCheck} />
          ) : (
            <Pressable
              style={[styles.check, styles.checkDone]}
              onPress={() => handleUndo(index)}
              disabled={undoing || savingKey != null}
              accessibilityState={{ disabled: undoing || savingKey != null }}
              accessibilityRole="button"
              accessibilityLabel={`Set ${labels[index]} done`}
              accessibilityHint={
                withDrops(doneTypes, index).length > 1
                  ? `Tap to undo set ${labels[index]} and its drop steps`
                  : 'Tap to undo'
              }
            >
              <Text style={styles.checkDoneText}>✓</Text>
            </Pressable>
          )}
          <Pressable style={styles.colRemove} onPress={() => handleDeleteSet(set, labels[index])} hitSlop={6}>
            <AppText style={styles.removeSetText}>✕</AppText>
          </Pressable>
        </View>
      ))}

      {drafts.map((draft, i) => {
        const index = doneSets.length + i;
        const s = suggestion(index);
        const type = draft.type;
        const next = nextSetType(types, index);
        const label = labels[index];
        return (
          <View key={draft.key} style={[styles.row, type === 'drop' && styles.rowDrop]}>
            {isCardio ? (
              <AppText variant="label" style={styles.colSet}>{label}</AppText>
            ) : (
              <Pressable
                style={styles.colSet}
                onPress={() => updateDraft(draft.key, { type: next })}
                // ↓ rows sit tight against the row above, so their badges must not share tap area.
                hitSlop={{
                  top: type === 'drop' ? 0 : 6,
                  bottom: types[index + 1] === 'drop' ? 0 : 6,
                  left: 6,
                  right: 6,
                }}
                accessibilityRole="button"
                accessibilityLabel={
                  type === 'drop' ? 'Drop step' : `Set ${label}, ${type === 'warmup' ? 'warm-up' : 'working set'}`
                }
                accessibilityHint={
                  next === 'warmup'
                    ? 'Tap to mark as warm-up'
                    : next === 'drop'
                      ? 'Tap to make it a drop step'
                      : 'Tap to make it a working set'
                }
              >
                <AppText variant="label" style={[styles.setBadge, type !== 'normal' && styles.warmupText]}>
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
            {/* Only the top row of a drop set has a ✓; a ↓ row gets one when the row above is done. */}
            {type === 'drop' && !(i === 0 && doneSets.length > 0) ? (
              <View style={styles.colCheck} />
            ) : (
              <Pressable
                style={styles.check}
                onPress={() => handleDone(draft, index)}
                disabled={savingKey != null}
                accessibilityRole="button"
                accessibilityLabel={type === 'drop' ? 'Mark drop step done' : `Mark set ${label} done`}
                accessibilityHint={withDrops(types, index).length > 1 ? 'Also saves its drop steps' : undefined}
                accessibilityState={savingKey === draft.key ? { busy: true } : { disabled: savingKey != null }}
              >
                {savingKey === draft.key ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Text style={styles.checkText}>✓</Text>
                )}
              </Pressable>
            )}
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
          // After a drop step the next row is usually a new set, so start it empty; tap its badge for another ↓.
          setDrafts((prev) => [...prev, last?.type === 'drop' ? newRow() : newRow(last?.a, last?.b, last?.type)]);
        }}
      >
        <AppText variant="label" style={styles.addSetText}>+ Add set</AppText>
      </Pressable>
      {canLink ? (
        <TextLink
          title="⛓ Superset with next"
          onPress={handleLink}
          disabled={linking}
          accessibilityLabel={`Superset ${logExercise.exercise.name} with ${nextName}`}
          style={styles.supersetLink}
        />
      ) : null}

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
  card: { padding: spacing.md, gap: 0 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  cardTitle: { flex: 1 },
  swapText: { color: colors.primary },
  removeText: { color: colors.danger },
  addNote: { alignSelf: 'flex-start' },
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
  // A drop step sits tight under the set it belongs to.
  rowDrop: { paddingTop: 0 },
  colSet: { width: 28, textAlign: 'center' },
  colPrev: { flex: 1.4, textAlign: 'center' },
  colInput: { flex: 1, textAlign: 'center' },
  colCheck: { width: 36 },
  colRemove: { width: 28, height: 36, alignItems: 'center', justifyContent: 'center' },
  removeSetText: { color: colors.muted },
  // Looks tappable: the set number cycles 1 → W → ↓ on unticked strength rows.
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
  supersetLink: { alignSelf: 'flex-start', paddingHorizontal: 0 },
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
