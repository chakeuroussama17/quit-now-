import * as Linking from 'expo-linking';
import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';

import { supabase } from '@/services/supabase';

/**
 * Deep-link landing for OAuth/email flows (exhale://auth-callback#access_token=…).
 * The router navigates here when the browser hands control back; we absorb the
 * tokens into a session and bounce to the right screen via the root guards.
 */
export default function AuthCallbackScreen() {
  const url = Linking.useURL();
  const [done, setDone] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        if (url) {
          const fragment = url.includes('#') ? url.split('#')[1] : (url.split('?')[1] ?? '');
          const params = new URLSearchParams(fragment);
          const accessToken = params.get('access_token');
          const refreshToken = params.get('refresh_token');
          if (accessToken && refreshToken) {
            await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
          }
        }
      } catch {
        // No tokens or bad tokens — the guards will land us on /auth.
      }
      setDone(true);
    })();
  }, [url]);

  if (!done) return null;
  return <Redirect href="/" />;
}
