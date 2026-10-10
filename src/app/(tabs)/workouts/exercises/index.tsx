import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { CreateExerciseForm } from '../../../../components/workouts/CreateExerciseForm';
import { ExerciseList } from '../../../../components/workouts/ExerciseList';
import { colors } from '../../../../theme';

export default function ExerciseCatalog() {
  const [showForm, setShowForm] = useState(false);

  return (
    <View style={styles.container}>
      {showForm ? (
        <CreateExerciseForm onCreated={() => setShowForm(false)} onCancel={() => setShowForm(false)} />
      ) : (
        <Pressable style={styles.addButton} onPress={() => setShowForm(true)}>
          <Text style={styles.addButtonText}>+ Custom Exercise</Text>
        </Pressable>
      )}

      <ExerciseList onSelect={(e) => router.push(`/(tabs)/workouts/exercises/${e.id}`)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: 16 },
  addButton: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  addButtonText: { fontSize: 15, fontWeight: '600', color: colors.text },
});
