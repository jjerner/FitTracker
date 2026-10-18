import { supabase } from './supabase';

export type AppRelease = { versionCode: number; installUrl: string; notes: string | null };

// Newest APK build; rows are added by hand with SQL after each eas build.
export async function getLatestRelease(): Promise<AppRelease | null> {
  const { data, error } = await supabase
    .from('app_releases')
    .select('version_code, install_url, notes')
    .order('version_code', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data
    ? { versionCode: data.version_code, installUrl: data.install_url, notes: data.notes }
    : null;
}

// ownBuild is Application.nativeBuildVersion: the Android versionCode as a string, null on web.
export function isNewer(ownBuild: string | null, latest: { versionCode: number } | null): boolean {
  if (ownBuild == null || latest == null) return false;
  const own = Number(ownBuild);
  if (Number.isNaN(own)) return false;
  return latest.versionCode > own;
}
