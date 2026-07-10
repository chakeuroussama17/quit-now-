import * as Application from 'expo-application';
import { Platform } from 'react-native';

import { getLang } from '@/i18n';
import { proxyBaseUrl } from '@/services/aiClient';
import { supabase } from '@/services/supabase';
import { useAuthStore } from '@/state/useAuthStore';

/**
 * Feedback from Settings. Two hops, deliberately in this order:
 *
 *  1. Write the row to Supabase. This is the durable record — it survives the
 *     proxy being down, and RLS proves the sender is who they say they are.
 *  2. Best-effort ping to the proxy so the row also lands in an inbox. If the
 *     email fails, the feedback is NOT lost, only unannounced.
 *
 * Diagnostics are app version, OS and language. Nothing else: no logs, no
 * profile, and nothing whatsoever from The Room.
 */

export type FeedbackCategory = 'bug' | 'idea' | 'complaint' | 'other';

export const FEEDBACK_CATEGORIES: FeedbackCategory[] = ['bug', 'idea', 'complaint', 'other'];
export const MAX_FEEDBACK_LENGTH = 2000;

export interface Diagnostics {
  appVersion: string;
  platform: string;
  osVersion: string;
  language: string;
}

export function diagnostics(): Diagnostics {
  const version = Application.nativeApplicationVersion ?? '?';
  const build = Application.nativeBuildVersion;
  return {
    appVersion: build ? `${version} (${build})` : version,
    platform: Platform.OS,
    osVersion: String(Platform.Version),
    language: getLang(),
  };
}

/** Fire-and-forget: the caller has already stored the row. */
async function notifyByEmail(
  category: FeedbackCategory,
  message: string,
  info: Diagnostics,
  accessToken: string,
): Promise<void> {
  const base = proxyBaseUrl();
  if (!base) return;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);
  try {
    await fetch(`${base}/api/feedback`, {
      method: 'POST',
      // The proxy verifies this token with Supabase before sending anything,
      // so the endpoint can't be used as an open relay.
      headers: { 'content-type': 'application/json', authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ category, message, ...info }),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

export async function submitFeedback(
  category: FeedbackCategory,
  message: string,
): Promise<{ ok: boolean }> {
  const session = useAuthStore.getState().session;
  if (!session) return { ok: false };

  const text = message.trim().slice(0, MAX_FEEDBACK_LENGTH);
  if (!text) return { ok: false };
  const info = diagnostics();

  const { error } = await supabase.from('feedback').insert({
    user_id: session.user.id,
    email: session.user.email,
    category,
    message: text,
    app_version: info.appVersion,
    platform: info.platform,
    os_version: info.osVersion,
    language: info.language,
  });
  if (error) return { ok: false };

  notifyByEmail(category, text, info, session.access_token).catch(() => {
    // The row is already safe in Supabase; only the email notice was lost.
  });
  return { ok: true };
}
