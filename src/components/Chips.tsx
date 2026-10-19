import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, spacing } from '../theme';

// A row of pick-one buttons. `selected` is the index of the active chip, or null for none.
export function Chips({
  labels,
  selected,
  onSelect,
  style,
}: {
  labels: readonly string[];
  selected: number | null;
  onSelect: (index: number) => void;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.chipRow, style]}>
      {labels.map((label, i) => (
        <Pressable
          key={label}
          style={[styles.chip, selected === i && styles.chipActive]}
          onPress={() => onSelect(i)}
          accessibilityRole="button"
          accessibilityState={{ selected: selected === i }}
        >
          <Text style={selected === i ? styles.chipTextActive : styles.chipText}>{label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: spacing.md },
  chip: {
    minHeight: 44,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.background,
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.textSecondary },
  chipTextActive: { color: colors.onPrimary },
});
