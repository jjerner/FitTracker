import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { restFromMinSec, splitRest } from '../lib/restTime';
import { colors, radius, spacing } from '../theme';

// Rest time as two boxes: [ 3 ] min [ 00 ] sec. Reports clamped seconds on every keystroke
// (so Save works without leaving the box) and tidies the boxes when one loses focus.
export function RestTimeInput({
  initialSeconds,
  min,
  label,
  onChange,
}: {
  initialSeconds: number;
  min: number;
  // Screen-reader name, e.g. "Default rest" → "Default rest minutes".
  label: string;
  onChange: (seconds: number) => void;
}) {
  const [parts, setParts] = useState(() => splitRest(initialSeconds));

  function update(patch: Partial<typeof parts>) {
    const next = { ...parts, ...patch };
    setParts(next);
    onChange(restFromMinSec(next.minutes, next.seconds, min));
  }

  function tidy() {
    setParts(splitRest(restFromMinSec(parts.minutes, parts.seconds, min)));
  }

  return (
    <View style={styles.row}>
      <TextInput
        style={styles.input}
        value={parts.minutes}
        onChangeText={(minutes) => update({ minutes })}
        onBlur={tidy}
        keyboardType="number-pad"
        maxLength={2}
        selectTextOnFocus
        accessibilityLabel={`${label} minutes`}
      />
      <Text style={styles.unit}>min</Text>
      <TextInput
        style={styles.input}
        value={parts.seconds}
        onChangeText={(seconds) => update({ seconds })}
        onBlur={tidy}
        keyboardType="number-pad"
        maxLength={2}
        selectTextOnFocus
        accessibilityLabel={`${label} seconds`}
      />
      <Text style={styles.unit}>sec</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  input: {
    width: 48,
    minHeight: 40,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.xs,
    fontSize: 16,
    color: colors.text,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  unit: { fontSize: 14, color: colors.textSecondary, marginRight: spacing.xs },
});
