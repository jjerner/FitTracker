import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CreateExerciseForm } from './CreateExerciseForm';
import { ExerciseList } from './ExerciseList';
import type { Exercise } from '../../types/domain';
import { colors } from '../../theme';

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
          <Text style={styles.title}>{creating ? 'New Exercise' : title}</Text>
          <Pressable onPress={close} hitSlop={12}>
            <Text style={styles.close}>Cancel</Text>
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
            <Pressable style={styles.createButton} onPress={() => setCreating(true)}>
              <Text style={styles.createButtonText}>Create custom exercise</Text>
            </Pressable>
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
  container: { flex: 1, backgroundColor: colors.background, padding: 16 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: { fontSize: 20, fontWeight: '700', color: colors.text },
  close: { fontSize: 16, color: colors.primary },
  createButton: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  createButtonText: { fontSize: 15, fontWeight: '600', color: colors.text },
});
