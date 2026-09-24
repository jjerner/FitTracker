import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useSession } from '../../context/AuthProvider';
import { supabase } from '../../lib/supabase';

export default function Profile() {
  const { session } = useSession();

  return (
    <View style={styles.container}>
      <Text style={styles.email}>{session?.user.email}</Text>
      <Pressable style={styles.button} onPress={() => supabase.auth.signOut()}>
        <Text style={styles.buttonText}>Sign Out</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  email: { fontSize: 16, color: '#555' },
  button: {
    backgroundColor: '#dc2626',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
