import { create } from 'zustand';

import { getAllSettings, setSetting } from '@/db/settingsRepo';

interface SettingsState {
  values: Record<string, string>;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  set: (key: string, value: string) => Promise<void>;
  getBool: (key: string, fallback?: boolean) => boolean;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  values: {},
  hydrated: false,

  hydrate: async () => {
    const values = await getAllSettings();
    set({ values, hydrated: true });
  },

  set: async (key, value) => {
    await setSetting(key, value);
    set({ values: { ...get().values, [key]: value } });
  },

  getBool: (key, fallback = false) => {
    const v = get().values[key];
    return v == null ? fallback : v === 'true';
  },
}));
