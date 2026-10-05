import { useQueries, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useSession } from '../../../../context/AuthProvider';
import { useWorkoutHistory, useWorkoutLog } from '../../../../hooks/useWorkouts';
import { bestOf, bestOfSessions, findNewRecords } from '../../../../lib/records';
import { deleteWorkoutLog, formatSet, getExerciseHistory } from '../../../../lib/workouts';

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

  function handleDelete() {
    if (!log) return;
    Alert.alert('Delete workout?', 'This removes it from your history.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteWorkoutLog(log.id);
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
              <Text key={set.id} style={styles.setText}>
                Set {set.setNumber}: {formatSet(set)}
              </Text>
            ))
          )}
        </View>
      ))}

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
  container: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16, paddingBottom: 40 },
  title: { fontSize: 20, fontWeight: '700' },
  subtitle: { fontSize: 14, color: '#888', marginTop: 2 },
  statsCard: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    padding: 16,
    marginVertical: 20,
  },
  compareText: { fontSize: 14, color: '#555', textAlign: 'center', marginBottom: 16 },
  highlights: { backgroundColor: '#fef3c7', borderRadius: 12, padding: 16, marginBottom: 20 },
  highlightsTitle: { fontSize: 16, fontWeight: '700', marginBottom: 6 },
  highlightText: { fontSize: 14, color: '#92400e', paddingVertical: 2 },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: '700' },
  statLabel: { fontSize: 12, color: '#555', marginTop: 2 },
  exercise: { marginBottom: 16 },
  exerciseName: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
  emptyText: { color: '#999', fontSize: 14 },
  setText: { fontSize: 15, color: '#333', paddingVertical: 2 },
  doneButton: {
    backgroundColor: '#2563eb',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  doneButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  deleteButton: { padding: 14, alignItems: 'center', marginTop: 8 },
  deleteButtonText: { color: '#dc2626', fontSize: 15 },
});
