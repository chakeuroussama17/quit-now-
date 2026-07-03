import * as Linking from 'expo-linking';
import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';

import { supabase } from '@/services/supabase';
import { landingRoute, restoreProfileFromCloud } from '@/state/useAuthStore';

/**
 * Deep-link landing for OAuth/email flows (exhale://auth-callback#access_token=…).
 * Absorbs the tokens into a session, restores the cloud profile for returning
 * users, then routes to wherever the guards say the user belongs.
 */
export default function AuthCallbackScreen() {
  const url = Linking.useURL();
  const [target, setTarget] = useState<ReturnType<typeof landingRoute> | null>(null);

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
            await restoreProfileFromCloud();
          }
        }
      } catch {
        // No tokens or bad tokens — landingRoute() sends us to /auth.
      }
      setTarget(landingRoute());
    })();
  }, [url]);

  if (!target) return null;
  return <Redirect href={target} />;
}
