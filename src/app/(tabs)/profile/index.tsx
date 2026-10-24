import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { AppText } from '../../../components/AppText';
import { Button } from '../../../components/Button';
import { Card } from '../../../components/Card';
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
      <Card>
        <AppText variant="labelSmall" style={styles.label}>Name</AppText>
        {isLoading ? (
          <ActivityIndicator />
        ) : (
          <NameEditor savedName={savedName ?? ''} onSave={saveName} isSaving={isSaving} />
        )}
        <AppText variant="small">{session?.user.email}</AppText>
      </Card>

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
      <Button title="Save" onPress={() => onSave(trimmed || null)} disabled={!isChanged} loading={isSaving} />
    </View>
  );
}

const styles = StyleSheet.create({
  label: { color: colors.textSecondary, textTransform: 'uppercase' },
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
});
