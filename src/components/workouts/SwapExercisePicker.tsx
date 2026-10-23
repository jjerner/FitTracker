import { useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '../AppText';
import { Button } from '../Button';
import { Card } from '../Card';
import { EmptyState } from '../EmptyState';
import { ExerciseList } from './ExerciseList';
import { useExercises } from '../../hooks/useWorkouts';
import type { Exercise } from '../../types/domain';
import { colors, spacing } from '../../theme';

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
          <AppText variant="heading" style={styles.title} numberOfLines={1}>
            Swap {current.name}
          </AppText>
          <Pressable onPress={close} hitSlop={14} accessibilityRole="button">
            <AppText style={styles.link}>Cancel</AppText>
          </Pressable>
        </View>

        {showAll ? (
          <ExerciseList onSelect={select} />
        ) : (
          <>
            <Card style={styles.card}>
              <FlatList
                data={similar}
                keyExtractor={(item) => item.id}
                ListEmptyComponent={
                  <EmptyState message="No similar exercises found. Tap Show all exercises below." />
                }
                renderItem={({ item, index }) => (
                  <Pressable
                    style={[styles.row, index < similar.length - 1 && styles.rowDivider]}
                    onPress={() => select(item)}
                  >
                    <AppText variant="label">{item.name}</AppText>
                    <AppText variant="small" style={styles.meta}>
                      {[item.equipment, item.isCustom ? 'custom' : null].filter(Boolean).join(' · ')}
                    </AppText>
                  </Pressable>
                )}
              />
            </Card>
            <Button
              variant="secondary"
              title="Show all exercises"
              onPress={() => setShowAll(true)}
              style={styles.showAllButton}
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
    gap: spacing.md,
  },
  title: { flex: 1 },
  link: { color: colors.primary },
  // Same card as ExerciseList: a short list hugs its rows, a long one scrolls.
  card: { flexShrink: 1, gap: 0, paddingVertical: 0 },
  row: { paddingVertical: spacing.md },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: colors.border },
  meta: { marginTop: spacing.xs },
  showAllButton: { marginTop: spacing.md },
});
