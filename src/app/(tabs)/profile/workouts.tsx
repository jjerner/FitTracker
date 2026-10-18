import { ScrollView, Switch } from 'react-native';

import { RestTimeInput } from '../../../components/RestTimeInput';
import { SettingsGroup, SettingsRow, settingsStyles } from '../../../components/SettingsList';
import { useDefaultRest } from '../../../hooks/useDefaultRest';
import { useRestVibration } from '../../../hooks/useRestVibration';

export default function WorkoutSettings() {
  const defaultRest = useDefaultRest();
  const restVibration = useRestVibration();

  return (
    <ScrollView
      style={settingsStyles.container}
      contentContainerStyle={settingsStyles.content}
      keyboardShouldPersistTaps="handled"
    >
      <SettingsGroup>
        <SettingsRow icon={{ ios: 'timer', android: 'timer' }} label="Default rest time">
          {/* Wait for the saved value: the boxes only read it once. */}
          {defaultRest.isLoading ? null : (
            <RestTimeInput
              initialSeconds={defaultRest.seconds}
              min={15}
              label="Default rest"
              onChange={defaultRest.setSeconds}
            />
          )}
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
