import type { Sex } from './goalHelper';
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

// Body facts for the goal helper. Only the helper shows them; the Profile screen stays name-only.
export type BodyProfile = { sex: Sex | null; heightCm: number | null; birthYear: number | null };

export async function getBodyProfile(userId: string): Promise<BodyProfile> {
  const { data, error } = await supabase
    .from('profiles')
    .select('sex, height_cm, date_of_birth')
    .eq('id', userId)
    .single();

  if (error) throw error;
  return {
    sex: data.sex === 'male' || data.sex === 'female' ? data.sex : null,
    heightCm: data.height_cm === null ? null : Number(data.height_cm),
    birthYear: data.date_of_birth ? Number(data.date_of_birth.slice(0, 4)) : null,
  };
}

// The birth year is saved as 1 July, so the age is off by at most half a year.
export async function updateBodyProfile(
  userId: string,
  body: { sex: Sex; heightCm: number; birthYear: number }
): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({
      sex: body.sex,
      height_cm: body.heightCm,
      date_of_birth: `${body.birthYear}-07-01`,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);
  if (error) throw error;
}
