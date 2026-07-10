import * as Linking from 'expo-linking';
import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { absorbAuthTokens, landingRoute, useAuthStore } from '@/state/useAuthStore';
import { colors } from '@/theme';

/** Never strand the user on a spinner if the deep link never materialises. */
const URL_TIMEOUT_MS = 5000;

/**
 * Deep-link landing for OAuth/email flows (exhale://auth-callback#access_token=…).
 * Absorbs the tokens into a session, restores the cloud profile for returning
 * users, then routes to wherever the guards say the user belongs.
 */
export default function AuthCallbackScreen() {
  const url = Linking.useURL();
  const [target, setTarget] = useState<ReturnType<typeof landingRoute> | null>(null);

  useEffect(() => {
    let cancelled = false;
    // useURL() is null on the first render. Redirecting here would race the
    // tokens and always land back on /auth, so wait for a link — but never
    // longer than this, or a stray navigation strands the user on a spinner.
    const timer = setTimeout(() => {
      if (!cancelled) setTarget(landingRoute());
    }, URL_TIMEOUT_MS);

    (async () => {
      try {
        const link = url ?? (await Linking.getInitialURL());
        // Nothing yet: leave the timer running. This effect re-runs the moment
        // useURL() delivers the deep link.
        if (cancelled || !link) return;

        const outcome = await absorbAuthTokens(link);
        // Bouncing back to /auth with no explanation is how this bug hid.
        if (outcome.kind === 'error') {
          useAuthStore.setState({ authError: outcome.message });
        } else if (outcome.kind === 'none') {
          useAuthStore.setState({ authError: `Callback carried no session — ${outcome.detail}` });
        }
      } catch (err) {
        useAuthStore.setState({ authError: String(err) });
      }
      if (cancelled) return;
      clearTimeout(timer);
      setTarget(landingRoute());
    })();

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [url]);

  if (!target) {
    return (
      <View style={styles.root}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }
  return <Redirect href={target} />;
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
});
