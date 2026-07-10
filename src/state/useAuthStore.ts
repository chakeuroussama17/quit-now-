import type { Session } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { create } from 'zustand';

import { wipeAllData } from '@/db/database';
import { invalidateContextCache } from '@/services/contextBuilder';
import {
  configurePurchases,
  getPremiumFromRC,
  logoutPurchases,
  onPremiumChange,
  purchasesConfigured,
} from '@/services/purchases';
import { supabase } from '@/services/supabase';
import { useLogsStore } from '@/state/useLogsStore';
import { useProfileStore } from '@/state/useProfileStore';
import { useSettingsStore } from '@/state/useSettingsStore';
import type { UserProfile } from '@/types/models';
import { baselinePerDay } from '@/utils/baseline';

let premiumListenerBound = false;
let deepLinkListenerBound = false;

/**
 * Absorb an OAuth redirect the moment it lands, from anywhere in the app.
 *
 * This CANNOT live in the auth-callback screen: the `url` event is what routes
 * us there, so by the time the screen mounts and subscribes, the event has
 * already fired and is gone. Bind at startup instead, before any sign-in can
 * begin, and the tokens are never missed.
 */
async function consumeAuthDeepLink(url: string): Promise<void> {
  if (!url.includes('auth-callback')) return;
  const outcome = await absorbAuthTokens(url);
  if (outcome.kind === 'session') return;
  // Visible in `adb logcat -s ReactNativeJS`. Parameter names only.
  console.warn('[auth deep link]', JSON.stringify(outcome));
  useAuthStore.setState({
    authError:
      outcome.kind === 'error'
        ? outcome.message
        : `Callback carried no session — ${outcome.detail}`,
  });
}

function bindDeepLinkAuth(): void {
  if (deepLinkListenerBound) return;
  deepLinkListenerBound = true;
  Linking.addEventListener('url', ({ url }) => void consumeAuthDeepLink(url));
  // Cold start straight from the link (app was killed).
  Linking.getInitialURL().then((url) => {
    if (url) void consumeAuthDeepLink(url);
  });
}

/** Bind the RevenueCat entitlement listener once, after configure() has run. */
function bindPremiumListener(set: (partial: Partial<AuthState>) => void): void {
  if (premiumListenerBound || !purchasesConfigured()) return;
  premiumListenerBound = true;
  onPremiumChange((isPremium) => {
    set({ isPremium });
    useSettingsStore.getState().set('premium_cached', String(isPremium));
  });
}

WebBrowser.maybeCompleteAuthSession();

