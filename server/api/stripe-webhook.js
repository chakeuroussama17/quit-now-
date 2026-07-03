import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Stripe → Supabase subscription sync. Dependency-free.
 *
 * Vercel env vars required:
 *   STRIPE_WEBHOOK_SECRET      — from the Stripe webhook endpoint (whsec_…)
 *   SUPABASE_URL               — https://<project>.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY  — service_role key (Settings → API). NEVER in the app.
 *
 * Stripe webhook events to send here:
 *   checkout.session.completed, customer.subscription.updated,
 *   customer.subscription.deleted
 */

export const config = { api: { bodyParser: false } };

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => (data += chunk));
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

/** Stripe signature scheme: `t=<ts>,v1=<hmac-sha256(secret, "<ts>.<payload>")>` */
function verifyStripeSignature(payload, header, secret) {
  if (!header) return false;
  const parts = Object.fromEntries(header.split(',').map((kv) => kv.split('=')));
  if (!parts.t || !parts.v1) return false;
  const expected = createHmac('sha256', secret).update(`${parts.t}.${payload}`).digest('hex');
  const a = Buffer.from(expected);
  const b = Buffer.from(parts.v1);
  return a.length === b.length && timingSafeEqual(a, b);
}

async function upsertSubscription(row) {
  const res = await fetch(`${process.env.SUPABASE_URL}/rest/v1/subscriptions`, {
    method: 'POST',
    headers: {
      apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
      authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      'content-type': 'application/json',
      prefer: 'resolution=merge-duplicates',
    },
    body: JSON.stringify([{ ...row, updated_at: new Date().toISOString() }]),
  });
  if (!res.ok) throw new Error(`supabase upsert failed: ${res.status} ${await res.text()}`);
}

async function updateBySubscriptionId(stripeSubscriptionId, patch) {
  const res = await fetch(
    `${process.env.SUPABASE_URL}/rest/v1/subscriptions?stripe_subscription_id=eq.${stripeSubscriptionId}`,
    {
      method: 'PATCH',
      headers: {
        apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
        authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ ...patch, updated_at: new Date().toISOString() }),
    },
  );
  if (!res.ok) throw new Error(`supabase update failed: ${res.status} ${await res.text()}`);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method_not_allowed' });
    return;
  }
  try {
    const raw = await readRawBody(req);
    if (!verifyStripeSignature(raw, req.headers['stripe-signature'], process.env.STRIPE_WEBHOOK_SECRET)) {
      res.status(400).json({ error: 'invalid_signature' });
      return;
    }

    const event = JSON.parse(raw);
    const obj = event.data?.object ?? {};

    switch (event.type) {
      case 'checkout.session.completed': {
        // client_reference_id carries the Supabase user id from the app.
        const userId = obj.client_reference_id;
        if (userId) {
          await upsertSubscription({
            user_id: userId,
            status: 'active',
            stripe_customer_id: obj.customer ?? null,
            stripe_subscription_id: obj.subscription ?? null,
          });
        }
        break;
      }
      case 'customer.subscription.updated': {
        const active = obj.status === 'active' || obj.status === 'trialing';
        await updateBySubscriptionId(obj.id, {
          status: active ? 'active' : 'inactive',
          current_period_end: obj.current_period_end
            ? new Date(obj.current_period_end * 1000).toISOString()
            : null,
        });
        break;
      }
      case 'customer.subscription.deleted': {
        await updateBySubscriptionId(obj.id, { status: 'inactive' });
        break;
      }
      default:
        break; // acknowledge everything else
    }

    res.status(200).json({ received: true });
  } catch (err) {
    res.status(500).json({ error: 'server_error', detail: String(err).slice(0, 300) });
  }
}
