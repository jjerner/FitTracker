import { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { AppText } from '../AppText';
import { Card } from '../Card';
import { useExercises } from '../../hooks/useWorkouts';
import type { Exercise } from '../../types/domain';
import { colors, radius, spacing, typography } from '../../theme';

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
        placeholderTextColor={colors.muted}
        value={query}
        onChangeText={setQuery}
      />
      {isLoading ? <ActivityIndicator /> : null}
      <Card style={styles.card}>
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item, index }) => (
            <Pressable
              style={[styles.row, index < filtered.length - 1 && styles.rowDivider]}
              onPress={onSelect ? () => onSelect(item) : undefined}
              disabled={!onSelect}
            >
              <AppText variant="label">{item.name}</AppText>
              <AppText variant="small" style={styles.meta}>
                {[item.muscleGroup ?? item.category, item.equipment, item.isCustom ? 'custom' : null]
                  .filter(Boolean)
                  .join(' · ')}
              </AppText>
            </Pressable>
          )}
        />
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  input: {
    ...typography.body,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  // flexShrink: a short list hugs its rows, a long one scrolls inside the card.
  card: { flexShrink: 1, gap: 0, paddingVertical: 0 },
  row: { paddingVertical: spacing.md },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: colors.border },
  meta: { marginTop: spacing.xs },
});
