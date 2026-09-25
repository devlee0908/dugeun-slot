# 두근슬롯 — agent notes

- Static site in `public/` (vanilla ES modules, no build). Content lives in `public/content/*.json`. Deployed to GitHub Pages (https://devlee0908.github.io/dugeun-slot/) by `.github/workflows/pages.yml` on push to `main`.
- UI must not filter content itself: use `public/src/content/query.js` (pure) via `repository.js`.
- Verify: `npm test` (unit + content validation: ≥60 per type, ≥10 cards per type×topic×group, no duplicate questions). With `npm run dev` running on :5173, run `npm run e2e` (puppeteer + Chrome) and `npm run devices` (playwright WebKit/Chrome device profiles; needs `npx playwright-core install webkit` once). Both accept `BASE_URL`.
- Fonts are self-hosted in `public/assets/fonts/` (regenerate with `npm run fonts`); the site must make no external requests (E2E asserts this).
- Psych-test answers must never be stored or sent anywhere. Game progress is in-memory only (no resume feature).
- Content copy: avoid gendered/relationship stereotypes ("이성" etc.); psych results use hedged language, 2–3 sentences.
