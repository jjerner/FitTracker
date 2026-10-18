import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { LabeledInput } from '../../../components/LabeledInput';
import { settingsStyles } from '../../../components/SettingsList';
import { useSession } from '../../../context/AuthProvider';
import { supabase } from '../../../lib/supabase';
import { colors, radius, spacing } from '../../../theme';

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
      setError('Wrong password. Nothing was deleted.');
      return;
    }
    if (!(await confirmDelete())) {
      setIsSubmitting(false);
      return;
    }
    const { error: deleteError } = await supabase.rpc('delete_my_account');
    if (deleteError) {
      setIsSubmitting(false);
      setError('Could not delete account. Check your connection and try again.');
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
      <View style={styles.info}>
        <Text style={styles.heading}>This deletes your account forever</Text>
        <Text style={styles.body}>
          Everything you have saved in Plucky is removed: your food diary, workouts, weights, goals,
          routines, custom foods and exercises, and saved meals.
        </Text>
        <Text style={styles.body}>This cannot be undone.</Text>
      </View>

      <View>
        <LabeledInput
          label="Type your password to continue"
          accessibilityLabel="Password"
          password
          autoCapitalize="none"
          value={password}
          onChangeText={setPassword}
        />

        {error ? (
          <Text style={styles.error} selectable>
            {error}
          </Text>
        ) : null}

        <Pressable
          style={[styles.button, !canDelete && styles.buttonDisabled]}
          onPress={handleDelete}
          disabled={!canDelete}
          accessibilityRole="button"
          accessibilityLabel="Delete my account"
          accessibilityState={{ disabled: !canDelete, busy: isSubmitting }}
        >
          {isSubmitting ? (
            <ActivityIndicator color={colors.onPrimary} />
          ) : (
            <Text style={styles.buttonText}>Delete my account</Text>
          )}
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  info: { gap: spacing.sm },
  heading: { fontSize: 18, fontWeight: '700', color: colors.text },
  body: { fontSize: 15, color: colors.textSecondary },
  button: {
    backgroundColor: colors.danger,
    borderRadius: radius.md,
    padding: 14,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: colors.onPrimary, fontSize: 16, fontWeight: '600' },
  error: { color: colors.danger, marginBottom: spacing.md },
});
