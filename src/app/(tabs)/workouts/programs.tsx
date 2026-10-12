import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useSession } from '../../../context/AuthProvider';
import { useExercises } from '../../../hooks/useWorkouts';
import { PROGRAMS, routineExercises, type Program } from '../../../lib/programs';
import { saveTemplate } from '../../../lib/workouts';
import { colors } from '../../../theme';

export default function ProgramsScreen() {
  const { session } = useSession();
  const queryClient = useQueryClient();
  const { data: catalog, isLoading } = useExercises();
  const [addingId, setAddingId] = useState<string | null>(null);

  async function handleAdd(program: Program) {
    if (!session || !catalog) return;
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
        <View key={program.id} style={styles.card}>
          <Text style={styles.title}>{program.name}</Text>
          <Text style={styles.meta}>{program.description}</Text>
          {program.routines.map((routine) => (
            <View key={routine.name} style={styles.routine}>
              <Text style={styles.routineName}>{routine.name}</Text>
              {routine.exercises.map(([name, sets, reps]) => (
                <Text key={name} style={styles.exercise}>
                  {name} · {sets}×{reps}
                </Text>
              ))}
            </View>
          ))}
          <Pressable
            style={styles.addButton}
            onPress={() => handleAdd(program)}
            disabled={addingId != null}
          >
            {addingId === program.id ? (
              <ActivityIndicator color={colors.onPrimary} />
            ) : (
              <Text style={styles.addButtonText}>Add to my routines</Text>
            )}
          </Pressable>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16, paddingBottom: 40, gap: 16 },
  card: { backgroundColor: colors.surface, borderRadius: 8, padding: 16 },
  title: { fontSize: 17, fontWeight: '600' },
  meta: { fontSize: 13, color: colors.muted, marginTop: 2 },
  routine: { marginTop: 12 },
  routineName: { fontSize: 15, fontWeight: '600', marginBottom: 2 },
  exercise: { fontSize: 14, color: colors.textSecondary },
  addButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  addButtonText: { color: colors.onPrimary, fontSize: 15, fontWeight: '600' },
});
