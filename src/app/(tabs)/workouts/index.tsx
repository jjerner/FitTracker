import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useSession } from '../../../context/AuthProvider';
import { useWorkoutHistory, useWorkoutTemplates } from '../../../hooks/useWorkouts';
import { startWorkout } from '../../../lib/workouts';
import type { WorkoutTemplate } from '../../../types/domain';

export default function WorkoutsHome() {
  const { session } = useSession();
  const queryClient = useQueryClient();
  const { data: templates, isLoading: templatesLoading } = useWorkoutTemplates();
  const { data: history, isLoading: historyLoading } = useWorkoutHistory();
  const [isStarting, setIsStarting] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  const activeWorkout = history?.find((log) => log.completedAt == null);
  const completed = (history ?? []).filter((log) => log.completedAt != null);
  const activeTemplates = (templates ?? []).filter((t) => !t.isArchived);
  const archivedTemplates = (templates ?? []).filter((t) => t.isArchived);

  async function handleStart(template: WorkoutTemplate | null) {
    if (!session) return;
    setIsStarting(true);
    try {
      const logId = await startWorkout({ userId: session.user.id, template });
      await queryClient.invalidateQueries({ queryKey: ['workoutHistory', session.user.id] });
      router.push({ pathname: '/(tabs)/workouts/active', params: { logId } });
    } finally {
      setIsStarting(false);
    }
  }

  if (templatesLoading || historyLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {activeWorkout ? (
        <Pressable
          style={styles.primaryButton}
          onPress={() =>
            router.push({ pathname: '/(tabs)/workouts/active', params: { logId: activeWorkout.id } })
          }
        >
          <Text style={styles.primaryButtonText}>Resume: {activeWorkout.name}</Text>
        </Pressable>
      ) : (
        <Pressable
          style={styles.primaryButton}
          onPress={() => handleStart(null)}
          disabled={isStarting}
        >
          {isStarting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryButtonText}>Start Empty Workout</Text>
          )}
        </Pressable>
      )}

      <Text style={styles.sectionTitle}>Templates</Text>
      {activeTemplates.length === 0 ? (
        <Text style={styles.emptyText}>No templates yet</Text>
      ) : (
        activeTemplates.map((template) => (
          <Pressable
            key={template.id}
            style={styles.row}
            onPress={() => router.push(`/(tabs)/workouts/${template.id}`)}
          >
            <View style={styles.rowInfo}>
              <Text style={styles.rowTitle}>{template.name}</Text>
              <Text style={styles.rowMeta}>{template.exercises.length} exercises</Text>
            </View>
            {activeWorkout ? null : (
              <Pressable
                style={styles.startChip}
                onPress={() => handleStart(template)}
                disabled={isStarting}
              >
                <Text style={styles.startChipText}>Start</Text>
              </Pressable>
            )}
          </Pressable>
        ))
      )}
      {archivedTemplates.length > 0 ? (
        <Pressable style={styles.archivedToggle} onPress={() => setShowArchived((v) => !v)}>
          <Text style={styles.archivedToggleText}>
            {showArchived ? 'Hide' : 'Show'} archived ({archivedTemplates.length})
          </Text>
        </Pressable>
      ) : null}
      {showArchived
        ? archivedTemplates.map((template) => (
            <Pressable
              key={template.id}
              style={styles.row}
              onPress={() => router.push(`/(tabs)/workouts/${template.id}`)}
            >
              <View style={styles.rowInfo}>
                <Text style={[styles.rowTitle, styles.archivedTitle]}>{template.name}</Text>
                <Text style={styles.rowMeta}>Archived · {template.exercises.length} exercises</Text>
              </View>
            </Pressable>
          ))
        : null}
      <Pressable
        style={styles.secondaryButton}
        onPress={() => router.push('/(tabs)/workouts/new')}
      >
        <Text style={styles.secondaryButtonText}>+ New Template</Text>
      </Pressable>

      <Pressable
        style={styles.secondaryButton}
        onPress={() => router.push('/(tabs)/workouts/exercises')}
      >
        <Text style={styles.secondaryButtonText}>Exercise Catalog</Text>
      </Pressable>

      <Text style={styles.sectionTitle}>History</Text>
      {completed.length === 0 ? (
        <Text style={styles.emptyText}>No workouts logged yet</Text>
      ) : (
        completed.map((log) => (
          <Pressable
            key={log.id}
            style={styles.row}
            onPress={() => router.push(`/(tabs)/workouts/log/${log.id}`)}
          >
            <Text style={styles.rowTitle}>{log.name}</Text>
            <Text style={styles.rowMeta}>{new Date(log.startedAt).toLocaleDateString()}</Text>
          </Pressable>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16, paddingBottom: 40 },
  primaryButton: {
    backgroundColor: '#2563eb',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
  },
  primaryButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  secondaryButton: {
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  secondaryButtonText: { fontSize: 15, fontWeight: '600' },
  sectionTitle: { fontSize: 16, fontWeight: '600', marginTop: 24, marginBottom: 8 },
  emptyText: { color: '#999', fontSize: 14 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  rowInfo: { flex: 1 },
  rowTitle: { fontSize: 15, fontWeight: '500' },
  rowMeta: { fontSize: 13, color: '#888' },
  archivedTitle: { color: '#888' },
  archivedToggle: { paddingVertical: 10 },
  archivedToggleText: { color: '#2563eb', fontSize: 14 },
  startChip: {
    backgroundColor: '#2563eb',
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  startChipText: { color: '#fff', fontWeight: '600' },
});
