# In-App Purchase setup (iOS) — Exhale Premium

The app unlocks **Craving SOS** and **The Room** behind a RevenueCat entitlement.
These identifiers are hard-coded in `src/services/purchases.ts` — **match them exactly**:

| Thing | Value the code expects |
|---|---|
| Entitlement ID | `premium` |
| Offering | the **Default / current** offering |
| Packages | **Monthly** (required), **Annual** (optional) |

Recommended product IDs (you'll create these in App Store Connect):
- Monthly: `exhale_premium_monthly`
- Annual: `exhale_premium_annual`

---

## Part A — App Store Connect

### A0. Sign agreements + banking (do this FIRST — nothing works without it)
1. App Store Connect → **Business** (top nav) → **Agreements**.
2. Find **Paid Apps** → **Review Agreement** → accept.
3. Complete **Bank Accounts** (where Apple pays you) and **Tax** forms (US tax + your region).
4. Wait until Paid Apps shows **Active**. Until then, subscription products can't be created.

### A1. Create the Subscription Group
1. App Store Connect → **My Apps** → **Exhale**.
2. Left sidebar → under *Monetization* → **Subscriptions**.
3. **Create** a Subscription Group.
   - Reference Name: `Exhale Premium` (internal only)
   - Group display name (public, shown at purchase): `Exhale Premium`

### A2. Create the Monthly subscription
1. Inside the group → **Create** (Add subscription).
2. **Reference Name:** `Premium Monthly`
3. **Product ID:** `exhale_premium_monthly`  ← must match RevenueCat later
4. Save. Now fill the required fields on the product page:
   - **Subscription Duration:** 1 Month
   - **Subscription Price:** click Add → pick your price (e.g. USD 4.99). Apple auto-fills all other currencies; adjust if you want the regional pricing you used on the landing page.
   - **Localization** (App Store Localization): add at least English (U.S.)
     - Display Name: `Premium Monthly`
     - Description: `Unlock Craving SOS coaching and The Room.`
   - **Review Information:** upload a screenshot of the paywall (any 1290×2796 image of the paywall screen works) + optional notes.
5. Status should move to **Ready to Submit**.

### A3. (Optional) Create the Annual subscription
Repeat A2 inside the **same group**:
- Reference Name: `Premium Annual`
- Product ID: `exhale_premium_annual`
- Duration: 1 Year
- Price: your yearly price (e.g. USD 39.99)
- Localization + review screenshot

> Keep both in ONE group so users can upgrade/downgrade between them.

### A4. Create an In-App Purchase Key (RevenueCat needs this)
1. App Store Connect → **Users and Access** → **Integrations** tab → **In-App Purchase** (under Keys).
2. **Generate In-App Purchase Key** → name it `RevenueCat` → **Generate**.
3. **Download the `.p8` file** (one-time download!) and note the **Key ID** and your **Issuer ID**.
   You'll paste these into RevenueCat in Part B.

---

## Part B — RevenueCat

### B1. Create the project / app
1. app.revenuecat.com → **Create new project** (or open your existing one) → name it `Exhale`.
2. **Add app** → **App Store**.
   - App name: `Exhale`
   - **Bundle ID:** `com.exhale.quitnow`
   - **In-App Purchase Key:** upload the `.p8` from A4, and enter the **Key ID** + **Issuer ID**.
   - (App-Specific Shared Secret is the older alternative; the In-App Purchase Key is preferred.)

### B2. Import the products
1. RevenueCat → **Product catalog** → **Products** → **+ New**.
2. Add `exhale_premium_monthly` (and `exhale_premium_annual` if created). RevenueCat can also
   import them automatically from App Store Connect once the key is connected.

### B3. Create the entitlement  ← must be named `premium`
1. **Product catalog** → **Entitlements** → **+ New**.
2. **Identifier:** `premium`  (exactly — the app checks `entitlements.active['premium']`)
3. **Attach** both products (`exhale_premium_monthly`, `exhale_premium_annual`) to this entitlement.

### B4. Create the Offering  ← must be the default/current
1. **Product catalog** → **Offerings** → **+ New**.
2. Identifier: `default` → make sure it's marked as the **Current** offering.
3. **Add packages** to it:
   - Package type **Monthly** → attach `exhale_premium_monthly`
   - Package type **Annual** → attach `exhale_premium_annual`
   The app reads `offerings.current.monthly` and `.annual` — the standard Monthly/Annual
   package types map to those automatically.

### B5. Get the iOS public SDK key
1. RevenueCat → **Project settings** → **API keys** (or **Platform → App Store**).
2. Copy the **Public app-specific API key** for the App Store app — it starts with **`appl_`**.
3. Send that key here (or set it yourself in step C).

---

## Part C — Wire the key into the build & rebuild
```bash
cd /Volumes/SSD/Projects/quit-now-
eas env:create --environment production --name EXPO_PUBLIC_REVENUECAT_IOS_KEY --value "appl_..."
eas build --platform ios --profile production
```
Then `eas submit --platform ios --profile production --latest`.

---

## Part D — Test before submitting for review
1. App Store Connect → **Users and Access** → **Sandbox** → **Testers** → add a sandbox tester
   (use an email you don't already use for Apple).
2. Install the build via **TestFlight**, sign out of the App Store on the device, and when you tap
   subscribe, sign in with the **sandbox** account. The purchase should complete and unlock
   SOS + The Room instantly (RevenueCat entitlement `premium` becomes active).
3. Also test **Restore purchases**.

Once a real purchase works in sandbox, you're safe to submit for App Review.
