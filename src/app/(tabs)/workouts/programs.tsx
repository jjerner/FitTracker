import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '../../../components/AppText';
import { Button } from '../../../components/Button';
import { Card } from '../../../components/Card';
import { useSession } from '../../../context/AuthProvider';
import { useExercises } from '../../../hooks/useWorkouts';
import { PROGRAMS, routineExercises, type Program } from '../../../lib/programs';
import { saveTemplate } from '../../../lib/workouts';
import { colors, spacing } from '../../../theme';

export default function ProgramsScreen() {
  const { session } = useSession();
  const queryClient = useQueryClient();
  const { data: catalog, isLoading } = useExercises();
  const [addingId, setAddingId] = useState<string | null>(null);

  async function handleAdd(program: Program) {
    if (!session) return;
    if (!catalog) {
      Alert.alert('Could not add program', 'Check your connection and try again.');
      return;
    }
    setAddingId(program.id);
    try {
      for (const routine of program.routines) {
        await saveTemplate({
          id: null,
          userId: session.user.id,
          name: `${program.name} – ${routine.name}`,
          exercises: routineExercises(routine, catalog),
        });
      }
    } catch {
      Alert.alert('Could not add program', 'Check your connection and try again.');
      return;
    } finally {
      await queryClient.invalidateQueries({ queryKey: ['workoutTemplates', session.user.id] });
      setAddingId(null);
    }
    router.back();
  }

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {PROGRAMS.map((program) => (
        <Card key={program.id} style={styles.card}>
          <AppText variant="label">{program.name}</AppText>
          <AppText variant="small" style={styles.meta}>
            {program.description}
          </AppText>
          {program.routines.map((routine) => (
            <View key={routine.name} style={styles.routine}>
              <AppText variant="label" style={styles.routineName}>
                {routine.name}
              </AppText>
              {routine.exercises.map(([name, sets, reps]) => (
                <AppText key={name} variant="small" style={styles.exercise}>
                  {name} · {sets}×{reps}
                </AppText>
              ))}
            </View>
          ))}
          <Button
            title="Add to my routines"
            onPress={() => handleAdd(program)}
            loading={addingId === program.id}
            disabled={addingId != null}
            style={styles.addButton}
          />
        </Card>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.lg },
  card: { gap: 0 },
  meta: { marginTop: spacing.xs },
  routine: { marginTop: spacing.md },
  routineName: { marginBottom: spacing.xs },
  exercise: { color: colors.textSecondary },
  addButton: { marginTop: spacing.lg },
});
