# 두근슬롯 — agent notes

- Static site in `public/` (vanilla ES modules, no build). Content lives in `public/content/*.json`.
- UI must not filter content itself: use `public/src/content/query.js` (pure) via `repository.js`.
- Verify: `npm test` (unit + content validation). With `npm run dev` running on :5173, run `npm run e2e` (headless Chrome via puppeteer-core; screenshots in `tests/screens/`).
- Psych-test answers must never be stored or sent anywhere.
- Content copy: avoid gendered/relationship stereotypes ("이성" etc.); psych results use hedged language, 2–3 sentences.
