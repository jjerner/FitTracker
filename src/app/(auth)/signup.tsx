import { Link, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
} from 'react-native';

import { LabeledInput } from '../../components/LabeledInput';
import { supabase } from '../../lib/supabase';
import { colors } from '../../theme';

export default function Signup() {
  // Set by login when the email isn't confirmed yet: open the code screen directly.
  const params = useLocalSearchParams<{ email?: string; error?: string }>();
  const [email, setEmail] = useState(params.email ?? '');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(params.error ?? null);
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
    setIsSubmitting(true);
    const { error: resendError } = await supabase.auth.resend({
      type: 'signup',
      email: email.trim(),
    });
    setIsSubmitting(false);
    if (resendError) setError(resendError.message);
  }

  if (confirmationSent) {
    return (
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Text style={styles.title}>Check your email</Text>
        <Text style={styles.info}>We sent a code to {email.trim()}. Enter it below.</Text>
        <LabeledInput
          label="Code from email"
          placeholder="123456"
          keyboardType="number-pad"
          value={code}
          onChangeText={setCode}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable style={styles.button} onPress={handleVerify} disabled={isSubmitting}>
          {isSubmitting ? (
            <ActivityIndicator color={colors.onPrimary} />
          ) : (
            <Text style={styles.buttonText}>Verify</Text>
          )}
        </Pressable>

        <Pressable onPress={handleResend} disabled={isSubmitting} hitSlop={12}>
          <Text style={styles.link}>Didn&apos;t get it? Send again</Text>
        </Pressable>

        <Link href="/(auth)/login" style={styles.link}>
          <Text>Back to log in</Text>
        </Link>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Text style={styles.title}>Create account</Text>

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

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable style={styles.button} onPress={handleSignup} disabled={isSubmitting}>
        {isSubmitting ? (
          <ActivityIndicator color={colors.onPrimary} />
        ) : (
          <Text style={styles.buttonText}>Sign Up</Text>
        )}
      </Pressable>

      <Link href="/(auth)/login" style={styles.link}>
        <Text>Already have an account? Log in</Text>
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
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 24,
    textAlign: 'center',
  },
  info: {
    fontSize: 15,
    color: colors.textSecondary,
    marginBottom: 16,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: colors.onPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  error: {
    color: colors.danger,
    marginBottom: 12,
  },
  link: {
    marginTop: 20,
    textAlign: 'center',
  },
});
