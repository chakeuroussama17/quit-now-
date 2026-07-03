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

## Status

- ✅ Phase 1 — onboarding, data model, fast logging flow, home dashboard
- ✅ Phase 2 — dashboard charts, health milestones, stats screen
- ✅ Phase 3 — AI coach (OpenAI via backend proxy, deployed on Vercel)
- ✅ Phase 4 — Craving SOS urge surfing, ranks, XP, achievements
- ✅ Phase 4.5 — "The Room" emotional support chat (private, local-only)
- ✅ Phase 5 — notifications, CSV export, profile editing, app icon/splash, a11y
- ✅ Phase 6 — AI context wiring (buildContextJSON in every AI call)
