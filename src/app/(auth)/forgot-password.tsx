import { Link, router } from 'expo-router';
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
      <Text style={styles.title}>Reset password</Text>

      {!codeSent ? (
        <>
          <Text style={styles.info}>Enter your email and we&apos;ll send you a reset code.</Text>
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
          <Text style={styles.info}>
            We sent a code to {email.trim()}. Enter it below with your new password.
          </Text>
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

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable
        style={styles.button}
        onPress={codeSent ? handleSetPassword : handleSendCode}
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <ActivityIndicator color={colors.onPrimary} />
        ) : (
          <Text style={styles.buttonText}>{codeSent ? 'Set New Password' : 'Send Code'}</Text>
        )}
      </Pressable>

      {codeSent && (
        <Pressable onPress={handleSendCode} disabled={isSubmitting}>
          <Text style={styles.link}>Didn&apos;t get it? Send again</Text>
        </Pressable>
      )}

      <Link href="/(auth)/login" style={styles.link}>
        <Text>Back to log in</Text>
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
    marginBottom: 16,
    textAlign: 'center',
  },
  info: {
    fontSize: 15,
    color: colors.textSecondary,
    marginBottom: 16,
    textAlign: 'center',
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
