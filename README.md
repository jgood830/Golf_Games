# Skins Tracker

Mobile-first web app for tracking a golf **skins** game plus **closest to the pin**, and settling up at the end.
Next.js (App Router) + TypeScript + Tailwind. No backend: the round autosaves to `localStorage`.

## Develop

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # Vitest: scoring rules
npm run typecheck
npm run build      # production build
```

## Layout

- `lib/scoring.ts`: all scoring math (strokes, net, skins, skin and CTP carryover, money, settlement). Pure TypeScript, no React.
- `lib/scoring.test.ts`: the spec's test cases.
- `lib/summary.ts`: plain-text share summary.
- `lib/storage.ts`: `localStorage` load/save of the round (wrapped in try/catch).
- `lib/courses.ts`: saved courses (separate storage key, so resets keep them) plus export/import.
- `lib/opengolf.ts`: OpenGolfAPI client (course search + scorecard with par and hole handicaps), called directly from the browser.
- `components/`: Setup, Scorecard, CTP and Results screens.
- `app/manifest.ts`, `public/icons`, `public/sw.js`: PWA install + offline cache.

## Deploy to Vercel

1. Push this repo to GitHub.
2. In Vercel: **Add New → Project**, import the repo, keep the defaults (framework: Next.js), **Deploy**.
3. Or from this folder: `npx vercel` (preview) / `npx vercel --prod`.

## Course data

Course search uses [OpenGolfAPI](https://opengolfapi.org) (no API key; 1,000 lookups/day per phone).
Contains data from OpenGolfAPI (opengolfapi.org), licensed under the [ODbL](https://opendatacommons.org/licenses/odbl/).
