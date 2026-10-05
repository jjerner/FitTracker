import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

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
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          <Pressable onPress={onClose}>
            <Text style={styles.close}>Cancel</Text>
          </Pressable>
        </View>
        <ExerciseList
          onSelect={(exercise) => {
            onSelect(exercise);
            onClose();
          }}
        />
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
  title: { fontSize: 20, fontWeight: '700' },
  close: { fontSize: 16, color: colors.primary },
});
