import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';

import { AppText } from '../../../components/AppText';
import { Button } from '../../../components/Button';
import { Card } from '../../../components/Card';
import { LabeledInput } from '../../../components/LabeledInput';
import { settingsStyles } from '../../../components/SettingsList';
import { useSession } from '../../../context/AuthProvider';
import { supabase } from '../../../lib/supabase';
import { colors, spacing } from '../../../theme';

export default function ChangePassword() {
  const { session } = useSession();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  // Show the success message for a moment, then go back to Account.
  useEffect(() => {
    if (!done) return;
    const timer = setTimeout(() => router.back(), 1500);
    return () => clearTimeout(timer);
  }, [done]);

  async function handleSave() {
    setError(null);
    if (next !== confirm) {
      setError("The new passwords don't match.");
      return;
    }
    setIsSubmitting(true);
    // Signing in again proves it's the owner. A failed sign-in keeps the current session.
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: session?.user.email ?? '',
      password: current,
    });
    if (signInError) {
      setIsSubmitting(false);
      const wrongPassword =
        signInError.code === 'invalid_credentials' || signInError.status === 400;
      setError(
        wrongPassword
          ? 'Current password is wrong.'
          : "Couldn't check your password. Check your connection and try again.",
      );
      return;
    }
    // Minimum length is Supabase's rule, same as at sign-up; its message is shown.
    const { error: updateError } = await supabase.auth.updateUser({ password: next });
    setIsSubmitting(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setDone(true);
  }

  const canSave = !!current && !!next && !!confirm && !isSubmitting && !done;

  return (
    <ScrollView
      style={settingsStyles.container}
      contentContainerStyle={settingsStyles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Card>
        <LabeledInput
          label="Current password"
          accessibilityLabel="Current password"
          password
          autoCapitalize="none"
          autoComplete="current-password"
          textContentType="password"
          value={current}
          onChangeText={setCurrent}
        />
        <LabeledInput
          label="New password"
          accessibilityLabel="New password"
          password
          autoCapitalize="none"
          autoComplete="new-password"
          textContentType="newPassword"
          value={next}
          onChangeText={setNext}
        />
        <LabeledInput
          label="Confirm new password"
          accessibilityLabel="Confirm new password"
          password
          autoCapitalize="none"
          autoComplete="new-password"
          textContentType="newPassword"
          value={confirm}
          onChangeText={setConfirm}
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
        {done ? (
          <AppText
            variant="label"
            style={styles.success}
            accessibilityRole="alert"
            accessibilityLiveRegion="polite"
          >
            Password changed.
          </AppText>
        ) : null}

        <Button title="Change password" onPress={handleSave} disabled={!canSave} loading={isSubmitting} />
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  error: { color: colors.danger, marginBottom: spacing.md },
  success: { color: colors.successDark, marginBottom: spacing.md },
});
