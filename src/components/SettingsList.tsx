import { Children, type ComponentProps, type ReactNode } from 'react';
import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing } from '../theme';

type Icon = ComponentProps<typeof SymbolView>['name'];

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
  children,
}: {
  icon?: Icon;
  label: string;
  onPress?: () => void;
  // Set on rows that open another screen.
  chevron?: boolean;
  children?: ReactNode;
}) {
  const content = (
    <>
      {icon ? (
        <SymbolView name={icon} tintColor={colors.primary} size={22} />
      ) : (
        <View style={styles.iconSpacer} />
      )}
      <Text style={styles.rowText}>{label}</Text>
      {children}
      {chevron ? (
        <SymbolView
          name={{ ios: 'chevron.right', android: 'chevron_right' }}
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
      <Text style={styles.timeText}>{value}</Text>
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
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.xl },
});

const styles = StyleSheet.create({
  group: { backgroundColor: colors.surface, borderRadius: radius.lg, overflow: 'hidden' },
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
  rowText: { flex: 1, fontSize: 16, fontWeight: '600', color: colors.text },
  // 36 dp visible, hitSlop 6 makes the tap area 48 dp.
  stepButton: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepButtonText: { fontSize: 20, fontWeight: '600', color: colors.primary },
  timeText: { fontSize: 16, fontWeight: '600', color: colors.text, minWidth: 52, textAlign: 'center' },
});
