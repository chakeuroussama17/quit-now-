

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

  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    // Not configured — fail loudly so the app doesn't tell the user their
    // account is gone when it isn't.
    res.status(503).json({ error: 'not_configured' });
    return;
  }

  try {
    // GoTrue admin delete. Cascades to every public.* row the user owns.
    const del = await fetch(`${url}/auth/v1/admin/users/${user.id}`, {
      method: 'DELETE',
      headers: { apikey: serviceKey, authorization: `Bearer ${serviceKey}` },
    });
    if (!del.ok && del.status !== 404) {
      res.status(502).json({ error: 'delete_failed', detail: (await del.text()).slice(0, 200) });
      return;
    }
    res.status(200).json({ deleted: true });
  } catch (err) {
    res.status(502).json({ error: 'delete_failed', detail: String(err).slice(0, 200) });
  }
}
