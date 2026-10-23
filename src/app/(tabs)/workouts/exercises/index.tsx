import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '../../../../components/Button';
import { CreateExerciseForm } from '../../../../components/workouts/CreateExerciseForm';
import { ExerciseList } from '../../../../components/workouts/ExerciseList';
import { colors, spacing } from '../../../../theme';

export default function ExerciseCatalog() {
  const [showForm, setShowForm] = useState(false);

  return (
    <View style={styles.container}>
      {showForm ? (
        <CreateExerciseForm onCreated={() => setShowForm(false)} onCancel={() => setShowForm(false)} />
      ) : (
        <Button
          variant="secondary"
          title="+ Custom Exercise"
          onPress={() => setShowForm(true)}
          style={styles.addButton}
        />
      )}

      <ExerciseList onSelect={(e) => router.push(`/(tabs)/workouts/exercises/${e.id}`)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface, padding: spacing.lg },
  addButton: { marginBottom: spacing.md },
});
