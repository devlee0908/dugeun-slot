# 두근슬롯 — agent notes

- Static site in `public/` (vanilla ES modules, no build). Content lives in `public/content/*.json`. Primary host: Vercel (https://dugeun-slot.vercel.app/, auto-deploys `main`); GitHub Pages (https://devlee0908.github.io/dugeun-slot/) still deploys via `.github/workflows/pages.yml`.
- UI must not filter content itself: use `public/src/content/query.js` (pure) via `repository.js`.
- Verify: `npm test` (unit + content validation: ≥60 per type, ≥10 cards per type×topic×group, no duplicate questions). With `npm run dev` running on :5173, run `npm run e2e` (puppeteer + Chrome) and `npm run devices` (playwright WebKit/Chrome device profiles; needs `npx playwright-core install webkit` once). Both accept `BASE_URL`.
- Fonts are self-hosted in `public/assets/fonts/` (regenerate with `npm run fonts`); the site must make no external requests (E2E asserts this).
- `vercel.json`: no install, build = unit tests + content validation, output `public`. Anonymous page views go through `public/src/analytics.js` (Vercel Web Analytics, only on `*.vercel.app`, skipped for `navigator.webdriver` so automated tests never count; screen names only).
- Psych-test answers must never be stored or sent anywhere. Game progress is in-memory only (no resume feature).
- Content copy: avoid gendered/relationship stereotypes ("이성" etc.); psych results use hedged language, 2–3 sentences.
