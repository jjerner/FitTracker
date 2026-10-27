import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '../../../components/AppText';
import { Button } from '../../../components/Button';
import { Card } from '../../../components/Card';
import { EmptyState } from '../../../components/EmptyState';
import { TextLink } from '../../../components/TextLink';
import { useSession } from '../../../context/AuthProvider';
import { useWorkoutHistory, useWorkoutTemplates } from '../../../hooks/useWorkouts';
import { startWorkout } from '../../../lib/workouts';
import type { WorkoutTemplate } from '../../../types/domain';
import { colors, radius, spacing } from '../../../theme';

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
        <Button
          title={`Resume: ${activeWorkout.name}`}
          onPress={() =>
            router.push({ pathname: '/(tabs)/workouts/active', params: { logId: activeWorkout.id } })
          }
        />
      ) : (
        <Button title="Start Empty Workout" onPress={() => handleStart(null)} loading={isStarting} />
      )}

      <AppText variant="heading" style={styles.sectionTitle}>
        Routines
      </AppText>
      <Card style={styles.listCard}>
        {activeTemplates.length === 0 ? (
          <EmptyState message="No routines yet. Make one with New Routine, or pick one from Browse Programs." />
        ) : (
          activeTemplates.map((template, index) => (
            <View
              key={template.id}
              style={[styles.row, index < activeTemplates.length - 1 && styles.rowDivider]}
            >
              <View style={styles.rowInfo}>
                <AppText variant="label">{template.name}</AppText>
                <AppText variant="small">{template.exercises.length} exercises</AppText>
              </View>
              <TextLink
                title="Edit"
                accessibilityLabel={`Edit ${template.name}`}
                onPress={() => router.push(`/(tabs)/workouts/${template.id}`)}
              />
              {activeWorkout ? null : (
                <Pressable
                  style={styles.startChip}
                  onPress={() => handleStart(template)}
                  disabled={isStarting}
                  hitSlop={{ top: 5, bottom: 5 }}
                  accessibilityRole="button"
                  accessibilityLabel={`Start ${template.name}`}
                >
                  <AppText variant="labelSmall" style={styles.startChipText}>
                    Start
                  </AppText>
                </Pressable>
              )}
            </View>
          ))
        )}
        {archivedTemplates.length > 0 ? (
          <Pressable
            style={styles.archivedToggle}
            onPress={() => setShowArchived((v) => !v)}
            accessibilityRole="button"
            accessibilityState={{ expanded: showArchived }}
          >
            <AppText variant="small" style={styles.archivedToggleText}>
              {showArchived ? 'Hide' : 'Show'} archived ({archivedTemplates.length})
            </AppText>
          </Pressable>
        ) : null}
        {showArchived
          ? archivedTemplates.map((template, index) => (
              <Pressable
                key={template.id}
                style={[styles.row, index < archivedTemplates.length - 1 && styles.rowDivider]}
                onPress={() => router.push(`/(tabs)/workouts/${template.id}`)}
              >
                <View style={styles.rowInfo}>
                  <AppText variant="label" style={styles.archivedTitle}>
                    {template.name}
                  </AppText>
                  <AppText variant="small">Archived · {template.exercises.length} exercises</AppText>
                </View>
              </Pressable>
            ))
          : null}
      </Card>
      <Button
        variant="secondary"
        title="New Routine"
        onPress={() => router.push('/(tabs)/workouts/new')}
        style={styles.secondaryButton}
      />
      <Button
        variant="secondary"
        title="Browse Programs"
        onPress={() => router.push('/(tabs)/workouts/programs')}
        style={styles.secondaryButton}
      />
      <Button
        variant="secondary"
        title="Exercise Catalog"
        onPress={() => router.push('/(tabs)/workouts/exercises')}
        style={styles.secondaryButton}
      />

      <AppText variant="heading" style={styles.sectionTitle}>
        History
      </AppText>
      <Card style={styles.listCard}>
        {completed.length === 0 ? (
          <EmptyState message="No workouts logged yet. Start one above." />
        ) : (
          completed.map((log, index) => (
            <Pressable
              key={log.id}
              style={[styles.historyRow, index < completed.length - 1 && styles.rowDivider]}
              onPress={() => router.push(`/(tabs)/workouts/log/${log.id}`)}
            >
              <AppText variant="label">{log.name}</AppText>
              <AppText variant="small">{new Date(log.startedAt).toLocaleDateString()}</AppText>
            </Pressable>
          ))
        )}
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  secondaryButton: { marginTop: spacing.md },
  sectionTitle: { marginTop: spacing.xl, marginBottom: spacing.sm },
  listCard: { gap: 0, paddingVertical: 0 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  historyRow: { paddingVertical: spacing.md },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: colors.border },
  rowInfo: { flex: 1 },
  archivedTitle: { color: colors.muted },
  archivedToggle: { minHeight: 48, justifyContent: 'center' },
  archivedToggleText: { color: colors.primary },
  startChip: {
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  startChipText: { color: colors.onPrimary },
});
