import { cancelFoodReminders } from './reminders';
import { supabase } from './supabase';

// The profile row is created by a database trigger on signup, so it always exists.
export async function getDisplayName(userId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('display_name')
    .eq('id', userId)
    .single();

  if (error) throw error;
  return data.display_name;
}

export async function updateDisplayName(userId: string, displayName: string | null): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ display_name: displayName, updated_at: new Date().toISOString() })
    .eq('id', userId);
  if (error) throw error;
}

// Reminders are cancelled first: once signed out they'd nag about an account that isn't there.
export async function signOut(): Promise<void> {
  await cancelFoodReminders().catch(() => {});
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}
