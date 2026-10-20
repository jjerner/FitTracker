import { Pressable, StyleProp, StyleSheet, ViewStyle } from 'react-native';

import { colors, spacing } from '../theme';
import { AppText } from './AppText';

type Props = {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  // Layout only (margins).
  style?: StyleProp<ViewStyle>;
};

// A blue text link with a 48 dp tap area that hugs the text.
export function TextLink({ title, onPress, disabled, style }: Props) {
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={title}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.link,
        { opacity: disabled ? 0.5 : pressed ? 0.7 : 1 },
        style,
      ]}
    >
      <AppText variant="label" style={styles.label}>
        {title}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  link: {
    minHeight: 48,
    justifyContent: 'center',
    alignSelf: 'center',
    paddingHorizontal: spacing.md,
  },
  label: { color: colors.primary, textAlign: 'center' },
});
