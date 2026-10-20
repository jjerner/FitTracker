import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';

import { AppText } from '../../components/AppText';
import { Button } from '../../components/Button';
import { LabeledInput } from '../../components/LabeledInput';
import { TextLink } from '../../components/TextLink';
import { supabase } from '../../lib/supabase';
import { colors, spacing } from '../../theme';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleLogin() {
    const trimmed = email.trim();
    setError(null);
    setIsSubmitting(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: trimmed,
      password,
    });

    // Unconfirmed email: send a fresh code and open the code screen instead of a dead end.
    if (signInError?.code === 'email_not_confirmed') {
      const { error: resendError } = await supabase.auth.resend({
        type: 'signup',
        email: trimmed,
      });
      setIsSubmitting(false);
      router.push({
        pathname: '/(auth)/signup',
        params: { email: trimmed, ...(resendError && { resendFailed: '1' }) },
      });
      return;
    }
    setIsSubmitting(false);

    if (signInError) {
      setError(signInError.message);
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
        Plucky
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
        placeholder="Your password"
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

      <Button title="Log In" onPress={handleLogin} loading={isSubmitting} style={styles.button} />

      <TextLink
        title="Forgot password?"
        onPress={() => router.navigate('/(auth)/forgot-password')}
        style={styles.firstLink}
      />
      <TextLink
        title="Don't have an account? Sign up"
        onPress={() => router.navigate('/(auth)/signup')}
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
    marginBottom: spacing.xxl,
    textAlign: 'center',
  },
  button: { marginTop: spacing.sm },
  error: {
    color: colors.danger,
    marginBottom: spacing.md,
  },
  firstLink: { marginTop: spacing.sm },
});
