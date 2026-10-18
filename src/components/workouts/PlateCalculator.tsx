import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { toNumberOrNull } from '../../lib/numbers';
import { DEFAULT_BAR_KG, platesPerSide } from '../../lib/plates';
import { colors, radius, spacing } from '../../theme';

const MAX_KG = 1000;

// Shows the plates per side for a weight. Nothing is saved: the bar weight resets each time.
// Mount it only while open, so it starts from the current set's weight every time.
export function PlateCalculator({
  initialKg,
  onClose,
}: {
  initialKg: number | null;
  onClose: () => void;
}) {
  const [kgText, setKgText] = useState(initialKg != null ? String(initialKg) : '');
  const [barText, setBarText] = useState(String(DEFAULT_BAR_KG));

  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title} accessibilityRole="header" numberOfLines={1}>
            Plates per side
          </Text>
          <Pressable
            onPress={onClose}
            style={styles.doneButton}
            accessibilityRole="button"
            accessibilityLabel="Done"
          >
            <Text style={styles.link}>Done</Text>
          </Pressable>
        </View>

        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
          <View style={styles.inputs}>
            <View style={styles.field}>
              <Text style={styles.label}>Weight (kg)</Text>
              <TextInput
                style={styles.input}
                value={kgText}
                onChangeText={setKgText}
                placeholder="e.g. 60"
                placeholderTextColor={colors.muted}
                keyboardType="decimal-pad"
                returnKeyType="done"
                selectTextOnFocus
                maxLength={7}
                accessibilityLabel="Total weight in kg"
              />
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>Bar (kg)</Text>
              <TextInput
                style={styles.input}
                value={barText}
                onChangeText={setBarText}
                placeholder={String(DEFAULT_BAR_KG)}
                placeholderTextColor={colors.muted}
                keyboardType="decimal-pad"
                returnKeyType="done"
                selectTextOnFocus
                maxLength={6}
                accessibilityLabel="Bar weight in kg"
              />
            </View>
          </View>

          <View accessibilityLiveRegion="polite">
            <Result kg={toNumberOrNull(kgText)} barKg={toNumberOrNull(barText)} />
          </View>
          <Text style={styles.note}>Plates: 25, 20, 15, 10, 5, 2.5 and 1.25 kg.</Text>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

function Result({ kg, barKg }: { kg: number | null; barKg: number | null }) {
  if (kg == null) return <Text style={styles.hint}>Type a weight to see the plates.</Text>;
  if (barKg == null) return <Text style={styles.hint}>Type the bar weight.</Text>;
  // Keeps the plate list short enough to read.
  if (kg > MAX_KG) return <Text style={styles.hint}>Type a weight up to {MAX_KG} kg.</Text>;

  const result = platesPerSide(kg, barKg);
  if (!result) return <Text style={styles.hint}>Weights can&apos;t be negative.</Text>;

  const { perSide, leftoverKg } = result;
  // Hundredths again, so e.g. 62.5 - 0.5 never prints as 61.99999.
  const loadedKg = Math.round((kg - leftoverKg) * 100) / 100;
  return (
    <View style={styles.result}>
      <Text style={styles.resultText} selectable>
        {perSide.length > 0
          ? `${perSide.join(' + ')} per side`
          : `Just the bar (${barKg} kg)${kg < barKg ? ` — that's more than ${kg} kg` : ''}`}
      </Text>
      {leftoverKg > 0 ? (
        <Text style={styles.leftover} selectable>
          Can&apos;t make {kg} kg exactly: {loadedKg} kg is the closest, {leftoverKg} kg short.
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: spacing.lg },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  title: { fontSize: 20, fontWeight: '700', flex: 1, color: colors.text },
  doneButton: { minHeight: 44, minWidth: 44, alignItems: 'flex-end', justifyContent: 'center' },
  link: { fontSize: 16, color: colors.primary },
  content: { gap: spacing.lg },
  inputs: { flexDirection: 'row', gap: spacing.md },
  field: { flex: 1, gap: spacing.xs },
  label: { fontSize: 13, fontWeight: '600', color: colors.muted },
  input: {
    minHeight: 44,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    fontSize: 18,
    color: colors.text,
  },
  result: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.sm },
  resultText: { fontSize: 22, fontWeight: '700', color: colors.text, fontVariant: ['tabular-nums'] },
  leftover: { fontSize: 14, color: colors.warning },
  hint: { fontSize: 15, color: colors.muted },
  note: { fontSize: 13, color: colors.muted },
});
