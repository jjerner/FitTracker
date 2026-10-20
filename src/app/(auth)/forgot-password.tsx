import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';

import { AppText } from '../../components/AppText';
import { Button } from '../../components/Button';
import { LabeledInput } from '../../components/LabeledInput';
import { TextLink } from '../../components/TextLink';
import { supabase } from '../../lib/supabase';
import { colors, spacing } from '../../theme';

// Two steps: 1) email us a reset code, 2) enter the code + a new password.
// A code instead of a link, so it works without deep links (e.g. in Expo Go).
// Needs {{ .Token }} in Supabase's "Reset Password" email template.
export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSendCode() {
    setError(null);
    setIsSubmitting(true);
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim());
    setIsSubmitting(false);

    if (resetError) {
      setError(resetError.message);
      return;
    }
    setCodeSent(true);
  }

  async function handleSetPassword() {
    setError(null);
    setIsSubmitting(true);
    // A valid code signs the user in, which is what allows changing the password.
    const { error: verifyError } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: code.trim(),
      type: 'recovery',
    });
    if (verifyError) {
      setIsSubmitting(false);
      setError(verifyError.message);
      return;
    }

    const { error: updateError } = await supabase.auth.updateUser({ password });
    setIsSubmitting(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }

    router.replace('/(tabs)/home');
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <AppText variant="title" accessibilityRole="header" style={styles.title}>
        Reset password
      </AppText>

      {!codeSent ? (
        <>
          <AppText style={styles.info}>
            Enter your email and we&apos;ll send you a reset code.
          </AppText>
          <LabeledInput
            label="Email address"
            placeholder="you@example.com"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
        </>
      ) : (
        <>
          <AppText style={styles.info}>
            We sent a code to {email.trim()}. Enter it below with your new password.
          </AppText>
          <LabeledInput
            label="Code from email"
            placeholder="123456"
            keyboardType="number-pad"
            value={code}
            onChangeText={setCode}
          />
          <LabeledInput
            label="New password"
            placeholder="Choose a new password"
            password
            value={password}
            onChangeText={setPassword}
          />
        </>
      )}

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
        title={codeSent ? 'Set New Password' : 'Send Code'}
        onPress={codeSent ? handleSetPassword : handleSendCode}
        loading={isSubmitting}
        style={styles.button}
      />

      {codeSent && (
        <TextLink
          title="Didn't get it? Send again"
          onPress={handleSendCode}
          disabled={isSubmitting}
          style={styles.firstLink}
        />
      )}

      <TextLink
        title="Back to log in"
        onPress={() => router.navigate('/(auth)/login')}
        style={!codeSent && styles.firstLink}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    backgroundColor: colors.background,
  },
  title: {
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  info: {
    color: colors.textSecondary,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  button: { marginTop: spacing.sm },
  error: {
    color: colors.danger,
    marginBottom: spacing.md,
  },
  firstLink: { marginTop: spacing.sm },
});
