# Shipping Exhale to the App Store & Google Play

The build/submit pipeline uses **EAS Build + EAS Submit** (Expo's cloud). Config
lives in [`eas.json`](eas.json). This file is the runbook — follow it top to bottom.

- App name: **Exhale** · slug `exhale`
- Bundle ID (iOS) / package (Android): **`com.exhale.quitnow`**
- Billing: RevenueCat (Play Billing + StoreKit)

---

## 0. Prerequisites (you already have these)

- ✅ Apple Developer Program membership ($99/yr)
- ✅ Google Play Console account ($25 one-time)
- An **Expo account** — free, sign up at https://expo.dev if you haven't
- A **privacy policy URL** that's publicly reachable (both stores require it).
  You collect email/Google auth (Supabase), send prompts to OpenAI, and use
  RevenueCat — the policy must disclose these. Host it anywhere (e.g. add a
  `/privacy` page to quit-now.vercel.app).

---

## 1. One-time local setup

```bash
npm install -g eas-cli        # or use `npx eas-cli` everywhere below
eas login                     # sign in to your Expo account
eas init                      # creates the EAS project, writes extra.eas.projectId into app.json
```

`eas init` links this repo to an EAS project and prints a **projectId** — commit
that change.

---

## 2. Environment variables for the build

The store build needs your public runtime values baked in. GitHub Actions reads
these from repo Variables; EAS needs its own copy. Set them once per value:

```bash
eas env:create --environment production --name EXPO_PUBLIC_AI_PROXY_URL --value "https://<your-vercel>.vercel.app"
eas env:create --environment production --name EXPO_PUBLIC_SUPABASE_URL --value "https://<project>.supabase.co"
eas env:create --environment production --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "<anon key>"
eas env:create --environment production --name EXPO_PUBLIC_REVENUECAT_ANDROID_KEY --value "goog_..."
eas env:create --environment production --name EXPO_PUBLIC_REVENUECAT_IOS_KEY --value "appl_..."   # from RevenueCat once iOS app is added
```

> These are all `EXPO_PUBLIC_*` (publishable, bundled into the app) — safe to
> store this way. Never put `OPENAI_API_KEY` or the Supabase **service role**
> key here; those live only on the Vercel server.

---

## 3. Android — Google Play

### 3a. Create the app + first upload
1. Play Console → **Create app** → name "Exhale", app (not game), free/paid.
2. First upload to a track establishes the package `com.exhale.quitnow` and lets
   Google take over app signing. Do the first upload via EAS (step 5) OR upload a
   manual AAB once, then let EAS handle the rest.

### 3b. Service account for `eas submit` (automated uploads)
1. Play Console → **Setup → API access** → link a Google Cloud project.
2. Create a **service account**, grant it **Release** permissions in Play Console.
3. Download its JSON key → save it to **`./credentials/play-service-account.json`**
   (this path is already in `.gitignore`; `eas.json` points at it).

### 3c. First 14-day closed test (personal accounts)
Google requires new **personal** developer accounts to run a closed test with
**≥12 testers for 14 continuous days** before you can apply for production. The
`internal` track (set in `eas.json` submit config) is not subject to this, but
production access is. Plan for this lead time. (Skip if you have an
organization account or are already verified.)

---

## 4. iOS — App Store

### 4a. Create the app record
1. App Store Connect → **My Apps → +** → New App.
2. Platform iOS, name "Exhale", primary language, bundle ID
   `com.exhale.quitnow` (register it under Certificates, IDs & Profiles first if
   it isn't listed), SKU `exhale`.
3. After creation, note the **Apple ID (ascAppId)** — the numeric ID in the app's
   App Information page.

### 4b. Fill in `eas.json` submit → ios
Replace the three placeholders in [`eas.json`](eas.json):
- `appleId` — your Apple account email
- `ascAppId` — the numeric App Store Connect app ID from 4a
- `appleTeamId` — Membership page in the Apple Developer portal (10-char ID)

EAS manages the signing certificate and provisioning profile for you the first
time you build (it'll prompt to create them).

---

## 5. Build

```bash
# Store binaries (AAB + IPA). Run both or one at a time.
eas build --platform android --profile production
eas build --platform ios --profile production
# or both:
eas build --platform all --profile production
```

EAS auto-increments `versionCode`/`buildNumber` (remote, per `eas.json`). Bump
the human-facing `version` in `app.json` manually for each real release
(1.0.0 → 1.0.1 → …).

To smoke-test before store review:
```bash
eas build --platform android --profile preview   # installable APK
```

---

## 6. Submit

```bash
eas submit --platform android --profile production --latest
eas submit --platform ios --profile production --latest
```

- Android lands on the **internal** track (per `eas.json`). Promote to
  production in Play Console once you're happy.
- iOS lands in App Store Connect → TestFlight; submit for review from there or
  attach to a new App Store version.

---

## 7. In-app purchases (Premium subscription)

Billing goes through RevenueCat, so the subscription product must exist in **both**
the store AND RevenueCat:

- **Play Console** → Monetize → Subscriptions → create the product; link the app
  to a RevenueCat entitlement.
- **App Store Connect** → your app → Subscriptions → create the product (needs
  the "Paid Apps" agreement signed in Business section, plus banking/tax).
- **RevenueCat** → add the iOS app, paste the product IDs, get the
  `appl_...` iOS SDK key → set it as `EXPO_PUBLIC_REVENUECAT_IOS_KEY` (step 2).

Apple **will test the purchase flow** during review — the subscription must be
approved/ready or the paywall must degrade gracefully.

---

## 8. Store listing assets (needed before review)

Both stores block submission until these exist:

| Asset | iOS | Android |
|---|---|---|
| App icon | from `assets/images/icon.png` (bundled) | same |
| Screenshots | 6.7" + 6.5" iPhone (min) | phone screenshots |
| Feature graphic | — | 1024×500 required |
| Description / keywords | ✅ | ✅ |
| Privacy policy URL | ✅ | ✅ |
| Privacy questionnaire | App Privacy "nutrition label" | Data safety form |
| Content rating | age rating questionnaire | IARC questionnaire |
| Account deletion | required (you have auth) | required |

> **Account deletion** is mandatory when an app has accounts. Make sure Settings
> exposes a delete-account path (or a documented request route) before review.

---

## 9. Every release after the first

```bash
# 1. bump the user-facing version
#    edit "version" in app.json (e.g. 1.0.1)
# 2. build + submit
eas build --platform all --profile production
eas submit --platform all --profile production --latest
```

The GitHub Actions APK workflow (`.github/workflows/build-apk.yml`) is unrelated
to store releases — it produces debug-signed test APKs for sideloading only.
