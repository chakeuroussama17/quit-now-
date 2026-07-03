# quit-now — "Exhale"

A quit smoking & vaping app built with Expo (React Native) + TypeScript. Local-first: all logs stay on the device in SQLite. AI coaching (Phase 3) goes through a backend proxy so no API key ever ships in the app bundle.

## Stack

- Expo SDK 57 + Expo Router, TypeScript
- Zustand (state), expo-sqlite (storage)
- react-native-reanimated (animations), expo-haptics
- ESLint + Prettier

## Run

```bash
npm install
npx expo start
```

Scan the QR code with Expo Go, or press `a` for an Android emulator.

Useful scripts: `npm run lint`, `npm run typecheck`, `npm run format`.

## Secrets

Copy `.env.example` to `.env` and fill in your key. `.env` is gitignored — never commit it, and never put the OpenAI key in `EXPO_PUBLIC_*` variables (those are bundled into the app).

## AI coach setup (Phase 3)

The app never talks to OpenAI directly — it goes through a thin proxy in `server/` that holds the key. Two ways to run it:

**Local (testing):**

```bash
node server/local-server.mjs        # reads OPENAI_API_KEY from .env, listens on :3001
```

Then set `EXPO_PUBLIC_AI_PROXY_URL` in `.env` to `http://<your-PC-LAN-IP>:3001` (or `http://10.0.2.2:3001` for the Android emulator) and restart `npx expo start`.

**Deployed (real use):**

```bash
cd server && npx vercel deploy --prod
```

Add `OPENAI_API_KEY` as an environment variable in the Vercel project settings, then set `EXPO_PUBLIC_AI_PROXY_URL=https://<your-project>.vercel.app` in `.env` and rebuild the app.

Leave `EXPO_PUBLIC_AI_PROXY_URL` empty and everything still works — AI features quietly fall back to 50 bundled motivation lines and offline SOS coaching.

## Supabase setup (auth + subscriptions)

1. **Run the schema**: Supabase dashboard → SQL Editor → paste [supabase/schema.sql](supabase/schema.sql) → Run.
2. **Google login**: Google Cloud Console → create OAuth client (Web application) with authorized redirect URI `https://<project>.supabase.co/auth/v1/callback`. Then Supabase → Authentication → Providers → Google → paste client ID + secret.
3. **Allow the app redirect**: Supabase → Authentication → URL Configuration → Redirect URLs → add `exhale://**`.
4. Optional: Authentication → Providers → Email → disable "Confirm email" for frictionless email signup.

## Stripe setup ($3.99/mo SOS subscription)

1. Stripe dashboard → Product ($3.99/month recurring) → create a **Payment Link**.
2. Set `EXPO_PUBLIC_STRIPE_PAYMENT_LINK` to that link (or paste it in `src/features/paywall/Paywall.tsx`) and rebuild.
3. Stripe → Developers → Webhooks → add endpoint `https://<your-vercel>.vercel.app/api/stripe-webhook` with events `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`.
4. In Vercel env vars add: `STRIPE_WEBHOOK_SECRET`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (from Supabase → Settings → API), then redeploy.

Flow: paywall opens the payment link with `client_reference_id=<user id>` → Stripe webhook marks the user active in `subscriptions` → app unlocks SOS.

## Status

- ✅ Phase 1 — onboarding, data model, fast logging flow, home dashboard
- ✅ Phase 2 — dashboard charts, health milestones, stats screen
- ✅ Phase 3 — AI coach (OpenAI via backend proxy, deployed on Vercel)
- ✅ Phase 4 — Craving SOS urge surfing, ranks, XP, achievements
- ✅ Phase 4.5 — "The Room" emotional support chat (private, local-only)
- ✅ Phase 5 — notifications, CSV export, profile editing, app icon/splash, a11y
- ✅ Phase 6 — AI context wiring (buildContextJSON in every AI call)
