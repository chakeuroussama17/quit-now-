import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';

import { useSettingsStore } from '@/state/useSettingsStore';

/**
 * Profile photo: picked via the system photo picker (no permissions needed on
 * modern Android), cropped square, copied into app storage so it survives the
 * picker cache being cleared. Stored as a settings key — local only.
 */
export async function pickAvatar(): Promise<boolean> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.8,
  });
  if (result.canceled || !result.assets[0]) return false;

  const previous = useSettingsStore.getState().values['avatar_uri'];
  const dest = `${FileSystem.documentDirectory}avatar-${Date.now()}.jpg`;
  await FileSystem.copyAsync({ from: result.assets[0].uri, to: dest });
  await useSettingsStore.getState().set('avatar_uri', dest);
  if (previous) FileSystem.deleteAsync(previous, { idempotent: true }).catch(() => {});
  return true;
}
