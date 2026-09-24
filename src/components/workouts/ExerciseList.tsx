import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useExercises } from '../../hooks/useWorkouts';
import type { Exercise } from '../../types/domain';

export function ExerciseList({ onSelect }: { onSelect?: (exercise: Exercise) => void }) {
  const { data: exercises, isLoading } = useExercises();
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return exercises ?? [];
    return (exercises ?? []).filter(
      (e) => e.name.toLowerCase().includes(q) || e.muscleGroup?.toLowerCase().includes(q)
    );
  }, [exercises, query]);

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        placeholder="Search exercises..."
        value={query}
        onChangeText={setQuery}
      />
      {isLoading ? <ActivityIndicator /> : null}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => (
          <Pressable
            style={styles.row}
            onPress={onSelect ? () => onSelect(item) : undefined}
            disabled={!onSelect}
          >
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.meta}>
              {[item.muscleGroup ?? item.category, item.equipment, item.isCustom ? 'custom' : null]
                .filter(Boolean)
                .join(' · ')}
            </Text>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
    marginBottom: 12,
  },
  row: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#eee' },
  name: { fontSize: 15, fontWeight: '500' },
  meta: { fontSize: 13, color: '#888', marginTop: 2 },
});
