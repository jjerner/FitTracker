import { Children, type ComponentProps, type ReactNode } from 'react';
import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '../theme';
import { AppText } from './AppText';

type Icon = ComponentProps<typeof SymbolView>['name'];

// Web uses the same Material names as Android.
function webIcon(icon: Icon): Icon {
  return typeof icon === 'object' && 'android' in icon ? { web: icon.android, ...icon } : icon;
}

// Shared look for the Profile settings screens: grouped rows with hairlines between them.
export function SettingsGroup({ children }: { children: ReactNode }) {
  return (
    <View style={styles.group}>
      {Children.toArray(children).map((child, i) => (
        <View key={i} style={i > 0 && styles.separator}>
          {child}
        </View>
      ))}
    </View>
  );
}

export function SettingsRow({
  icon,
  label,
  onPress,
  chevron,
  destructive,
  children,
}: {
  icon?: Icon;
  label: string;
  onPress?: () => void;
  // Set on rows that open another screen.
  chevron?: boolean;
  // Red text and icon, for rows that delete things.
  destructive?: boolean;
  children?: ReactNode;
}) {
  const content = (
    <>
      {icon ? (
        // web key needed: without it SymbolView renders nothing on web
        <SymbolView
          name={webIcon(icon)}
          tintColor={destructive ? colors.danger : colors.primary}
          size={22}
        />
      ) : (
        <View style={styles.iconSpacer} />
      )}
      <AppText variant="label" style={[styles.rowText, destructive && styles.rowTextDestructive]}>
        {label}
      </AppText>
      {children}
      {chevron ? (
        <SymbolView
          name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
          tintColor={colors.muted}
          size={22}
        />
      ) : null}
    </>
  );
  if (!onPress) return <View style={styles.row}>{content}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      {content}
    </Pressable>
  );
}

export function Stepper({
  value,
  onDecrease,
  onIncrease,
  decreaseLabel,
  increaseLabel,
}: {
  value: string;
  onDecrease: () => void;
  onIncrease: () => void;
  decreaseLabel: string;
  increaseLabel: string;
}) {
  return (
    <>
      <Pressable
        style={styles.stepButton}
        hitSlop={6}
        accessibilityRole="button"
        accessibilityLabel={decreaseLabel}
        onPress={onDecrease}
      >
        <Text style={styles.stepButtonText}>−</Text>
      </Pressable>
      <AppText variant="label" style={styles.timeText}>{value}</AppText>
      <Pressable
        style={styles.stepButton}
        hitSlop={6}
        accessibilityRole="button"
        accessibilityLabel={increaseLabel}
        onPress={onIncrease}
      >
        <Text style={styles.stepButtonText}>+</Text>
      </Pressable>
    </>
  );
}

export const settingsStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  content: { padding: spacing.lg, gap: spacing.xl },
});

const styles = StyleSheet.create({
  group: { backgroundColor: colors.background, borderRadius: radius.lg, overflow: 'hidden' },
  separator: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.borderStrong },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 56,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  rowPressed: { backgroundColor: colors.border },
  iconSpacer: { width: 22 },
  rowText: { flex: 1 },
  rowTextDestructive: { color: colors.dangerDark },
  // 36 dp visible, hitSlop 6 makes the tap area 48 dp.
  stepButton: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepButtonText: { ...typography.heading, color: colors.primary },
  timeText: { minWidth: 52, textAlign: 'center' },
});
