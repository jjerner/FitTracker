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

import { LabeledInput } from '../../../../components/LabeledInput';
import { useSession } from '../../../../context/AuthProvider';
import { useWorkoutHistory, useWorkoutLog } from '../../../../hooks/useWorkouts';
import { toNumberOrNull } from '../../../../lib/numbers';
import { bestOf, bestOfSessions, findNewRecords } from '../../../../lib/records';
import {
  deleteSet,
  deleteWorkoutLog,
  formatSet,
  getExerciseHistory,
  updateSet,
} from '../../../../lib/workouts';
import { colors } from '../../../../theme';
import type { WorkoutSet } from '../../../../types/domain';

function logVolume(exercises: { sets: { weightKg: number | null; reps: number | null }[] }[]) {
  return exercises.reduce(
    (sum, e) => sum + e.sets.reduce((s, set) => s + (set.weightKg ?? 0) * (set.reps ?? 0), 0),
    0
  );
}

export default function WorkoutSummary() {
  const { logId } = useLocalSearchParams<{ logId: string }>();
  const { session } = useSession();
  const queryClient = useQueryClient();
  const { data: log, isLoading } = useWorkoutLog(logId);
  const userId = session?.user.id;
  // The set being edited in the popup; a/b are kg/reps, or min/km for cardio.
  const [editing, setEditing] = useState<{ set: WorkoutSet; cardio: boolean } | null>(null);
  const [a, setA] = useState('');
  const [b, setB] = useState('');
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
  const totalSets = log.exercises.reduce((sum, e) => sum + e.sets.length, 0);
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

  function openEdit(set: WorkoutSet, cardio: boolean) {
    setEditing({ set, cardio });
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
            }
          : { weightKg: x, reps: y != null ? Math.round(y) : null, durationS: null, distanceM: null }
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
    const { set } = editing;
    Alert.alert(`Delete set ${set.setNumber}?`, undefined, [
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
      <Text style={styles.title}>{log.name}</Text>
      <Text style={styles.subtitle}>{new Date(log.startedAt).toLocaleString()}</Text>

      <View style={styles.statsCard}>
        <Stat label="Minutes" value={durationMin != null ? String(durationMin) : '–'} />
        <Stat label="Sets" value={String(totalSets)} />
        <Stat label="Volume (kg)" value={String(Math.round(volumeKg))} />
      </View>

      {volumeDiff != null ? (
        <Text style={styles.compareText}>
          Volume {volumeDiff >= 0 ? '+' : '−'}
          {Math.abs(volumeDiff)} kg vs last time
        </Text>
      ) : null}

      {highlights.length > 0 ? (
        <View style={styles.highlights}>
          <Text style={styles.highlightsTitle}>🏆 New records</Text>
          {highlights.map((h) => (
            <Text key={h} style={styles.highlightText}>
              {h}
            </Text>
          ))}
        </View>
      ) : null}

      {log.exercises.map((e) => (
        <View key={e.id} style={styles.exercise}>
          <Text style={styles.exerciseName}>{e.exercise.name}</Text>
          {e.sets.length === 0 ? (
            <Text style={styles.emptyText}>No sets</Text>
          ) : (
            e.sets.map((set) => (
              <Pressable
                key={set.id}
                onPress={() => openEdit(set, e.exercise.category === 'cardio')}
              >
                <Text style={styles.setText}>
                  Set {set.setNumber}: {formatSet(set)} <Text style={styles.editHint}>✎</Text>
                </Text>
              </Pressable>
            ))
          )}
        </View>
      ))}

      <Modal
        visible={editing != null}
        transparent
        animationType="fade"
        onRequestClose={() => setEditing(null)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setEditing(null)}>
          <Pressable style={styles.modalCard}>
            <Text style={styles.modalTitle}>Edit set {editing?.set.setNumber}</Text>
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
            <Pressable
              style={[styles.doneButton, isEmptySet && styles.buttonDisabled]}
              onPress={handleSaveSet}
              disabled={saving || isEmptySet}
            >
              {saving ? (
                <ActivityIndicator color={colors.onPrimary} />
              ) : (
                <Text style={styles.doneButtonText}>Save</Text>
              )}
            </Pressable>
            <Pressable style={styles.deleteButton} onPress={handleDeleteSet} disabled={saving}>
              <Text style={styles.deleteButtonText}>Delete set</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      <Pressable style={styles.doneButton} onPress={() => router.dismissTo('/(tabs)/workouts')}>
        <Text style={styles.doneButtonText}>Done</Text>
      </Pressable>

      <Pressable style={styles.deleteButton} onPress={handleDelete}>
        <Text style={styles.deleteButtonText}>Delete Workout</Text>
      </Pressable>
    </ScrollView>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16, paddingBottom: 40 },
  title: { fontSize: 20, fontWeight: '700' },
  subtitle: { fontSize: 14, color: colors.muted, marginTop: 2 },
  statsCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginVertical: 20,
  },
  compareText: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', marginBottom: 16 },
  highlights: { backgroundColor: colors.warningBg, borderRadius: 12, padding: 16, marginBottom: 20 },
  highlightsTitle: { fontSize: 16, fontWeight: '700', marginBottom: 6 },
  highlightText: { fontSize: 14, color: colors.warningText, paddingVertical: 2 },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: '700' },
  statLabel: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  exercise: { marginBottom: 16 },
  exerciseName: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
  emptyText: { color: colors.subtle, fontSize: 14 },
  setText: { fontSize: 15, color: colors.textSecondary, paddingVertical: 4 },
  editHint: { color: colors.subtle },
  buttonDisabled: { opacity: 0.5 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    padding: 16,
  },
  modalCard: { backgroundColor: colors.background, borderRadius: 12, padding: 16 },
  modalTitle: { fontSize: 17, fontWeight: '600', marginBottom: 12 },
  doneButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  doneButtonText: { color: colors.onPrimary, fontSize: 16, fontWeight: '600' },
  deleteButton: { padding: 14, alignItems: 'center', marginTop: 8 },
  deleteButtonText: { color: colors.danger, fontSize: 15 },
});
