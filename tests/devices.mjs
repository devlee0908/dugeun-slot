// Device smoke test: runs the core flow on iPhone/iPad (WebKit = Safari engine) and Android (Chrome) profiles.
// Requires `npm run dev` (or BASE_URL) and `npx playwright-core install webkit` once.
import { chromium, devices, webkit } from 'playwright-core';
import { mkdir } from 'node:fs/promises';
import assert from 'node:assert/strict';

const BASE = process.env.BASE_URL || 'http://localhost:5173';
const OUT = new URL('./screens/devices/', import.meta.url);
await mkdir(OUT, { recursive: true });

const PROFILES = [
  { name: 'iphone-se', device: devices['iPhone SE'], engine: webkit },
  { name: 'iphone-15-pro', device: devices['iPhone 15 Pro'], engine: webkit },
  { name: 'ipad-mini', device: devices['iPad Mini'], engine: webkit },
  { name: 'galaxy-s9', device: devices['Galaxy S9+'], engine: chromium },
  { name: 'pixel-7', device: devices['Pixel 7'], engine: chromium },
];

// Chips are visually-hidden inputs: centre them first so the fixed dock never receives the tap.
async function tapCentered(page, selector) {
  const loc = page.locator(selector);
  await loc.evaluate((el) => el.scrollIntoView({ block: 'center' }));
  await page.waitForTimeout(150);
  await loc.tap({ force: true });
}

const shot = (page, profile, step) => page.screenshot({ path: new URL(`${profile}-${step}.png`, OUT).pathname });
let failed = 0;

for (const p of PROFILES.filter((x) => !process.env.ONLY || x.name === process.env.ONLY)) {
  const browser = await p.engine.launch(p.engine === chromium ? { channel: 'chrome' } : {});
  const context = await browser.newContext({ ...p.device, locale: 'ko-KR' });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  const label = `${p.name} (${p.engine.name()} ${p.device.viewport.width}×${p.device.viewport.height})`;
  try {
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await page.locator('.home .wordmark').waitFor();
    const fonts = await page.evaluate(async () => { await document.fonts.ready; return document.fonts.check('20px Jua') && document.fonts.check('16px "Pretendard Variable"'); });
    assert.ok(fonts, 'fonts not loaded');
    const overflow = () => page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    assert.equal(await overflow(), false, 'home overflow');
    await shot(page, p.name, '1-home');

    await page.getByTestId('start').tap();
    await page.locator('#setup-form').waitFor();
    await tapCentered(page, 'input[name=type][value=balance]');
    await tapCentered(page, 'input[name=list][value=all]');
    assert.equal(await overflow(), false, 'setup overflow');
    await shot(page, p.name, '2-setup');

    await page.getByTestId('spin').tap();
    await page.locator('.slot').waitFor();
    await shot(page, p.name, '3-slot');
    await page.locator('.slot__skip').tap();
    await page.locator('[data-card-id]').waitFor({ timeout: 2000 });
    await page.locator('[data-action=vote][data-opt=a]').tap();
    await page.locator('.followup.is-open').waitFor();
    const bar = await page.locator('#actionbar').boundingBox();
    assert.ok(bar && bar.y + bar.height <= p.device.viewport.height + 1, 'action bar off screen');
    await shot(page, p.name, '4-balance');

    await page.locator('.cond-chip').tap();
    await page.locator('#settings-sheet[open]').waitFor();
    await tapCentered(page, '#sheet-form input[name=type][value=psych]');
    await shot(page, p.name, '5-sheet');
    await page.locator('[data-action=apply-sheet]').tap();
    await page.locator('.slot, [data-card-id]').first().waitFor();
    if (await page.locator('.slot__skip').count()) await page.locator('.slot__skip').tap();
    await page.locator('.card--psych').waitFor();
    await page.locator('[data-action=pick]').first().tap();
    await page.locator('.result').waitFor();
    await page.waitForTimeout(700);
    const inView = await page.locator('.result__title').evaluate((el) => { const r = el.getBoundingClientRect(); return r.top >= 0 && r.top < window.innerHeight; });
    assert.ok(inView, 'result not scrolled into view');
    await shot(page, p.name, '6-psych-result');

    await page.locator('[data-action=share]').tap();
    await page.locator('#share-dialog[open] .share__img').waitFor();
    const dims = await page.locator('.share__img').evaluate(async (img) => { await img.decode(); return [img.naturalWidth, img.naturalHeight]; });
    assert.deepEqual(dims, [1080, 1350]);
    await shot(page, p.name, '7-share');
    await page.locator('#share-dialog [data-action=close-sheet]').tap();

    assert.equal(await overflow(), false, 'play overflow');
    assert.deepEqual(errors, []);
    console.log(`  ✓ ${label}`);
  } catch (err) {
    failed++;
    console.log(`  ✗ ${label}: ${(process.env.ONLY ? err.message : err.message.split('\n')[0])}`);
    if (errors.length) console.log(`    ${errors.join('\n    ')}`);
    await shot(page, p.name, 'fail').catch(() => {});
  } finally {
    await browser.close();
  }
}

console.log(failed ? `\n❌ ${failed}개 기기 실패` : '\n✅ 모든 기기 프로필 통과 — tests/screens/devices/');
process.exitCode = failed ? 1 : 0;
