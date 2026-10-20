import { ActivityIndicator, Pressable, StyleProp, StyleSheet, ViewStyle } from 'react-native';

import { colors, radius, spacing } from '../theme';
import { AppText } from './AppText';

const variants = {
  primary: { backgroundColor: colors.primary, color: colors.onPrimary },
  secondary: { backgroundColor: colors.surface, color: colors.text },
  danger: { backgroundColor: colors.danger, color: colors.onPrimary },
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
  const { backgroundColor, color } = variants[variant];
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
        { backgroundColor, opacity: disabled ? 0.5 : pressed ? 0.7 : 1 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={color} />
      ) : (
        <AppText variant="label" style={{ color }}>
          {title}
        </AppText>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // minHeight 48: comfortable touch target (Android guideline).
  button: {
    minHeight: 48,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
