import { useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useSession } from '../../../../context/AuthProvider';
import { useWorkoutLog } from '../../../../hooks/useWorkouts';
import { deleteWorkoutLog, formatSet } from '../../../../lib/workouts';

export default function WorkoutSummary() {
  const { logId } = useLocalSearchParams<{ logId: string }>();
  const { session } = useSession();
  const queryClient = useQueryClient();
  const { data: log, isLoading } = useWorkoutLog(logId);

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
  const volumeKg = log.exercises.reduce(
    (sum, e) => sum + e.sets.reduce((s, set) => s + (set.weightKg ?? 0) * (set.reps ?? 0), 0),
    0
  );

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
