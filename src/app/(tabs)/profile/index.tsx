import { Link } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useSession } from '../../../context/AuthProvider';
import { supabase } from '../../../lib/supabase';

export default function Profile() {
  const { session } = useSession();

  return (
    <View style={styles.container}>
      <Text style={styles.email}>{session?.user.email}</Text>

      <Link href="/(tabs)/profile/goals" asChild>
        <Pressable style={styles.linkButton}>
          <Text style={styles.linkButtonText}>Nutrition Goals</Text>
        </Pressable>
      </Link>

      <Pressable style={styles.signOutButton} onPress={() => supabase.auth.signOut()}>
        <Text style={styles.signOutButtonText}>Sign Out</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  email: { fontSize: 16, color: '#555' },
  linkButton: {
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  linkButtonText: { fontSize: 16, fontWeight: '600' },
  signOutButton: {
    backgroundColor: '#dc2626',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  signOutButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
