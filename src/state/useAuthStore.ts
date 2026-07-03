import type { Session } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { create } from 'zustand';

import { supabase } from '@/services/supabase';
import { useProfileStore } from '@/state/useProfileStore';
import { useSettingsStore } from '@/state/useSettingsStore';
import type { UserProfile } from '@/types/models';
import { baselinePerDay } from '@/utils/baseline';

WebBrowser.maybeCompleteAuthSession();

interface AuthState {
  session: Session | null;
  hydrated: boolean;
  /** Premium entitlement — driven by the subscriptions table (Stripe webhook). */
  isPremium: boolean;
  hydrate: () => Promise<void>;
  signInWithGoogle: () => Promise<{ error?: string }>;
  signInWithEmail: (email: string, password: string) => Promise<{ error?: string }>;
  signUpWithEmail: (
    email: string,
    password: string,
  ) => Promise<{ error?: string; needsConfirmation?: boolean }>;
  signOut: () => Promise<void>;
  refreshPremium: () => Promise<void>;
}

/** Tokens arrive in the OAuth redirect URL fragment (implicit flow). */
function tokensFromUrl(url: string): { accessToken: string; refreshToken: string } | null {
  const fragment = url.includes('#') ? url.split('#')[1] : (url.split('?')[1] ?? '');
  const params = new URLSearchParams(fragment);
  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');
  return accessToken && refreshToken ? { accessToken, refreshToken } : null;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  hydrated: false,
  isPremium: false,

  hydrate: async () => {
    // Last known entitlement first, so premium users aren't locked out offline.
    const cached = useSettingsStore.getState().values['premium_cached'] === 'true';
    const { data } = await supabase.auth.getSession();
    set({ session: data.session, isPremium: cached });

    // Existing account on a fresh device: pull their profile down BEFORE the
    // router decides between onboarding and the app.
    if (data.session) {
      await restoreProfileFromCloud();
      get().refreshPremium();
    }
    set({ hydrated: true });

    supabase.auth.onAuthStateChange((_event, session) => {
      set({ session });
      if (session) get().refreshPremium();
    });
  },

  signInWithGoogle: async () => {
    try {
      const redirectTo = Linking.createURL('auth-callback');
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo, skipBrowserRedirect: true },
      });
      if (error || !data.url) return { error: error?.message ?? 'Could not start Google sign-in' };

      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
      if (result.type !== 'success') return { error: 'Sign-in was cancelled' };

      const tokens = tokensFromUrl(result.url);
      if (!tokens) return { error: 'Google did not return a session' };

      const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
        access_token: tokens.accessToken,
        refresh_token: tokens.refreshToken,
      });
      if (sessionError) return { error: sessionError.message };
      set({ session: sessionData.session });
      await restoreProfileFromCloud();
      return {};
    } catch (err) {
      return { error: String(err) };
    }
  },

  signInWithEmail: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    set({ session: data.session });
    await restoreProfileFromCloud();
    return {};
  },

  signUpWithEmail: async (email, password) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) return { error: error.message };
    if (data.session) {
      set({ session: data.session });
      await restoreProfileFromCloud();
    }
    // With email confirmation enabled in Supabase, there's no session yet.
    return { needsConfirmation: !data.session };
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ session: null, isPremium: false });
    useSettingsStore.getState().set('premium_cached', 'false');
  },

  refreshPremium: async () => {
    const userId = get().session?.user.id;
    if (!userId) return;
    try {
      const { data } = await supabase
        .from('subscriptions')
        .select('status, current_period_end')
        .eq('user_id', userId)
        .maybeSingle();
      const active =
        data?.status === 'active' &&
        (!data.current_period_end || new Date(data.current_period_end).getTime() > Date.now());
      set({ isPremium: active });
      useSettingsStore.getState().set('premium_cached', String(active));
    } catch {
      // Offline — keep the cached value already in state.
    }
  },
}));

/** Where should the user land right now? Single source of truth for redirects. */
export function landingRoute(): '/' | '/onboarding' | '/auth' | '/intro' {
  const session = useAuthStore.getState().session;
  const profile = useProfileStore.getState().profile;
  const introSeen = useSettingsStore.getState().values['intro_seen'] === 'true';
  if (!session) return introSeen ? '/auth' : '/intro';
  if (!profile) return '/onboarding';
  return '/';
}

/**
 * Existing account, fresh install: pull the complete profile (profile_json)
 * back from Supabase into local SQLite so the user is NOT re-onboarded and
 * their cloud data is never overwritten by a blank run-through.
 */
export async function restoreProfileFromCloud(): Promise<boolean> {
  const session = useAuthStore.getState().session;
  if (!session) return false;
  if (useProfileStore.getState().profile) return false;
  try {
    const { data } = await supabase
      .from('profiles')
      .select('profile_json')
      .eq('id', session.user.id)
      .maybeSingle();
    const json = data?.profile_json as Partial<UserProfile> | null;
    if (json && json.name && json.programStartDate && Array.isArray(json.products)) {
      const restored: UserProfile = {
        ...(json as UserProfile),
        dob: json.dob ?? null,
        gender: json.gender ?? null,
      };
      await useProfileStore.getState().setProfile(restored);
      return true;
    }
  } catch {
    // Offline or missing table — onboarding remains the fallback.
  }
  return false;
}

/**
 * Mirror the onboarding profile to Supabase so users are manageable centrally,
 * including the full profile_json used for cross-device restore. Logs and
 * Room conversations are intentionally NOT synced.
 */
export async function pushProfileToCloud(profile: UserProfile): Promise<void> {
  const session = useAuthStore.getState().session;
  if (!session) return;
  try {
    await supabase.from('profiles').upsert({
      id: session.user.id,
      email: session.user.email,
      name: profile.name,
      dob: profile.dob,
      gender: profile.gender,
      products: profile.products,
      quit_mode: profile.quitMode,
      quit_date: profile.quitDate,
      program_start_date: profile.programStartDate,
      quit_reasons: profile.quitReasons,
      quit_reason_text: profile.quitReasonText,
      baseline_per_day: Math.round(baselinePerDay(profile) * 10) / 10,
      currency: profile.currency,
      profile_json: profile,
      updated_at: new Date().toISOString(),
    });
  } catch {
    // Best-effort mirror; local data is the source of truth.
  }
}
