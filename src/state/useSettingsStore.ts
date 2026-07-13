import { create } from 'zustand';

import { deleteSetting, getAllSettings, setSetting } from '@/db/settingsRepo';

interface SettingsState {
  values: Record<string, string>;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  set: (key: string, value: string) => Promise<void>;
  /** Deletes the key entirely — `values[key]` becomes undefined, not ''. */
  remove: (key: string) => Promise<void>;
  getBool: (key: string, fallback?: boolean) => boolean;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  values: {},
  hydrated: false,

  hydrate: async () => {
    // Always mark hydrated — the router gates the app on it (see useProfileStore).
    try {
      const values = await getAllSettings();
      set({ values, hydrated: true });
    } catch (err) {
      console.error('[settings] hydrate failed', err);
      set({ hydrated: true });
    }
  },

  set: async (key, value) => {
    await setSetting(key, value);
    set({ values: { ...get().values, [key]: value } });
  },

  remove: async (key) => {
    await deleteSetting(key);
    const { [key]: _, ...rest } = get().values;
    set({ values: rest });
  },

  getBool: (key, fallback = false) => {
    const v = get().values[key];
    return v == null ? fallback : v === 'true';
  },
}));
