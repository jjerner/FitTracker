import { Link } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { useSession } from '../../../context/AuthProvider';
import { useDisplayName } from '../../../hooks/useDisplayName';
import { supabase } from '../../../lib/supabase';

export default function Profile() {
  const { session } = useSession();
  const { data: savedName, isLoading, saveName, isSaving } = useDisplayName();

  return (
    <View style={styles.container}>
      {isLoading ? (
        <ActivityIndicator />
      ) : (
        <NameEditor savedName={savedName ?? ''} onSave={saveName} isSaving={isSaving} />
      )}
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
        value={name}
        onChangeText={setName}
      />
      <Pressable
        style={[styles.saveButton, !isChanged && styles.saveButtonDisabled]}
        onPress={() => onSave(trimmed || null)}
        disabled={!isChanged || isSaving}
      >
        {isSaving ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.saveButtonText}>Save</Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  nameRow: { flexDirection: 'row', alignSelf: 'stretch', gap: 8, paddingHorizontal: 24 },
  nameInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  saveButton: {
    backgroundColor: '#2563eb',
    borderRadius: 8,
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  saveButtonDisabled: { opacity: 0.5 },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
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
