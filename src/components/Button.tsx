import { ActivityIndicator, Pressable, StyleProp, StyleSheet, ViewStyle } from 'react-native';

import { colors, radius, spacing } from '../theme';
import { AppText } from './AppText';

const variants = {
  primary: { backgroundColor: colors.primary, color: colors.onPrimary, borderColor: colors.primary },
  // White with an outline, so it stays visible on both white cards and grey screens.
  secondary: { backgroundColor: colors.background, color: colors.text, borderColor: colors.borderStrong },
  danger: { backgroundColor: colors.danger, color: colors.onPrimary, borderColor: colors.danger },
};

type Props = {
  title: string;
  onPress: () => void;
  variant?: keyof typeof variants;
  disabled?: boolean;
  // Shows a spinner and blocks taps while something is saving.
  loading?: boolean;
  // Layout only (margins, flex); colours come from the variant.
  style?: StyleProp<ViewStyle>;
};

export function Button({ title, onPress, variant = 'primary', disabled, loading, style }: Props) {
  const { color, ...box } = variants[variant];
  const blocked = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: !!blocked, busy: !!loading }}
      disabled={blocked}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        box,
        { opacity: disabled ? 0.5 : pressed ? 0.7 : 1 },
        style,
      ]}
    >
      {/* Label stays in place (hidden) under the spinner, so the button keeps its width. */}
      <AppText variant="label" style={[styles.label, { color }, loading && styles.hidden]}>
        {title}
      </AppText>
      {loading && <ActivityIndicator color={color} style={StyleSheet.absoluteFill} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // minHeight 48: comfortable touch target (Android guideline).
  button: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { textAlign: 'center' },
  hidden: { opacity: 0 },
});
