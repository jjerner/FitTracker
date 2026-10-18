import { router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { SettingsGroup, SettingsRow, settingsStyles } from '../../../components/SettingsList';
import { useSession } from '../../../context/AuthProvider';
import { useDisplayName } from '../../../hooks/useDisplayName';
import { colors, radius, spacing } from '../../../theme';

export default function Profile() {
  const { session } = useSession();
  const { data: savedName, isLoading, saveName, isSaving } = useDisplayName();

  return (
    <ScrollView
      style={settingsStyles.container}
      contentContainerStyle={settingsStyles.content}
      keyboardShouldPersistTaps="handled"
    >
      <View>
        <Text style={styles.label}>Name</Text>
        {isLoading ? (
          <ActivityIndicator />
        ) : (
          <NameEditor savedName={savedName ?? ''} onSave={saveName} isSaving={isSaving} />
        )}
        <Text style={styles.email}>{session?.user.email}</Text>
      </View>

      <SettingsGroup>
        <SettingsRow
          icon={{ ios: 'target', android: 'target' }}
          label="Goals"
          chevron
          onPress={() => router.push('/(tabs)/profile/goals')}
        />
        <SettingsRow
          icon={{ ios: 'dumbbell.fill', android: 'fitness_center' }}
          label="Workouts"
          chevron
          onPress={() => router.push('/(tabs)/profile/workouts')}
        />
        <SettingsRow
          icon={{ ios: 'bell.fill', android: 'notifications' }}
          label="Reminders"
          chevron
          onPress={() => router.push('/(tabs)/profile/reminders')}
        />
      </SettingsGroup>

      <SettingsGroup>
        <SettingsRow
          icon={{ ios: 'person.crop.circle', android: 'account_circle' }}
          label="Account"
          chevron
          onPress={() => router.push('/(tabs)/profile/account')}
        />
      </SettingsGroup>
    </ScrollView>
  );
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
        accessibilityLabel="Name"
        value={name}
        onChangeText={setName}
      />
      <Pressable
        style={[styles.saveButton, !isChanged && styles.saveButtonDisabled]}
        onPress={() => onSave(trimmed || null)}
        disabled={!isChanged || isSaving}
      >
        {isSaving ? (
          <ActivityIndicator color={colors.onPrimary} />
        ) : (
          <Text style={styles.saveButtonText}>Save</Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.muted,
    textTransform: 'uppercase',
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
  saveButtonText: { color: colors.onPrimary, fontSize: 16, fontWeight: '600' },
  email: { fontSize: 14, color: colors.muted, marginTop: spacing.sm },
});
