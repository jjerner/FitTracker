import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { LabeledInput } from '../../../components/LabeledInput';
import { settingsStyles } from '../../../components/SettingsList';
import { useSession } from '../../../context/AuthProvider';
import { supabase } from '../../../lib/supabase';
import { colors, radius, spacing } from '../../../theme';

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
      <View>
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
          <Text
            style={styles.error}
            selectable
            accessibilityRole="alert"
            accessibilityLiveRegion="polite"
          >
            {error}
          </Text>
        ) : null}
        {done ? (
          <Text style={styles.success} accessibilityRole="alert" accessibilityLiveRegion="polite">
            Password changed.
          </Text>
        ) : null}

        <Pressable
          style={[styles.button, !canSave && styles.buttonDisabled]}
          onPress={handleSave}
          disabled={!canSave}
          accessibilityRole="button"
          accessibilityLabel="Change password"
          accessibilityState={{ disabled: !canSave, busy: isSubmitting }}
        >
          {isSubmitting ? (
            <ActivityIndicator color={colors.onPrimary} />
          ) : (
            <Text style={styles.buttonText}>Change password</Text>
          )}
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    padding: 14,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: colors.onPrimary, fontSize: 16, fontWeight: '600' },
  error: { color: colors.danger, marginBottom: spacing.md },
  success: { color: colors.success, marginBottom: spacing.md, fontWeight: '600' },
});
