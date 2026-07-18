import { proxyBaseUrl } from '@/services/aiClient';
import { supabase } from '@/services/supabase';
import { useAuthStore } from '@/state/useAuthStore';

/**
 * Permanently delete the signed-in user's cloud account.
 *
 * Calls the backend proxy (which holds the service-role key) to delete the
 * Supabase auth user; every user-owned table cascades from it. The caller is
 * responsible for wiping local device data and signing out afterwards — see
 * useAuthStore.deleteAccount, which orchestrates the whole flow.
 *
 * Returns false (rather than throwing) if there's no session or the proxy
 * isn't configured/reachable, so the UI can tell the user it didn't work
 * instead of pretending it did.
 */
export async function deleteCloudAccount(): Promise<boolean> {
  const session = useAuthStore.getState().session;
  if (!session) return false;

  const base = proxyBaseUrl();
  if (!base) return false;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);
  try {
    const res = await fetch(`${base}/api/delete-account`, {
      method: 'POST',
      headers: { authorization: `Bearer ${session.access_token}` },
      signal: controller.signal,
    });
    return res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

/** Re-export for convenience so callers can refresh the client session too. */
export async function clearSupabaseSession(): Promise<void> {
  await supabase.auth.signOut();
}
