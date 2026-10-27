import { useQueries, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { AppText } from '../../../../components/AppText';
import { Button } from '../../../../components/Button';
import { Card } from '../../../../components/Card';
import { Chips } from '../../../../components/Chips';
import { LabeledInput } from '../../../../components/LabeledInput';
import { TextLink } from '../../../../components/TextLink';
import { SupersetFrame } from '../../../../components/workouts/SupersetFrame';
import { useSession } from '../../../../context/AuthProvider';
import { useWorkoutHistory, useWorkoutLog } from '../../../../hooks/useWorkouts';
import { DATE_LOCALE } from '../../../../lib/dateUtils';
import { toNumberOrNull } from '../../../../lib/numbers';
import {
  bestOf,
  bestOfSessions,
  dropGroups,
  findNewRecords,
  setLabels,
  setsVolume,
  supersetRoles,
} from '../../../../lib/records';
import {
  deleteSet,
  deleteWorkoutLog,
  formatSet,
  getExerciseHistory,
  updateSet,
} from '../../../../lib/workouts';
import { colors, radius, spacing } from '../../../../theme';
import type { SetType, WorkoutSet } from '../../../../types/domain';

function logVolume(exercises: { sets: WorkoutSet[] }[]) {
  return exercises.reduce((sum, e) => sum + setsVolume(e.sets), 0);
}

const TYPES: SetType[] = ['normal', 'warmup', 'drop'];

export default function WorkoutSummary() {
  const { logId } = useLocalSearchParams<{ logId: string }>();
  const { session } = useSession();
  const queryClient = useQueryClient();
  const { data: log, isLoading } = useWorkoutLog(logId);
  const userId = session?.user.id;
  // The set being edited in the popup; a/b are kg/reps, or min/km for cardio.
  const [editing, setEditing] = useState<{ set: WorkoutSet; cardio: boolean; label: string } | null>(
    null
  );
  const [a, setA] = useState('');
  const [b, setB] = useState('');
  const [type, setType] = useState<SetType>('normal');
  const [saving, setSaving] = useState(false);
  // Both boxes empty would save a blank "0 kg × 0" set; Delete set is for that.
  const isEmptySet = a.trim() === '' && b.trim() === '';

  // Earlier completed workouts of each exercise, to find new records.
  const histories = useQueries({
    queries: (log?.exercises ?? []).map((e) => ({
      queryKey: ['exerciseHistory', userId, e.exercise.id],
      queryFn: () => getExerciseHistory(userId as string, e.exercise.id),
      enabled: !!userId,
    })),
  });

  // The workout before this one from the same routine (or with the same name).
  const { data: history } = useWorkoutHistory();
  const previousId = log
    ? history?.find(
        (h) =>
          h.id !== log.id &&
          h.completedAt &&
          h.startedAt < log.startedAt &&
          h.name === log.name
      )?.id
    : undefined;
  const { data: previousLog } = useWorkoutLog(previousId);

  if (isLoading || !log) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  const durationMin = log.completedAt
    ? Math.round((new Date(log.completedAt).getTime() - new Date(log.startedAt).getTime()) / 60_000)
    : null;
  // A drop set counts as one set.
  const totalSets = log.exercises.reduce(
    (sum, e) => sum + e.sets.filter((s) => s.setType !== 'drop').length,
    0
  );
  const volumeKg = logVolume(log.exercises);
  const volumeDiff = previousLog ? Math.round(volumeKg - logVolume(previousLog.exercises)) : null;

  const highlights = log.exercises.flatMap((e, i) => {
    if (e.exercise.category === 'cardio') return [];
    const earlier = (histories[i]?.data ?? []).filter(
      (h) => h.logId !== log.id && h.startedAt < log.startedAt
    );
    const records = findNewRecords(e.sets, earlier);
    if (!records.weight && !records.oneRM) return [];
    const now = bestOf(e.sets);
    const before = bestOfSessions(earlier);
    return [
      records.weight
        ? `${e.exercise.name}: ${now.weightKg} kg (was ${before.weightKg} kg)`
        : `${e.exercise.name}: est. 1RM ${Math.round(now.oneRM)} kg (was ${Math.round(before.oneRM)} kg)`,
    ];
  });

  const roles = supersetRoles(log.exercises.map((e) => e.supersetWithNext));

  function openEdit(set: WorkoutSet, cardio: boolean, label: string) {
    setEditing({ set, cardio, label });
    setType(set.setType);
    if (cardio) {
      setA(set.durationS != null ? String(Math.round(set.durationS / 60)) : '');
      setB(set.distanceM != null ? String(set.distanceM / 1000) : '');
    } else {
      setA(set.weightKg != null ? String(set.weightKg) : '');
      setB(set.reps != null ? String(set.reps) : '');
    }
  }

  async function refreshAfterEdit() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['workoutLog', logId] }),
      queryClient.invalidateQueries({ queryKey: ['exerciseHistory', userId] }),
    ]);
    setEditing(null);
  }

  async function handleSaveSet() {
    if (!editing) return;
    const x = toNumberOrNull(a);
    const y = toNumberOrNull(b);
    setSaving(true);
    try {
      await updateSet(
        editing.set.id,
        editing.cardio
          ? {
              weightKg: null,
              reps: null,
              durationS: x != null ? Math.round(x * 60) : null,
              distanceM: y != null ? y * 1000 : null,
              setType: 'normal',
            }
          : {
              weightKg: x,
              reps: y != null ? Math.round(y) : null,
              durationS: null,
              distanceM: null,
              setType: type,
            }
      );
      await refreshAfterEdit();
    } catch {
      Alert.alert('Could not save', 'Check your connection and try again.');
    } finally {
      setSaving(false);
    }
  }

  function handleDeleteSet() {
    if (!editing) return;
    const { set, label } = editing;
    Alert.alert(label === 'W' ? 'Delete warm-up set?' : `Delete set ${label}?`, undefined, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteSet(set.id);
          } catch {
            Alert.alert('Could not delete', 'Check your connection and try again.');
            return;
          }
          await refreshAfterEdit();
        },
      },
    ]);
  }

  function handleDelete() {
    if (!log) return;
    Alert.alert('Delete workout?', 'This removes it from your history.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteWorkoutLog(log.id);
          } catch {
            Alert.alert('Could not delete', 'Check your connection and try again.');
            return;
          }
          await queryClient.invalidateQueries({ queryKey: ['workoutHistory', session?.user.id] });
          router.dismissTo('/(tabs)/workouts');
        },
      },
    ]);
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <AppText variant="heading">{log.name}</AppText>
      <AppText variant="small" style={styles.subtitle}>
        {new Date(log.startedAt).toLocaleString(DATE_LOCALE, {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })}
      </AppText>
      {log.notes ? (
        <AppText variant="small" style={styles.subtitle}>
          Note: {log.notes}
        </AppText>
      ) : null}

      <Card style={styles.statsCard}>
        <Stat label="Minutes" value={durationMin != null ? String(durationMin) : '–'} />
        <Stat label="Sets" value={String(totalSets)} />
        <Stat label="Volume (kg)" value={String(Math.round(volumeKg))} />
      </Card>

      {volumeDiff != null ? (
        <AppText variant="small" style={styles.compareText}>
          Volume {volumeDiff >= 0 ? '+' : '−'}
          {Math.abs(volumeDiff)} kg vs last time
        </AppText>
      ) : null}

      {highlights.length > 0 ? (
        <View style={styles.highlights}>
          <AppText variant="label" style={styles.highlightsTitle}>
            🏆 New records
          </AppText>
          {highlights.map((h) => (
            <AppText key={h} variant="small" style={styles.highlightText}>
              {h}
            </AppText>
          ))}
        </View>
      ) : null}

      {log.exercises.map((e, index) => {
        const types = e.sets.map((s) => s.setType);
        const labels = setLabels(types);
        return (
          <SupersetFrame key={e.id} role={roles[index]} spaceBelow={spacing.md}>
            <Card style={styles.exercise}>
              <AppText variant="label" style={styles.exerciseName}>
                {e.exercise.name}
              </AppText>
              {e.sets.length === 0 ? (
                <AppText variant="small">No sets</AppText>
              ) : (
                // One line per set; a drop set's steps share the line and each step taps on its own.
                dropGroups(types).map((group) => {
                  const head = labels[group[0]] === 'W' ? 'Warm-up' : `Set ${labels[group[0]]}`;
                  return (
                    <View key={e.sets[group[0]].id} style={styles.setLine}>
                      <AppText style={styles.setText} importantForAccessibility="no">
                        {head}:
                      </AppText>
                      {group.map((i, n) => {
                        const set = e.sets[i];
                        return (
                          <Pressable
                            key={set.id}
                            style={styles.setRow}
                            onPress={() => openEdit(set, e.exercise.category === 'cardio', labels[i])}
                            accessibilityRole="button"
                            accessibilityLabel={
                              set.setType === 'drop' ? `Drop step, ${formatSet(set)}` : `${head}: ${formatSet(set)}`
                            }
                            accessibilityHint="Edit set"
                          >
                            <AppText style={styles.setText}>
                              {n > 0 ? '↓ ' : ''}
                              {formatSet(set)}
                              {n === group.length - 1 ? <Text style={styles.editHint}> ✎</Text> : null}
                            </AppText>
                          </Pressable>
                        );
                      })}
                    </View>
                  );
                })
              )}
            </Card>
          </SupersetFrame>
        );
      })}

      <Modal
        visible={editing != null}
        transparent
        animationType="fade"
        onRequestClose={() => setEditing(null)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setEditing(null)}>
          <Pressable>
            <Card>
              <AppText variant="label">
                {editing?.label === 'W' ? 'Edit warm-up set' : `Edit set ${editing?.label}`}
              </AppText>
              {editing && !editing.cardio ? (
                <Chips
                  labels={['Normal', 'Warm-up', 'Drop']}
                  selected={TYPES.indexOf(type)}
                  onSelect={(i) => setType(TYPES[i])}
                />
              ) : null}
              <LabeledInput
                label={editing?.cardio ? 'Minutes' : 'Weight (kg)'}
                value={a}
                onChangeText={setA}
                keyboardType="numeric"
              />
              <LabeledInput
                label={editing?.cardio ? 'Distance (km)' : 'Reps'}
                value={b}
                onChangeText={setB}
                keyboardType="numeric"
              />
              <Button title="Save" onPress={handleSaveSet} loading={saving} disabled={isEmptySet} />
              <TextLink tone="danger" title="Delete set" onPress={handleDeleteSet} disabled={saving} />
            </Card>
          </Pressable>
        </Pressable>
      </Modal>

      <Button
        title="Done"
        onPress={() => router.dismissTo('/(tabs)/workouts')}
        style={styles.doneButton}
      />

      <TextLink
        tone="danger"
        title="Delete Workout"
        onPress={handleDelete}
        style={styles.deleteLink}
      />
    </ScrollView>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <AppText variant="title">{value}</AppText>
      <AppText variant="caption" style={styles.statLabel}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  subtitle: { color: colors.textSecondary, marginTop: spacing.xs },
  statsCard: { flexDirection: 'row', gap: 0, marginVertical: spacing.xl },
  compareText: { color: colors.textSecondary, textAlign: 'center', marginBottom: spacing.lg },
  highlights: {
    backgroundColor: colors.warningBg,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.xl,
  },
  highlightsTitle: { marginBottom: spacing.sm },
  highlightText: { color: colors.warningText, paddingVertical: spacing.xs },
  stat: { flex: 1, alignItems: 'center' },
  statLabel: { color: colors.textSecondary, marginTop: spacing.xs },
  exercise: { gap: 0 },
  exerciseName: { marginBottom: spacing.xs },
  setLine: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: spacing.xs },
  setRow: { minHeight: 48, justifyContent: 'center' },
  setText: { color: colors.textSecondary },
  editHint: { color: colors.subtle },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  doneButton: { marginTop: spacing.sm },
  deleteLink: { marginTop: spacing.md },
});
