import { create } from 'zustand';

import { getProfile, saveProfile } from '@/db/profileRepo';
import type { UserProfile } from '@/types/models';

interface ProfileState {
  profile: UserProfile | null;
  /** True once we've checked the DB — gates the router redirect. */
  hydrated: boolean;
  hydrate: () => Promise<void>;
  setProfile: (profile: UserProfile) => Promise<void>;
  clearProfile: () => void;
}

export const useProfileStore = create<ProfileState>((set) => ({
  profile: null,
  hydrated: false,

  hydrate: async () => {
    const profile = await getProfile();
    set({ profile, hydrated: true });
  },

  setProfile: async (profile) => {
    await saveProfile(profile);
    set({ profile });
  },

  clearProfile: () => set({ profile: null }),
}));
