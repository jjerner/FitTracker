import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '../AppText';
import { Button } from '../Button';
import { CreateExerciseForm } from './CreateExerciseForm';
import { ExerciseList } from './ExerciseList';
import type { Exercise } from '../../types/domain';
import { colors, spacing } from '../../theme';

export function ExercisePicker({
  visible,
  onClose,
  onSelect,
  title = 'Add Exercise',
}: {
  visible: boolean;
  onClose: () => void;
  onSelect: (exercise: Exercise) => void;
  title?: string;
}) {
  const [creating, setCreating] = useState(false);

  function close() {
    setCreating(false);
    onClose();
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={close}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <AppText variant="heading">{creating ? 'New Exercise' : title}</AppText>
          <Pressable onPress={close} hitSlop={14} accessibilityRole="button">
            <AppText style={styles.close}>Cancel</AppText>
          </Pressable>
        </View>
        {creating ? (
          <ScrollView keyboardShouldPersistTaps="handled">
            <CreateExerciseForm
              onCreated={(exercise) => {
                onSelect(exercise);
                close();
              }}
              onCancel={() => setCreating(false)}
            />
          </ScrollView>
        ) : (
          <>
            <Button
              variant="secondary"
              title="Create custom exercise"
              onPress={() => setCreating(true)}
              style={styles.createButton}
            />
            <ExerciseList
              onSelect={(exercise) => {
                onSelect(exercise);
                close();
              }}
            />
          </>
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface, padding: spacing.lg },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  close: { color: colors.primary },
  createButton: { marginBottom: spacing.md },
});
