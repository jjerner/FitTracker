import { Link, router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text } from 'react-native';

import { Button } from '../../components/Button';
import { LabeledInput } from '../../components/LabeledInput';
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
      <Text style={styles.title}>Plucky</Text>

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

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Button title="Log In" onPress={handleLogin} loading={isSubmitting} style={styles.button} />

      <Link href="/(auth)/forgot-password" style={styles.link}>
        <Text>Forgot password?</Text>
      </Link>

      <Link href="/(auth)/signup" style={styles.link}>
        <Text>Don&apos;t have an account? Sign up</Text>
      </Link>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    backgroundColor: colors.background,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 32,
    textAlign: 'center',
  },
  button: { marginTop: spacing.sm },
  error: {
    color: colors.danger,
    marginBottom: 12,
  },
  link: {
    marginTop: 20,
    textAlign: 'center',
  },
});
