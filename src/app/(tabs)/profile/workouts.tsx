import { ScrollView, Switch } from 'react-native';

import { SettingsGroup, SettingsRow, settingsStyles, Stepper } from '../../../components/SettingsList';
import { useDefaultRest } from '../../../hooks/useDefaultRest';
import { useRestVibration } from '../../../hooks/useRestVibration';

export default function WorkoutSettings() {
  const defaultRest = useDefaultRest();
  const restVibration = useRestVibration();

  return (
    <ScrollView style={settingsStyles.container} contentContainerStyle={settingsStyles.content}>
      <SettingsGroup>
        <SettingsRow icon={{ ios: 'timer', android: 'timer' }} label="Default rest time">
          <Stepper
            value={formatRest(defaultRest.seconds)}
            decreaseLabel="Shorter rest time"
            increaseLabel="Longer rest time"
            onDecrease={() => defaultRest.setSeconds(Math.max(15, defaultRest.seconds - 15))}
            onIncrease={() => defaultRest.setSeconds(Math.min(600, defaultRest.seconds + 15))}
          />
        </SettingsRow>
        <SettingsRow
          icon={{ ios: 'iphone.radiowaves.left.and.right', android: 'vibration' }}
          label="Vibrate when rest ends"
        >
          <Switch
            accessibilityLabel="Vibrate when rest ends"
            value={restVibration.enabled}
            onValueChange={restVibration.setEnabled}
          />
        </SettingsRow>
      </SettingsGroup>
    </ScrollView>
  );
}

function formatRest(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}
