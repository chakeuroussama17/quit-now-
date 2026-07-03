import type { Session } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { create } from 'zustand';

import { supabase } from '@/services/supabase';
import { useSettingsStore } from '@/state/useSettingsStore';
import type { UserProfile } from '@/types/models';
import { baselinePerDay } from '@/utils/baseline';

WebBrowser.maybeCompleteAuthSession();

interface AuthState {
  session: Session | null;
  hydrated: boolean;
  /** SOS entitlement — driven by the subscriptions table (Stripe webhook). */
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
    set({ session: data.session, hydrated: true, isPremium: cached });

    supabase.auth.onAuthStateChange((_event, session) => {
      set({ session });
      if (session) get().refreshPremium();
    });

    if (data.session) get().refreshPremium();
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

      const { error: sessionError } = await supabase.auth.setSession({
        access_token: tokens.accessToken,
        refresh_token: tokens.refreshToken,
      });
      if (sessionError) return { error: sessionError.message };
      return {};
    } catch (err) {
      return { error: String(err) };
    }
  },

  signInWithEmail: async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return error ? { error: error.message } : {};
  },

  signUpWithEmail: async (email, password) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) return { error: error.message };
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

/**
 * Mirror the onboarding profile to Supabase so users are manageable centrally.
 * Fire-and-forget: the app never blocks on the network. Logs and Room
 * conversations are intentionally NOT synced.
 */
export async function pushProfileToCloud(profile: UserProfile): Promise<void> {
  const session = useAuthStore.getState().session;
  if (!session) return;
  try {
    await supabase.from('profiles').upsert({
      id: session.user.id,
      email: session.user.email,
      name: profile.name,
      products: profile.products,
      quit_mode: profile.quitMode,
      quit_date: profile.quitDate,
      program_start_date: profile.programStartDate,
      quit_reasons: profile.quitReasons,
      quit_reason_text: profile.quitReasonText,
      baseline_per_day: Math.round(baselinePerDay(profile) * 10) / 10,
      currency: profile.currency,
      updated_at: new Date().toISOString(),
    });
  } catch {
    // Best-effort mirror; local data is the source of truth.
  }
}
