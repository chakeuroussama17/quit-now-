/**
 * Vercel serverless function: POST /api/feedback
 *
 * Emails a feedback report that the app has ALREADY stored in Supabase. The
 * row is the record of truth; this is only the notification, so a failure here
 * loses an email, never a report.
 *
 * The caller must present their Supabase access token. We verify it against
 * Supabase before sending anything — otherwise this endpoint is an open relay
 * that anyone on the internet can use to mail the maintainer.
 *
 * Environment (set in Vercel, never in the app bundle):
 *   SUPABASE_URL        https://<ref>.supabase.co
 *   SUPABASE_ANON_KEY   publishable key, used as the apikey header
 *   RESEND_API_KEY      from resend.com
 *   FEEDBACK_TO         destination inbox
 *   FEEDBACK_FROM       verified sender, e.g. "Exhale <feedback@yourdomain>"
 */

const MAX_MESSAGE = 2000;
const CATEGORIES = ['bug', 'idea', 'complaint', 'other'];

/** Resolve a bearer token to a Supabase user, or null. */
async function verifyUser(token) {
  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  if (!url || !anonKey || !token) return null;
  const res = await fetch(`${url}/auth/v1/user`, {
    headers: { apikey: anonKey, authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  return res.json();
}

function escapeHtml(text) {
  return text.replace(
    /[&<>"']/g,
    (char) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char],
  );
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method_not_allowed' });
    return;
  }

  const token = (req.headers.authorization ?? '').replace(/^Bearer\s+/i, '');
  const user = await verifyUser(token);
  if (!user?.id) {
    res.status(401).json({ error: 'unauthorized' });
    return;
  }

  const { category, message, appVersion, platform, osVersion, language } = req.body ?? {};
  if (!CATEGORIES.includes(category) || typeof message !== 'string' || !message.trim()) {
    res.status(400).json({ error: 'bad_request' });
    return;
  }

  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.FEEDBACK_TO;
  const from = process.env.FEEDBACK_FROM;
  if (!apiKey || !to || !from) {
    // Not configured yet — the row is already safe in Supabase.
    res.status(202).json({ stored: true, emailed: false });
    return;
  }

  const body = message.trim().slice(0, MAX_MESSAGE);
  const meta = [
    `From: ${user.email ?? user.id}`,
    `App: ${appVersion ?? '?'} · ${platform ?? '?'} ${osVersion ?? ''}`.trim(),
    `Language: ${language ?? '?'}`,
  ].join('<br>');

  try {
    const send = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        from,
        to: [to],
        reply_to: user.email || undefined,
        subject: `Exhale ${category}: ${body.slice(0, 60)}`,
        html: `<pre style="font:14px/1.5 system-ui;white-space:pre-wrap">${escapeHtml(body)}</pre>
               <hr><p style="font:12px/1.5 system-ui;color:#666">${meta}</p>`,
      }),
    });
    if (!send.ok) {
      res.status(502).json({ stored: true, emailed: false, detail: await send.text() });
      return;
    }
    res.status(200).json({ stored: true, emailed: true });
  } catch (err) {
    res.status(502).json({ stored: true, emailed: false, detail: String(err).slice(0, 200) });
  }
}
