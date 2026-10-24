import { useState } from 'react';
import { Alert, Platform, ScrollView, StyleSheet } from 'react-native';

import { AppText } from '../../../components/AppText';
import { Button } from '../../../components/Button';
import { Card } from '../../../components/Card';
import { LabeledInput } from '../../../components/LabeledInput';
import { settingsStyles } from '../../../components/SettingsList';
import { useSession } from '../../../context/AuthProvider';
import { supabase } from '../../../lib/supabase';
import { colors, spacing } from '../../../theme';

const CONFIRM_TITLE = 'Are you sure?';
const CONFIRM_MESSAGE = 'Your account and all your data will be deleted forever.';

// Last check before deleting. Alert has no buttons on web.
function confirmDelete(): Promise<boolean> {
  if (Platform.OS === 'web') {
    return Promise.resolve(window.confirm(`${CONFIRM_TITLE}\n\n${CONFIRM_MESSAGE}`));
  }
  return new Promise((resolve) =>
    Alert.alert(
      CONFIRM_TITLE,
      CONFIRM_MESSAGE,
      [
        { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
        { text: 'Delete', style: 'destructive', onPress: () => resolve(true) },
      ],
      { cancelable: true, onDismiss: () => resolve(false) },
    ),
  );
}

export default function DeleteAccount() {
  const { session } = useSession();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleDelete() {
    setError(null);
    setIsSubmitting(true);
    // Signing in again proves it's the owner. A failed sign-in keeps the current session.
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: session?.user.email ?? '',
      password,
    });
    if (signInError) {
      setIsSubmitting(false);
      const wrongPassword =
        signInError.code === 'invalid_credentials' || signInError.status === 400;
      setError(
        wrongPassword
          ? 'Wrong password. Nothing was deleted.'
          : "Couldn't check your password. Check your connection and try again.",
      );
      return;
    }
    if (!(await confirmDelete())) {
      setIsSubmitting(false);
      return;
    }
    const { error: deleteError } = await supabase.rpc('delete_my_account');
    if (deleteError) {
      setIsSubmitting(false);
      setError("Couldn't delete your account. Try again later.");
      return;
    }
    // Local only: the server sessions are already gone with the user. The tabs layout then
    // redirects to login.
    await supabase.auth.signOut({ scope: 'local' });
  }

  const canDelete = !!password && !isSubmitting;

  return (
    <ScrollView
      style={settingsStyles.container}
      contentContainerStyle={settingsStyles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Card>
        <AppText variant="heading">This deletes your account forever</AppText>
        <AppText style={{ color: colors.textSecondary }}>
          Everything you have saved in Plucky is removed: your food diary, workouts, weights, goals,
          routines, custom foods and exercises, and saved meals.
        </AppText>
        <AppText style={{ color: colors.textSecondary }}>This cannot be undone.</AppText>
      </Card>

      <Card>
        <LabeledInput
          label="Type your password to continue"
          accessibilityLabel="Password"
          password
          autoCapitalize="none"
          autoComplete="current-password"
          textContentType="password"
          value={password}
          onChangeText={setPassword}
        />

        {error ? (
          <AppText
            style={styles.error}
            selectable
            accessibilityRole="alert"
            accessibilityLiveRegion="polite"
          >
            {error}
          </AppText>
        ) : null}

        <Button
          variant="danger"
          title="Delete my account"
          onPress={handleDelete}
          disabled={!canDelete}
          loading={isSubmitting}
        />
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  error: { color: colors.danger, marginBottom: spacing.md },
});