interface AuthState {
  session: Session | null;
  hydrated: boolean;
  /** Premium entitlement — driven by the subscriptions table (Stripe webhook). */
  isPremium: boolean;
  /** Why the last deep-link sign-in failed. Surfaced on the auth screen. */
  authError: string | null;
  clearAuthError: () => void;
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

/**
 * The provider may answer in the fragment (implicit flow) or the query string
 * (PKCE, or an error bounce). Read both — they never both carry a session.
 */
function callbackParams(url: string): URLSearchParams {
  const hash = url.includes('#') ? url.slice(url.indexOf('#') + 1) : '';
  const query = url.includes('?') ? url.slice(url.indexOf('?') + 1).split('#')[0] : '';
  return new URLSearchParams(hash || query);
}

/** Param names only — never log or display the tokens themselves. */
function describeCallback(url: string): string {
  const keys = [...callbackParams(url).keys()];
  const path = url.split(/[?#]/)[0];
  return keys.length ? `${path} [${keys.join(', ')}]` : `${path} (no parameters)`;
}

export type CallbackOutcome =
  | { kind: 'session' }
  | { kind: 'error'; message: string }
  | { kind: 'none'; detail: string };

/**
 * Turn an OAuth redirect (exhale://auth-callback#access_token=…) into a live
 * session. Writes the session into the store SYNCHRONOUSLY on completion:
 * onAuthStateChange only fires on a later tick, and landingRoute() reads the
 * store — without this it sees a null session and bounces back to /auth.
 *
 * Never fails silently: a provider error, or a callback carrying neither
 * tokens nor a code, is reported so the auth screen can say what went wrong.
 */
export async function absorbAuthTokens(url: string): Promise<CallbackOutcome> {
  const params = callbackParams(url);

  // The provider refused. This is the case that used to vanish without trace.
  const providerError = params.get('error_description') ?? params.get('error');
  if (providerError) return { kind: 'error', message: providerError.replace(/\+/g, ' ') };

  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');
  if (accessToken && refreshToken) {
    const { data, error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    if (error) return { kind: 'error', message: error.message };
    if (!data.session) return { kind: 'error', message: 'Supabase accepted the tokens but returned no session.' };
    useAuthStore.setState({ session: data.session, authError: null });
    await restoreProfileFromCloud();
    return { kind: 'session' };
  }

  // Supabase answered with a PKCE code even though the client asked for the
  // implicit flow. Exchange it rather than dropping the sign-in on the floor.
  const code = params.get('code');
  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) return { kind: 'error', message: error.message };
    if (data.session) {
      useAuthStore.setState({ session: data.session, authError: null });
      await restoreProfileFromCloud();
      return { kind: 'session' };
    }
  }

  return { kind: 'none', detail: describeCallback(url) };
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  hydrated: false,
  isPremium: false,
  authError: null,

  clearAuthError: () => set({ authError: null }),

  hydrate: async () => {
    // Before anything else: a returning OAuth redirect must never arrive
    // while nobody is listening.
    bindDeepLinkAuth();
    // Always mark hydrated — the router gates the app on it (see useProfileStore).
    try {
      // Last known entitlement first, so premium users aren't locked out offline.
      const cached = useSettingsStore.getState().values['premium_cached'] === 'true';
      const { data } = await supabase.auth.getSession();
      set({ session: data.session, isPremium: cached });

      // Existing account on a fresh device: configure billing + pull profile
      // BEFORE the router decides between onboarding and the app.
      if (data.session) {
        await configurePurchases(data.session.user.id);
        bindPremiumListener(set);
        await restoreProfileFromCloud();
        get().refreshPremium();
      }

      supabase.auth.onAuthStateChange((_event, session) => {
        set({ session });
        if (session) {
          configurePurchases(session.user.id).then(() => bindPremiumListener(set));
          get().refreshPremium();
        }
      });
    } catch (err) {
      console.error('[auth] hydrate failed', err);
    } finally {
      set({ hydrated: true });
    }
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
      let outcome: CallbackOutcome | null = null;
      if (result.type === 'success') {
        outcome = await absorbAuthTokens(result.url);
        if (outcome.kind === 'session') return {};
      }

      // Android hands the deep link to the app, which can dismiss the custom
      // tab before it reports success. The auth-callback screen may already
      // have absorbed the tokens — trust the session, not the browser.
      const { data: existing } = await supabase.auth.getSession();
      if (existing.session) {
        set({ session: existing.session, authError: null });
        await restoreProfileFromCloud();
        return {};
      }

      if (outcome?.kind === 'error') return { error: outcome.message };
      if (outcome?.kind === 'none') return { error: `Google returned no session — ${outcome.detail}` };
      return { error: 'Sign-in was cancelled' };
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
    await logoutPurchases();
    await supabase.auth.signOut();
    set({ session: null, isPremium: false });
    useSettingsStore.getState().set('premium_cached', 'false');
  },

  refreshPremium: async () => {
    const userId = get().session?.user.id;
    if (!userId) return;

    // RevenueCat (Google Play Billing) is the source of truth when configured.
    if (purchasesConfigured()) {
      const active = await getPremiumFromRC();
      set({ isPremium: active });
      useSettingsStore.getState().set('premium_cached', String(active));
      return;
    }

    // Fallback: the Supabase subscriptions table (e.g. a Stripe webhook path).
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
export function landingRoute(): '/' | '/onboarding' | '/auth' | '/intro' | '/welcome-offer' {
  const settings = useSettingsStore.getState().values;
  const session = useAuthStore.getState().session;
  const profile = useProfileStore.getState().profile;
  if (!session) return settings['intro_seen'] === 'true' ? '/auth' : '/intro';
  if (!profile) return '/onboarding';
  // One-time upsell between onboarding and the dashboard.
  if (settings['welcome_offer_seen'] !== 'true') return '/welcome-offer';
  return '/';
}

/**
 * Local data belongs to exactly one account. When a DIFFERENT account signs
 * in on this device, the previous user's profile, logs, Room conversations
 * and settings are wiped before anything else happens — accounts must never
 * see each other's data or overwrite each other's cloud rows.
 */
async function ensureLocalDataOwnership(userId: string): Promise<void> {
  const settings = useSettingsStore.getState();
  const owner = settings.values['owner_user_id'];
  if (owner === userId) return;

  if (owner && owner !== userId) {
    const introSeen = settings.values['intro_seen'];
    await wipeAllData();
    useProfileStore.getState().clearProfile();
    invalidateContextCache();
    await useSettingsStore.getState().hydrate();
    await useLogsStore.getState().refresh();
    // The device has still seen the intro — that's not account data.
    if (introSeen === 'true') await useSettingsStore.getState().set('intro_seen', 'true');
  }
  await useSettingsStore.getState().set('owner_user_id', userId);
}

/**
 * Existing account, fresh install: pull the complete profile (profile_json)
 * back from Supabase into local SQLite so the user is NOT re-onboarded and
 * their cloud data is never overwritten by a blank run-through.
 * Also enforces per-account ownership of the local data (see above).
 */
export async function restoreProfileFromCloud(): Promise<boolean> {
  const session = useAuthStore.getState().session;
  if (!session) return false;
  await ensureLocalDataOwnership(session.user.id);
  if (useProfileStore.getState().profile) return false;
  try {
    const { data } = await supabase
      .from('profiles')
      .select('profile_json, avatar_url')
      .eq('id', session.user.id)
      .maybeSingle();

    // Restore the profile photo from the cloud (survives reinstall / device swap).
    if (data?.avatar_url) {
      await useSettingsStore.getState().set('avatar_uri', data.avatar_url as string);
    }

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
