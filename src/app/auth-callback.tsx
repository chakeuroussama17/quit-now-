import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { landingRoute, useAuthStore } from '@/state/useAuthStore';
import { colors } from '@/theme';

/** Never strand the user on a spinner if the sign-in never completes. */
const TIMEOUT_MS = 8000;

/**
 * Deep-link landing for OAuth flows (exhale://auth-callback#access_token=…).
 *
 * It does NOT read the URL: the `url` event that routed us here fires before
 * this screen mounts, so a listener here would always miss it. useAuthStore
 * binds that listener at startup and absorbs the tokens; this screen just
 * waits for the session to appear, then hands over to the guards.
 */
export default function AuthCallbackScreen() {
  const session = useAuthStore((s) => s.session);
  const authError = useAuthStore((s) => s.authError);
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      // Nothing absorbed the link, so nothing set an error. Say that plainly
      // instead of bouncing back to the login screen in silence.
      useAuthStore.setState({
        authError: `No sign-in link reached the app within ${TIMEOUT_MS / 1000}s.`,
      });
      setTimedOut(true);
    }, TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, []);

  // The sign-in landed: the guards decide where this user belongs.
  if (session) return <Redirect href={landingRoute()} />;
  // It failed, and the auth screen will say why.
  if (authError) return <Redirect href="/auth" />;
  if (timedOut) return <Redirect href={landingRoute()} />;

  return (
    <View style={styles.root}>
      <ActivityIndicator color={colors.accent} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
});
