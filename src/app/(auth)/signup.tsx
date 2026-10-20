import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';

import { AppText } from '../../components/AppText';
import { Button } from '../../components/Button';
import { LabeledInput } from '../../components/LabeledInput';
import { TextLink } from '../../components/TextLink';
import { supabase } from '../../lib/supabase';
import { colors, spacing } from '../../theme';

export default function Signup() {
  // Set by login when the email isn't confirmed yet: open the code screen directly.
  const params = useLocalSearchParams<{ email?: string; resendFailed?: string }>();
  const [email, setEmail] = useState(params.email ?? '');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(
    params.resendFailed
      ? `We couldn't send a new code. Use the code from your earlier email, or tap "Send again" in a minute.`
      : null,
  );
  const [notice, setNotice] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmationSent, setConfirmationSent] = useState(!!params.email);
  const [code, setCode] = useState('');

  async function handleSignup() {
    setError(null);
    setIsSubmitting(true);
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
    });
    setIsSubmitting(false);

    if (signUpError) {
      setError(signUpError.message);
      return;
    }

    if (data.session) {
      router.replace('/(tabs)/home');
      return;
    }

    // Email confirmation is required before a session exists.
    setConfirmationSent(true);
  }

  async function handleVerify() {
    setError(null);
    setNotice(null);
    setIsSubmitting(true);
    // A valid code confirms the email and signs the user in.
    const { error: verifyError } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: code.trim(),
      type: 'signup',
    });
    setIsSubmitting(false);
    if (verifyError) {
      setError(verifyError.message);
      return;
    }
    router.replace('/(tabs)/home');
  }

  async function handleResend() {
    setError(null);
    setNotice(null);
    setIsSubmitting(true);
    const { error: resendError } = await supabase.auth.resend({
      type: 'signup',
      email: email.trim(),
    });
    setIsSubmitting(false);
    if (resendError) setError(resendError.message);
    else setNotice('New code sent.');
  }

  if (confirmationSent) {
    return (
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <AppText variant="title" accessibilityRole="header" style={styles.title}>
          Check your email
        </AppText>
        <AppText style={styles.info}>
          {params.email ? "Your email isn't confirmed yet. " : ''}We sent a code to {email.trim()}.
          Enter it below.
        </AppText>
        <LabeledInput
          label="Code from email"
          placeholder="123456"
          keyboardType="number-pad"
          value={code}
          onChangeText={setCode}
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
        {notice ? (
          <AppText style={styles.info} accessibilityRole="alert" accessibilityLiveRegion="polite">
            {notice}
          </AppText>
        ) : null}

        <Button title="Verify" onPress={handleVerify} loading={isSubmitting} style={styles.button} />

        <TextLink
          title="Didn't get it? Send again"
          onPress={handleResend}
          disabled={isSubmitting}
          style={styles.firstLink}
        />
        <TextLink title="Back to log in" onPress={() => router.navigate('/(auth)/login')} />
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <AppText variant="title" accessibilityRole="header" style={styles.title}>
        Create account
      </AppText>

      <LabeledInput
        label="Email address"
        placeholder="you@example.com"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <LabeledInput
        label="Password"
        placeholder="Choose a password"
        password
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

      <Button title="Sign Up" onPress={handleSignup} loading={isSubmitting} style={styles.button} />

      <TextLink
        title="Already have an account? Log in"
        onPress={() => router.navigate('/(auth)/login')}
        style={styles.firstLink}
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
    marginBottom: spacing.xl,
    textAlign: 'center',
  },
  info: {
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  button: { marginTop: spacing.sm },
  error: {
    color: colors.danger,
    marginBottom: spacing.md,
  },
  firstLink: { marginTop: spacing.sm },
});
