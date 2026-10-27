import { ReactNode, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { colors, spacing } from '../../theme';
import { AppText } from '../AppText';
import { TextLink } from '../TextLink';

type Props = {
  role: 'first' | 'second' | null;
  // Space under the card. On a first card it is padding, so the bar runs on into the second card.
  spaceBelow: number;
  onUnlink?: () => void | Promise<void>;
  // What TalkBack reads on Unlink, e.g. "Unlink Bench Press and Barbell Row".
  unlinkLabel?: string;
  children: ReactNode;
};

// Wraps one exercise card; two in a row with roles first + second read as one superset frame.
// Always the same View, so linking never remounts the card (it keeps typed rows and notes).
export function SupersetFrame({ role, spaceBelow, onUnlink, unlinkLabel, children }: Props) {
  const [busy, setBusy] = useState(false);

  async function handleUnlink() {
    setBusy(true);
    try {
      await onUnlink?.();
    } finally {
      setBusy(false);
    }
  }

  return (
    <View
      style={[
        role ? styles.bar : null,
        role === 'first' ? { paddingBottom: spaceBelow } : { marginBottom: spaceBelow },
      ]}
    >
      {role === 'first' ? (
        <View style={[styles.header, !onUnlink && styles.headerPlain]}>
          <AppText variant="labelSmall" style={styles.headerText} accessibilityLabel="Superset">
            ⛓ Superset
          </AppText>
          {onUnlink ? (
            <>
              <AppText variant="labelSmall" style={styles.headerText} importantForAccessibility="no">
                {' · '}
              </AppText>
              <TextLink
                title="Unlink"
                onPress={handleUnlink}
                disabled={busy}
                accessibilityLabel={unlinkLabel}
                style={styles.unlink}
              />
            </>
          ) : null}
        </View>
      ) : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  // The bar sits in the screen's side gutter, so the card keeps its full width (-12 = 4 + 8).
  bar: {
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
    paddingLeft: spacing.sm,
    marginLeft: -spacing.md,
  },
  header: { flexDirection: 'row', alignItems: 'center' },
  headerPlain: { paddingBottom: spacing.xs },
  headerText: { color: colors.primary },
  unlink: { paddingHorizontal: 0 },
});
