import { Alert, ScrollView, Switch } from 'react-native';

import { SettingsGroup, SettingsRow, settingsStyles, Stepper } from '../../../components/SettingsList';
import { useFoodReminder } from '../../../hooks/useFoodReminder';
import { useMealReminder } from '../../../hooks/useMealReminder';

const BELL = { ios: 'bell.fill', android: 'notifications' } as const;

export default function ReminderSettings() {
  const foodReminder = useFoodReminder();
  const mealReminder = useMealReminder();

  async function handleReminderToggle(setEnabled: (enabled: boolean) => Promise<boolean>, enabled: boolean) {
    const allowed = await setEnabled(enabled);
    if (!allowed) {
      Alert.alert('Notifications are off', 'Allow notifications for Plucky in your phone settings.');
    }
  }

  return (
    <ScrollView style={settingsStyles.container} contentContainerStyle={settingsStyles.content}>
      <SettingsGroup>
        <SettingsRow icon={BELL} label="Remind me if no food logged">
          <Switch
            accessibilityLabel="Remind me if no food logged"
            value={foodReminder.enabled}
            onValueChange={(on) => handleReminderToggle(foodReminder.setEnabled, on)}
          />
        </SettingsRow>
        {foodReminder.enabled ? (
          <SettingsRow label="Reminder time">
            <Stepper
              value={formatMinutes(foodReminder.minutes)}
              decreaseLabel="Earlier reminder"
              increaseLabel="Later reminder"
              onDecrease={() => foodReminder.setMinutes((foodReminder.minutes + 24 * 60 - 30) % (24 * 60))}
              onIncrease={() => foodReminder.setMinutes((foodReminder.minutes + 30) % (24 * 60))}
            />
          </SettingsRow>
        ) : null}
        <SettingsRow icon={BELL} label="Remind me about missing meals (20:30)">
          <Switch
            accessibilityLabel="Remind me about missing meals (20:30)"
            value={mealReminder.enabled}
            onValueChange={(on) => handleReminderToggle(mealReminder.setEnabled, on)}
          />
        </SettingsRow>
      </SettingsGroup>
    </ScrollView>
  );
}

function formatMinutes(minutes: number): string {
  const h = String(Math.floor(minutes / 60)).padStart(2, '0');
  const m = String(minutes % 60).padStart(2, '0');
  return `${h}:${m}`;
}
