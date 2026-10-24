import { useState } from 'react';
import { ActivityIndicator, Alert, ScrollView } from 'react-native';

import { SettingsGroup, SettingsRow, settingsStyles } from '../../../components/SettingsList';
import { useSession } from '../../../context/AuthProvider';
import { exportFileName, foodLogCsv, shareCsv, weightsCsv, workoutsCsv } from '../../../lib/exportData';
import { colors } from '../../../theme';

type Kind = 'food' | 'workouts' | 'weight';

const kinds = {
  food: { fileName: 'food-log', csv: foodLogCsv },
  workouts: { fileName: 'workouts', csv: workoutsCsv },
  weight: { fileName: 'weight', csv: weightsCsv },
} as const;

export default function ExportData() {
  const { session } = useSession();
  const [busy, setBusy] = useState<Kind | null>(null);

  async function run(kind: Kind) {
    if (!session) return;
    setBusy(kind);
    try {
      const csv = await kinds[kind].csv(session.user.id);
      await shareCsv(exportFileName(kinds[kind].fileName), csv);
    } catch {
      Alert.alert("Couldn't export", 'Check your connection and try again.');
    } finally {
      setBusy(null);
    }
  }

  // While an export runs, every row is a plain View, so a second tap does nothing.
  const onPress = (kind: Kind) => (busy ? undefined : () => run(kind));
  const spinner = (kind: Kind) =>
    busy === kind ? <ActivityIndicator color={colors.primary} accessibilityLabel="Exporting" /> : null;

  return (
    <ScrollView style={settingsStyles.container} contentContainerStyle={settingsStyles.content}>
      <SettingsGroup>
        <SettingsRow
          icon={{ ios: 'fork.knife', android: 'restaurant' }}
          label="Food log (CSV)"
          onPress={onPress('food')}
        >
          {spinner('food')}
        </SettingsRow>
        <SettingsRow
          icon={{ ios: 'dumbbell.fill', android: 'fitness_center' }}
          label="Workouts (CSV)"
          onPress={onPress('workouts')}
        >
          {spinner('workouts')}
        </SettingsRow>
        <SettingsRow
          icon={{ ios: 'scalemass', android: 'monitor_weight' }}
          label="Weight (CSV)"
          onPress={onPress('weight')}
        >
          {spinner('weight')}
        </SettingsRow>
      </SettingsGroup>
    </ScrollView>
  );
}
