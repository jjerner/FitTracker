import { useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ExerciseList } from './ExerciseList';
import { useExercises } from '../../hooks/useWorkouts';
import type { Exercise } from '../../types/domain';

// Suggests exercises with the same movement pattern (or muscle group if it has none).
export function SwapExercisePicker({
  current,
  visible,
  onClose,
  onSelect,
}: {
  current: Exercise;
  visible: boolean;
  onClose: () => void;
  onSelect: (exercise: Exercise) => void;
}) {
  const { data: exercises } = useExercises();
  const [showAll, setShowAll] = useState(false);

  const similar = (exercises ?? []).filter(
    (e) =>
      e.id !== current.id &&
      (current.movementPattern
        ? e.movementPattern === current.movementPattern
        : current.muscleGroup != null && e.muscleGroup === current.muscleGroup)
  );

  function select(exercise: Exercise) {
    onSelect(exercise);
    close();
  }

  function close() {
    setShowAll(false);
    onClose();
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={close}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title} numberOfLines={1}>
            Swap {current.name}
          </Text>
          <Pressable onPress={close}>
            <Text style={styles.link}>Cancel</Text>
          </Pressable>
        </View>

        {showAll ? (
          <ExerciseList onSelect={select} />
        ) : (
          <>
            <FlatList
              data={similar}
              keyExtractor={(item) => item.id}
              ListEmptyComponent={<Text style={styles.empty}>No similar exercises found</Text>}
              renderItem={({ item }) => (
                <Pressable style={styles.row} onPress={() => select(item)}>
                  <Text style={styles.name}>{item.name}</Text>
                  <Text style={styles.meta}>
                    {[item.equipment, item.isCustom ? 'custom' : null].filter(Boolean).join(' · ')}
                  </Text>
                </Pressable>
              )}
            />
            <Pressable style={styles.showAllButton} onPress={() => setShowAll(true)}>
              <Text style={styles.showAllText}>Show all exercises</Text>
            </Pressable>
          </>
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 16 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  title: { fontSize: 20, fontWeight: '700', flex: 1 },
  link: { fontSize: 16, color: '#2563eb' },
  empty: { color: '#999', fontSize: 14, paddingVertical: 12 },
  row: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#eee' },
  name: { fontSize: 15, fontWeight: '500' },
  meta: { fontSize: 13, color: '#888', marginTop: 2 },
  showAllButton: {
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  showAllText: { fontSize: 15, fontWeight: '600' },
});
