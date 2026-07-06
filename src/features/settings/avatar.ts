import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';

import { supabase, SUPABASE_URL } from '@/services/supabase';
import { useAuthStore } from '@/state/useAuthStore';
import { useSettingsStore } from '@/state/useSettingsStore';

/**
 * Profile photo. Stored TWICE on purpose:
 *  - locally in the `avatar_uri` setting for instant display, and
 *  - in Supabase Storage (bucket "avatars", path "<userId>.jpg") + the
 *    profiles.avatar_url column, so it survives sign-out, account switches
 *    and reinstalls (restored on the next login).
 * The account-switch wipe clears the local copy; the cloud copy is the source
 * of truth for a returning user.
 */

/** Public URL for a user's stored avatar (bucket is public-read). */
function publicAvatarUrl(userId: string, version: number): string {
  return `${SUPABASE_URL}/storage/v1/object/public/avatars/${userId}.jpg?v=${version}`;
}

async function uploadAvatar(
  localUri: string,
  userId: string,
  token: string,
): Promise<string | null> {
  try {
    const uploadUrl = `${SUPABASE_URL}/storage/v1/object/avatars/${userId}.jpg`;
    const res = await FileSystem.uploadAsync(uploadUrl, localUri, {
      httpMethod: 'POST',
      uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'image/jpeg',
        'x-upsert': 'true',
      },
    });
    if (res.status < 200 || res.status >= 300) return null;
    const url = publicAvatarUrl(userId, Date.now());
    await supabase.from('profiles').update({ avatar_url: url }).eq('id', userId);
    return url;
  } catch {
    return null;
  }
}

export async function pickAvatar(): Promise<boolean> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.8,
  });
  if (result.canceled || !result.assets[0]) return false;

  const setSetting = useSettingsStore.getState().set;

  // Show it immediately from a local copy that survives the picker cache.
  const previous = useSettingsStore.getState().values['avatar_uri'];
  const dest = `${FileSystem.documentDirectory}avatar-${Date.now()}.jpg`;
  await FileSystem.copyAsync({ from: result.assets[0].uri, to: dest });
  await setSetting('avatar_uri', dest);
  if (previous?.startsWith('file:'))
    FileSystem.deleteAsync(previous, { idempotent: true }).catch(() => {});

  // Persist to the cloud so it comes back after logout / on other devices.
  const session = useAuthStore.getState().session;
  if (session) {
    const token = session.access_token;
    const remoteUrl = await uploadAvatar(result.assets[0].uri, session.user.id, token);
    if (remoteUrl) await setSetting('avatar_uri', remoteUrl);
  }
  return true;
}
