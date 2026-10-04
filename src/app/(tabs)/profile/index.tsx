import { Link } from 'expo-router';
import { useState } from 'react';
import { SymbolView } from 'expo-symbols';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useSession } from '../../../context/AuthProvider';
import { useDisplayName } from '../../../hooks/useDisplayName';
import { useFoodReminder } from '../../../hooks/useFoodReminder';
import { useRestVibration } from '../../../hooks/useRestVibration';
import { supabase } from '../../../lib/supabase';
import { colors, radius, spacing } from '../../../theme';

export default function Profile() {
  const { session } = useSession();
  const { data: savedName, isLoading, saveName, isSaving } = useDisplayName();
  const restVibration = useRestVibration();
  const foodReminder = useFoodReminder();

  async function handleReminderToggle(enabled: boolean) {
    const allowed = await foodReminder.setEnabled(enabled);
    if (!allowed) {
      Alert.alert('Notifications are off', 'Allow notifications for FitTrack in your phone settings.');
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.label}>Name</Text>
      {isLoading ? (
        <ActivityIndicator />
      ) : (
        <NameEditor savedName={savedName ?? ''} onSave={saveName} isSaving={isSaving} />
      )}
      <Text style={styles.email}>{session?.user.email}</Text>

      <Text style={styles.label}>Settings</Text>
      <Link href="/(tabs)/profile/goals" asChild>
        <Pressable style={styles.row}>
          <SymbolView
            name={{ ios: 'target', android: 'target' }}
            tintColor={colors.primary}
            size={22}
          />
          <Text style={styles.rowText}>Nutrition Goals</Text>
          <SymbolView
            name={{ ios: 'chevron.right', android: 'chevron_right' }}
            tintColor={colors.muted}
            size={22}
          />
        </Pressable>
      </Link>
      <View style={[styles.row, styles.rowSpaced]}>
        <SymbolView
          name={{ ios: 'iphone.radiowaves.left.and.right', android: 'vibration' }}
          tintColor={colors.primary}
          size={22}
        />
        <Text style={styles.rowText}>Vibrate when rest ends</Text>
        <Switch value={restVibration.enabled} onValueChange={restVibration.setEnabled} />
      </View>
      <View style={[styles.row, styles.rowSpaced]}>
        <SymbolView
          name={{ ios: 'bell.fill', android: 'notifications' }}
          tintColor={colors.primary}
          size={22}
        />
        <Text style={styles.rowText}>Remind me if no food logged</Text>
        <Switch value={foodReminder.enabled} onValueChange={handleReminderToggle} />
      </View>
      {foodReminder.enabled ? (
        <View style={[styles.row, styles.rowSpaced]}>
          <Text style={styles.rowText}>Reminder time</Text>
          <Pressable
            style={styles.stepButton}
            onPress={() => foodReminder.setMinutes((foodReminder.minutes + 24 * 60 - 30) % (24 * 60))}
          >
            <Text style={styles.stepButtonText}>−</Text>
          </Pressable>
          <Text style={styles.timeText}>{formatMinutes(foodReminder.minutes)}</Text>
          <Pressable
            style={styles.stepButton}
            onPress={() => foodReminder.setMinutes((foodReminder.minutes + 30) % (24 * 60))}
          >
            <Text style={styles.stepButtonText}>+</Text>
          </Pressable>
        </View>
      ) : null}

      <Pressable style={styles.signOutButton} onPress={() => supabase.auth.signOut()}>
        <Text style={styles.signOutButtonText}>Sign Out</Text>
      </Pressable>
    </ScrollView>
  );
}

function formatMinutes(minutes: number): string {
  const h = String(Math.floor(minutes / 60)).padStart(2, '0');
  const m = String(minutes % 60).padStart(2, '0');
  return `${h}:${m}`;
}

function NameEditor({
  savedName,
  onSave,
  isSaving,
}: {
  savedName: string;
  onSave: (name: string | null) => void;
  isSaving: boolean;
}) {
  const [name, setName] = useState(savedName);
  const trimmed = name.trim();
  const isChanged = trimmed !== savedName;

  return (
    <View style={styles.nameRow}>
      <TextInput
        style={styles.nameInput}
        placeholder="Your name"
        value={name}
        onChangeText={setName}
      />
      <Pressable
        style={[styles.saveButton, !isChanged && styles.saveButtonDisabled]}
        onPress={() => onSave(trimmed || null)}
        disabled={!isChanged || isSaving}
      >
        {isSaving ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.saveButtonText}>Save</Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.muted,
    textTransform: 'uppercase',
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  nameRow: { flexDirection: 'row', gap: spacing.sm },
  nameInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    fontSize: 16,
    color: colors.text,
  },
  saveButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  saveButtonDisabled: { opacity: 0.5 },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  email: { fontSize: 14, color: colors.muted, marginTop: spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  rowSpaced: { marginTop: spacing.sm, paddingVertical: spacing.sm },
  rowText: { flex: 1, fontSize: 16, fontWeight: '600', color: colors.text },
  stepButton: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepButtonText: { fontSize: 20, fontWeight: '600', color: colors.primary },
  timeText: { fontSize: 16, fontWeight: '600', color: colors.text, minWidth: 52, textAlign: 'center' },
  signOutButton: {
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
    marginTop: 40,
  },
  signOutButtonText: { color: colors.danger, fontSize: 16, fontWeight: '600' },
});
