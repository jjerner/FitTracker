import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';

import { colors, radius, spacing } from '../theme';

type Props = TextInputProps & {
  label: string;
  // Password field: hides the text, with a Show/Hide toggle.
  password?: boolean;
};

// Text box with a label that stays visible. Colors are set explicitly so the text and
// placeholder stay readable when the phone is in dark mode.
export function LabeledInput({ label, password, style, ...rest }: Props) {
  const [revealed, setRevealed] = useState(false);

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <View>
        <TextInput
          {...rest}
          style={[styles.input, password && styles.inputWithToggle, style]}
          placeholderTextColor={colors.muted}
          secureTextEntry={password && !revealed}
        />
        {password && (
          <Pressable style={styles.toggle} onPress={() => setRevealed((r) => !r)} hitSlop={8}>
            <Text style={styles.toggleText}>{revealed ? 'Hide' : 'Show'}</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: spacing.md },
  label: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: spacing.xs },
  input: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    padding: 14,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.background,
  },
  inputWithToggle: { paddingRight: 64 },
  toggle: { position: 'absolute', right: 14, top: 0, bottom: 0, justifyContent: 'center' },
  toggleText: { color: colors.primary, fontWeight: '600' },
});
