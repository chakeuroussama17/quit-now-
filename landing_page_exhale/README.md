# Exhale — landing page

A modern, single-page marketing site for the Exhale quit-smoking app. Dark
"mature mode" aesthetic matching the app (near-black + clean-breath teal),
fully responsive, with a **4-language switcher** (English · Bahasa Melayu ·
العربية · Français) including right-to-left layout for Arabic.

## Run it

It's a static site — no build step. Just open `index.html` in a browser, or
serve the folder:

```bash
# any static server works, e.g.
npx serve .
```

## Deploy (free options)

- **GitHub Pages** — push this folder to a repo, enable Pages on the branch.
- **Netlify / Vercel / Cloudflare Pages** — drag-and-drop the folder, done.

Point your domain at it whenever you have one.

## Add your images

See [ASSETS.md](ASSETS.md). Drop screenshots into `pictures/` with the exact
filenames. Until then, each image slot shows a labelled placeholder — the page
is fully functional and publishable without them.

## Customise

- **Text** lives in `js/i18n.js` (all four languages, keyed by `data-i18n`).
  Edit English in `index.html`; edit the others in the dictionary.
- **Colours & style** in `css/styles.css` (`:root` variables at the top).
- **Links**: replace the `#` in the "Download APK" / Google Play links, and the
  footer Privacy/Contact links, with your real URLs.

## Structure

```
landing_page_exhale/
├─ index.html          # page structure (data-i18n keys)
├─ css/styles.css      # Exhale theme, phone mockups, timeline, RTL
├─ js/i18n.js          # 4-language dictionary + switcher
├─ js/main.js          # placeholders, tilt, scroll reveals
├─ pictures/           # your images (see ASSETS.md)
├─ ASSETS.md           # image list + AI prompts
└─ README.md
```

## Tech

Plain HTML + Tailwind (CDN) + a little GSAP and Vanilla-Tilt from CDNs. No
framework, no bundler. Respects `prefers-reduced-motion`.
