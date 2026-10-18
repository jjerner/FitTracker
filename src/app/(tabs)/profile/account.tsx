import { router } from 'expo-router';
import { ScrollView } from 'react-native';

import { SettingsGroup, SettingsRow, settingsStyles } from '../../../components/SettingsList';
import { useSession } from '../../../context/AuthProvider';
import { supabase } from '../../../lib/supabase';

export default function AccountSettings() {
  const { session } = useSession();

  return (
    <ScrollView style={settingsStyles.container} contentContainerStyle={settingsStyles.content}>
      <SettingsGroup>
        <SettingsRow icon={{ ios: 'envelope', android: 'mail' }} label={session?.user.email ?? ''} />
        <SettingsRow
          icon={{ ios: 'lock', android: 'lock' }}
          label="Change password"
          chevron
          onPress={() => router.push('/(tabs)/profile/password')}
        />
      </SettingsGroup>
      <SettingsGroup>
        <SettingsRow
          icon={{ ios: 'rectangle.portrait.and.arrow.right', android: 'logout' }}
          label="Sign out"
          onPress={() => supabase.auth.signOut()}
        />
      </SettingsGroup>
      <SettingsGroup>
        <SettingsRow
          icon={{ ios: 'trash', android: 'delete' }}
          label="Delete account"
          destructive
          chevron
          onPress={() => router.push('/(tabs)/profile/delete-account')}
        />
      </SettingsGroup>
    </ScrollView>
  );
}
