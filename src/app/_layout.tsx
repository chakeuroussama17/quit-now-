// Per-weight subpath imports so Metro bundles only these 4 font files,
// not all 18 weights the package ships.
import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular';
import { Inter_500Medium } from '@expo-google-fonts/inter/500Medium';
import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold';
import { Inter_700Bold } from '@expo-google-fonts/inter/700Bold';
import { useFonts } from 'expo-font';
import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { syncNotifications } from '@/services/notificationService';
import { useAuthStore } from '@/state/useAuthStore';
import { useLogsStore } from '@/state/useLogsStore';
import { useProfileStore } from '@/state/useProfileStore';
import { useSettingsStore } from '@/state/useSettingsStore';
import { colors } from '@/theme';

SplashScreen.preventAutoHideAsync();

const navTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: colors.accent,
    background: colors.bg,
    card: colors.bgElevated,
    text: colors.text,
    border: colors.hairline,
    notification: colors.accent,
  },
};

export default function RootLayout() {
  // If a font fails to load we still render (system font) — never a blank app.
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });
  const fontsReady = fontsLoaded || fontError != null;

  const profile = useProfileStore((s) => s.profile);
  const profileHydrated = useProfileStore((s) => s.hydrated);
  const hydrateProfile = useProfileStore((s) => s.hydrate);
  const settingsHydrated = useSettingsStore((s) => s.hydrated);
  const hydrateSettings = useSettingsStore((s) => s.hydrate);
  const introSeen = useSettingsStore((s) => s.values['intro_seen'] === 'true');
  const offerSeen = useSettingsStore((s) => s.values['welcome_offer_seen'] === 'true');
  const session = useAuthStore((s) => s.session);
  const authHydrated = useAuthStore((s) => s.hydrated);
  const hydrateAuth = useAuthStore((s) => s.hydrate);
  const refreshLogs = useLogsStore((s) => s.refresh);

  useEffect(() => {
    // Profile + settings first: auth hydration restores the cloud profile
    // only when the LOCAL profile is genuinely absent. Each hydrate() swallows
    // its own errors and still flips `hydrated`, so startup can never hang.
    (async () => {
      try {
        await Promise.all([hydrateProfile(), hydrateSettings()]);
        await hydrateAuth();
        await refreshLogs();
      } catch (err) {
        console.error('[startup] hydration failed', err);
      }
    })();
  }, [hydrateProfile, hydrateSettings, hydrateAuth, refreshLogs]);

  const ready = fontsReady && profileHydrated && settingsHydrated && authHydrated;

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  // Keep the local notification schedule fresh (risky hours drift with data).
  useEffect(() => {
    if (!settingsHydrated) return;
    if (useSettingsStore.getState().values['intro_seen'] !== 'true') return;
    if (useSettingsStore.getState().values['notif_enabled'] === 'true') {
      syncNotifications().catch(() => {});
    }
  }, [settingsHydrated]);

  if (!ready) return null;

  const authed = session != null;
  const onboarded = profile != null;

  return (
    <ThemeProvider value={navTheme}>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.bg },
        }}
      >
        {/* First run: 3 intro slides */}
        <Stack.Protected guard={!introSeen && !authed}>
          <Stack.Screen name="intro" />
        </Stack.Protected>

        {/* Then: login / register (Google or email) */}
        <Stack.Protected guard={introSeen && !authed}>
          <Stack.Screen name="auth" />
        </Stack.Protected>

        {/* Signed in but no local profile yet → onboarding questionnaire */}
        <Stack.Protected guard={authed && !onboarded}>
          <Stack.Screen name="onboarding" />
        </Stack.Protected>

        {/* One-time upsell between onboarding and the dashboard (skippable) */}
        <Stack.Protected guard={authed && onboarded && !offerSeen}>
          <Stack.Screen name="welcome-offer" options={{ animation: 'fade' }} />
        </Stack.Protected>

        {/* The app */}
        <Stack.Protected guard={authed && onboarded && offerSeen}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen
            name="sos-chat"
            options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
          />
          <Stack.Screen name="settings" />
        </Stack.Protected>
      </Stack>
    </ThemeProvider>
  );
}
