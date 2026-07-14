# Exhale — landing page + API (the Vercel deployment)

This folder IS the Vercel project (https://quit-now.vercel.app): the static
landing page serves from the root, and `api/` holds the serverless functions
(`/api/chat` AI proxy, `/api/feedback` email relay, `/api/stripe-webhook`).
Pushing to `main` redeploys both together.

The page: a single-page marketing site for the Exhale quit-smoking app. Dark
"mature mode" aesthetic matching the app (near-black + clean-breath teal),
fully responsive, a **4-language switcher** (English · Bahasa Melayu ·
العربية · Français) with right-to-left layout for Arabic, and region-aware
pricing (Asia / Europe / US tiers picked from the visitor's timezone — keep
the table in `js/i18n.js` in sync with Play Console's regional prices).

## Run it locally

The page is static — open `index.html` in a browser, or serve the folder:

```bash
npx serve .
# the API functions run locally with:
npm run dev
```

## Add / update images

See [ASSETS.md](ASSETS.md). Drop screenshots into `pictures/` with the exact
filenames. A missing image shows a labelled placeholder — the page stays
publishable.

## Customise

- **Text** lives in `js/i18n.js` (all four languages, keyed by `data-i18n`).
  Edit English in `index.html`; edit the others in the dictionary.
- **Prices** are the `PRICING` table at the top of `js/i18n.js` — display
  only; Google Play charges what Play Console says.
- **Colours & style** in `css/styles.css` (`:root` variables at the top).
- **Links**: replace the `#` in the "Download APK" / Google Play links, and
  the footer Privacy/Contact links, with your real URLs.

## Structure

```
server/
├─ index.html          # page structure (data-i18n keys)
├─ css/styles.css      # Exhale theme, phone mockups, timeline, RTL
├─ js/i18n.js          # 4-language dictionary + regional pricing + switcher
├─ js/main.js          # placeholders, tilt, scroll reveals
├─ pictures/           # images (see ASSETS.md)
├─ api/                # Vercel serverless functions (chat, feedback, stripe)
├─ lib/                # shared function code
└─ local-server.mjs    # local dev server for the API
```

## Tech

Plain HTML + Tailwind (CDN) + a little GSAP and Vanilla-Tilt from CDNs. No
framework, no bundler. Respects `prefers-reduced-motion`.
