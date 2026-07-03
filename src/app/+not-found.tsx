import { Redirect } from 'expo-router';

import { landingRoute } from '@/state/useAuthStore';

/** Any unknown link lands where the user belongs — never a dead end or a loop. */
export default function NotFoundScreen() {
  return <Redirect href={landingRoute()} />;
}
