import { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { spacing } from '../theme';
import { AppText } from './AppText';

// "Nothing here yet" text, with an optional action below it (e.g. a <Button>).
export function EmptyState({ message, children }: { message: string; children?: ReactNode }) {
  return (
    <View style={styles.wrapper}>
      <AppText variant="small">{message}</AppText>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { paddingVertical: spacing.lg, gap: spacing.md },
});
