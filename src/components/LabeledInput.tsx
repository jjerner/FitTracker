import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';

import { colors, radius, spacing } from '../theme';

type Props = TextInputProps & {
  label: string;
  // Password field: hides the text, with an eye toggle to show it.
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
          <Pressable
            style={styles.toggle}
            onPress={() => setRevealed((r) => !r)}
            accessibilityRole="button"
            accessibilityLabel={revealed ? 'Hide password' : 'Show password'}
          >
            {/* web key needed: without it SymbolView renders nothing on web */}
            <SymbolView
              name={
                revealed
                  ? { ios: 'eye.slash', android: 'visibility_off', web: 'visibility_off' }
                  : { ios: 'eye', android: 'visibility', web: 'visibility' }
              }
              tintColor={colors.primary}
              size={22}
            />
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
  inputWithToggle: { paddingRight: 48 },
  // 44pt wide, full input height: a comfortable touch target.
  toggle: {
    position: 'absolute',
    right: 2,
    top: 0,
    bottom: 0,
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
