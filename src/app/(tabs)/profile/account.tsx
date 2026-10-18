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
      </SettingsGroup>
      {/* 5.7 adds "Change password" to this group and a red "Delete account" group below it. */}
      <SettingsGroup>
        <SettingsRow
          icon={{ ios: 'rectangle.portrait.and.arrow.right', android: 'logout' }}
          label="Sign out"
          onPress={() => supabase.auth.signOut()}
        />
      </SettingsGroup>
    </ScrollView>
  );
}
