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

Copy `.env.example` to `.env` and fill in your key. `.env` is gitignored — never commit it, and never put the key in `EXPO_PUBLIC_*` variables (those are bundled into the app).

## Status

- ✅ Phase 1 — onboarding, data model, fast logging flow, home dashboard
- ⏳ Phase 2 — dashboard charts, health milestones, stats screen
- ⏳ Phase 3 — AI coach (OpenAI via backend proxy)
- ⏳ Phase 4 — Craving SOS toolkit & gamification
- ⏳ Phase 4.5 — "The Room" emotional support chat
- ⏳ Phase 5 — polish, notifications, accessibility
- ⏳ Phase 6 — AI context wiring
