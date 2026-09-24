// Regenerates PNG icons and the Open Graph image from the live site. Needs `npm run dev` running.
import puppeteer from 'puppeteer-core';
import { readFile } from 'node:fs/promises';

const BASE = process.env.BASE_URL || 'http://localhost:5173';
const CHROME = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const assets = (f) => new URL(`../public/assets/${f}`, import.meta.url).pathname;

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true });
const page = await browser.newPage();

const svg = await readFile(assets('favicon.svg'), 'utf8');
for (const size of [192, 512]) {
  await page.setViewport({ width: size, height: size });
  await page.setContent(`<body style="margin:0;background:#FFF3F5;display:grid;place-items:center;height:100vh">${svg.replace('<svg ', `<svg width="${size * 0.86}" height="${size * 0.86}" `)}</body>`);
  await page.screenshot({ path: assets(`icon-${size}.png`) });
}

await page.setViewport({ width: 1200, height: 630 });
await page.goto(BASE, { waitUntil: 'networkidle0' });
await page.waitForSelector('.home .wordmark');
await page.addStyleTag({ content: '.home__foot,.home__cta,.home__stats{display:none!important}.home__main{padding:30px 60px!important}*{animation:none!important}' });
await page.screenshot({ path: assets('og.png') });
await browser.close();
console.log('✓ public/assets/icon-192.png, icon-512.png, og.png');
