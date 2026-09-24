// End-to-end check in real Chrome (headless). Requires the dev server: `npm run dev` then `npm run e2e`.
// Env: BASE_URL (default http://localhost:5173), CHROME_PATH (default: macOS Google Chrome)
import puppeteer from 'puppeteer-core';
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { loadAll } from '../scripts/validate-content.mjs';
import { filterContent } from '../public/src/content/query.js';
import { sanitizeSettings } from '../public/src/content/meta.js';

const BASE = process.env.BASE_URL || 'http://localhost:5173';
const CHROME = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const OUT = new URL('./screens/', import.meta.url);
await mkdir(OUT, { recursive: true });

const items = await loadAll();
const byId = Object.fromEntries(items.map((i) => [i.id, i]));
const expected = (s) => filterContent(items, sanitizeSettings(s));

const MOBILE = { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true };
const DESKTOP = { width: 1366, height: 900, deviceScaleFactor: 1 };

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox', '--font-render-hinting=none'] });
const errors = [];
let step = 0;
const log = (msg) => console.log(`  ✓ ${msg}`);

async function newPage(viewport = MOBILE) {
  const page = await browser.newPage();
  await page.setViewport(viewport);
  page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));
  page.on('console', (m) => { if (m.type() === 'error' && !/fonts\.g|jsdelivr|Failed to load resource/.test(m.text())) errors.push(`console: ${m.text()}`); });
  return page;
}

const shot = (page, name, opts = {}) => page.screenshot({ path: new URL(`${String(++step).padStart(2, '0')}-${name}.png`, OUT).pathname, ...opts });
const state = (page) => page.evaluate(() => window.__dugeun.state);
const cardId = (page) => page.$eval('[data-card-id]', (el) => el.dataset.cardId);
const waitCard = (page, timeout = 5000) => page.waitForSelector('[data-card-id]', { timeout });

// Scroll the element to the viewport centre first so the fixed bottom dock never intercepts the tap.
async function tap(page, sel) {
  await page.$eval(sel, (el) => el.scrollIntoView({ block: 'center' }));
  await page.click(sel);
}

async function setSetup(page, { group, type, topics = [], list }, root = '#setup-form') {
  if (group) await tap(page, `${root} input[name=group][value=${group}]`);
  if (type) await tap(page, `${root} input[name=type][value=${type}]`);
  const allChecked = await page.$eval(`${root} input[name=topicAll]`, (el) => el.checked);
  if (!allChecked) await tap(page, `${root} input[name=topicAll]`);
  for (const t of topics) await tap(page, `${root} input[name=topic][value=${t}]`);
  if (list) await tap(page, `${root} input[name=list][value=${list}]`);
}

async function saveShare(page, name, withDialogShot = false) {
  await page.click('[data-action=share]');
  await page.waitForSelector('#share-dialog[open] .share__img');
  const dims = await page.$eval('#share-dialog .share__img', async (img) => { await img.decode(); return [img.naturalWidth, img.naturalHeight]; });
  assert.deepEqual(dims, [1080, 1350]);
  const dataUrl = await page.evaluate(async () => {
    const blob = await (await fetch(document.querySelector('#share-dialog .share__img').src)).blob();
    return new Promise((r) => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(blob); });
  });
  await writeFile(new URL(`${String(++step).padStart(2, '0')}-${name}.png`, OUT), Buffer.from(dataUrl.split(',')[1], 'base64'));
  if (withDialogShot) await shot(page, 'mobile-share-dialog');
  await page.click('#share-dialog [data-action=close-sheet]');
}

async function spinAndSkip(page) {
  await page.waitForSelector('.slot, [data-card-id], .card--end', { timeout: 3000 });
  if (await page.$('.slot')) await page.click('.slot__skip');
  await page.waitForSelector('[data-card-id], .card--end', { timeout: 3000 });
}

try {
  /* ---------- 1. Home → setup → slot → first card (mobile) ---------- */
  console.log('\n[1] 전체 흐름 (모바일 390×844)');
  const page = await newPage();
  await page.goto(BASE, { waitUntil: 'networkidle0' });
  await page.waitForSelector('.home .wordmark');
  await shot(page, 'mobile-home', { fullPage: true });
  log('첫 화면: 로고/소개/시작하기 표시');

  await page.click('[data-testid=start]');
  await page.waitForSelector('#setup-form');
  const S1 = { group: 'couple', type: 'balance', topics: ['some', 'date'], list: 'hot' };
  await setSetup(page, S1);
  const exp1 = expected(S1);
  const uiCount = await page.$eval('#match-info', (el) => el.textContent);
  assert.match(uiCount, new RegExp(`${exp1.length}장`));
  await shot(page, 'mobile-setup', { fullPage: true });
  log(`설정 화면: 커플·밸런스·썸/데이트·HOT → ${exp1.length}장 (UI 일치)`);

  await page.click('[data-testid=spin]');
  await page.waitForSelector('.slot');
  const nextDisabled = await page.$eval('[data-testid=next]', (b) => b.disabled);
  assert.equal(nextDisabled, true, 'next must be disabled during spin');
  await page.evaluate(() => { document.querySelector('[data-testid=next]').click(); document.querySelector('[data-testid=next]').click(); });
  await new Promise((r) => setTimeout(r, 450));
  await shot(page, 'mobile-slot-spinning');
  assert.equal((await state(page)).seen.length, 1, 'double click during spin must not draw twice');
  log('슬롯 회전 중: 다음 버튼 비활성, 중복 실행 없음');
  const t0 = Date.now();
  await waitCard(page, 4000);
  const firstId = await cardId(page);
  log(`슬롯 자동 정지 후 카드 공개 (${Date.now() - t0 + 450}ms): ${firstId}`);
  assert.ok(exp1.some((i) => i.id === firstId), 'first card must match filter');
  await new Promise((r) => setTimeout(r, 600));
  await shot(page, 'mobile-balance-card', { fullPage: true });

  // balance votes
  await page.click('[data-action=vote][data-opt=a]');
  await page.click('[data-action=vote][data-opt=a]');
  await page.click('[data-action=vote][data-opt=b]');
  const follow = await page.$eval('.followup', (el) => el.textContent);
  assert.ok(follow.includes(byId[firstId].followUp));
  await new Promise((r) => setTimeout(r, 400));
  await shot(page, 'mobile-balance-voted', { fullPage: true });
  await saveShare(page, 'share-balance');
  log('밸런스: 투표 집계 + 후속 질문 표시');

  /* ---------- 2. Skip animation ---------- */
  console.log('\n[2] 슬롯 건너뛰기');
  await page.click('[data-testid=next]');
  await page.waitForSelector('.slot');
  const t1 = Date.now();
  await page.click('.slot__skip');
  await waitCard(page, 1000);
  const skipMs = Date.now() - t1;
  assert.ok(skipMs < 600, `skip should reveal immediately (${skipMs}ms)`);
  log(`「바로 보기」로 즉시 공개 (${skipMs}ms)`);

  /* ---------- 3. No duplicates & exhaustion ---------- */
  console.log('\n[3] 중복 방지 · 카드 소진');
  const ids = [firstId, await cardId(page)];
  while (true) {
    await page.click('[data-testid=next]');
    await spinAndSkip(page);
    if (await page.$('.card--end')) break;
    ids.push(await cardId(page));
  }
  assert.equal(new Set(ids).size, ids.length, `duplicates: ${ids}`);
  assert.deepEqual([...ids].sort(), exp1.map((i) => i.id).sort());
  const endButtons = await page.$$eval('.card--end [data-action]', (els) => els.map((b) => b.dataset.action));
  assert.deepEqual(endButtons, ['reshuffle', 'open-settings']);
  await shot(page, 'mobile-exhausted', { fullPage: true });
  log(`${ids.length}장 모두 중복 없이 노출 → 소진 화면(다시 섞기/조건 바꾸기)`);
  await page.click('[data-action=reshuffle]');
  await spinAndSkip(page);
  const reshuffledId = await cardId(page);
  assert.ok(exp1.some((i) => i.id === reshuffledId));
  log('다시 섞기 → 새 카드 공개');

  /* ---------- 4. Change conditions mid-game → psych ---------- */
  console.log('\n[4] 진행 중 조건 변경 → 심리테스트 전체 검증');
  await page.click('.cond-chip');
  await page.waitForSelector('#settings-sheet[open]');
  await setSetup(page, { group: 'free', type: 'psych', list: 'all' }, '#sheet-form');
  await shot(page, 'mobile-settings-sheet');
  await page.click('[data-action=apply-sheet]');
  const psychAll = expected({ group: 'free', type: 'psych', list: 'all' });
  assert.equal(psychAll.length, items.filter((i) => i.type === 'psych').length);
  const seenPsych = new Set();
  let checkedOptions = 0;
  let firstPsychShot = false;
  while (true) {
    await spinAndSkip(page);
    if (await page.$('.card--end')) break;
    const id = await cardId(page);
    const item = byId[id];
    assert.equal(item.type, 'psych');
    assert.ok(!seenPsych.has(id));
    seenPsych.add(id);
    if (!firstPsychShot) await shot(page, 'mobile-psych-card', { fullPage: true });
    for (const opt of item.options) {
      const t = Date.now();
      await tap(page, `[data-action=pick][data-opt="${opt.id}"]`);
      const title = await page.$eval('.result__title', (el) => el.textContent);
      const body = await page.$eval('.result__body', (el) => el.textContent);
      assert.equal(title, opt.result.title, `${id}/${opt.id} title`);
      assert.equal(body, opt.result.body, `${id}/${opt.id} body`);
      assert.ok((await page.$eval('.result__talk', (el) => el.textContent)).includes(opt.result.talk));
      assert.ok(Date.now() - t < 500);
      checkedOptions++;
    }
    if (!firstPsychShot) {
      await new Promise((r) => setTimeout(r, 450));
      await shot(page, 'mobile-psych-result', { fullPage: true });
      await saveShare(page, 'share-psych-result');
      await page.click('[data-action=other-result]');
      assert.equal(await page.$('.result'), null);
      assert.ok((await page.$$('.choice.is-viewed')).length >= 1);
      await shot(page, 'mobile-psych-other');
      firstPsychShot = true;
    }
    await page.click('[data-testid=next]');
  }
  assert.equal(seenPsych.size, psychAll.length);
  log(`심리테스트 ${seenPsych.size}개 × 선택지 ${checkedOptions}개: 선택 즉시 해당 결과 표시 확인`);
  log('「다른 결과 보기」→ 선택 해제, 본 선택지 표시');

  /* ---------- 5. Talk: skip + follow-up ---------- */
  console.log('\n[5] 대화 질문 · 건너뛰기');
  await page.click('[data-action=open-settings]');
  await page.waitForSelector('#settings-sheet[open]');
  await setSetup(page, { group: 'solo', type: 'talk', list: 'all' }, '#sheet-form');
  await page.click('[data-action=apply-sheet]');
  await spinAndSkip(page);
  const talkId = await cardId(page);
  assert.equal(byId[talkId].audience.solo, 2, 'solo group should get solo-priority questions first');
  await page.click('[data-action=show-follow]');
  assert.ok((await page.$eval('.followup', (el) => el.textContent)).includes(byId[talkId].followUp));
  await new Promise((r) => setTimeout(r, 400));
  await shot(page, 'mobile-talk-card', { fullPage: true });
  await page.click('[data-action=skip]');
  await spinAndSkip(page);
  assert.notEqual(await cardId(page), talkId);
  log('솔로 모임 → 우선 추천(2) 질문부터 노출, 꼬리 질문, 건너뛰기 동작');

  /* ---------- 6. Share image ---------- */
  console.log('\n[6] 공유 이미지');
  await saveShare(page, 'share-talk', true);
  log('대화 카드 → 1080×1350 PNG 생성, 미리보기/저장 제공');

  /* ---------- 7. Home / reload start a new game (no resume) ---------- */
  console.log('\n[7] 처음 화면 복귀 · 새로고침 시 새 판');
  const before = await state(page);
  await page.click('.topbar__home');
  await page.waitForSelector('.home');
  assert.equal(await page.$('a[href="#/play"]'), null, 'resume button must not exist');
  assert.deepEqual((await state(page)).seen, [], 'going home ends the game');
  await page.goBack();
  await page.waitForSelector('#setup-form');
  log('처음 화면에 「이어서 하기」 없음, 뒤로 가기로 진행 화면에 돌아가지 않고 설정 화면으로 이동');
  await page.goto(`${BASE}/#/play`, { waitUntil: 'networkidle0' });
  await page.waitForSelector('#setup-form');
  const after = await state(page);
  assert.equal(after.currentId, null);
  assert.deepEqual(after.seen, []);
  assert.deepEqual(after.settings, before.settings);
  assert.equal(await page.evaluate(() => sessionStorage.length), 0, 'no progress stored');
  log('새로고침/직접 접속 시 진행 상태 없이 설정 화면으로 이동 (설정만 기억)');
  await page.close();

  /* ---------- 8. Filtering matrix via UI ---------- */
  console.log('\n[8] 필터링 (UI 카운트 = 데이터 기준)');
  const p2 = await newPage();
  await p2.goto(`${BASE}/#/setup`, { waitUntil: 'networkidle0' });
  await p2.waitForSelector('#setup-form');
  const combos = [
    { group: 'couple', type: 'talk', list: 'all' },
    { group: 'solo', type: 'talk', list: 'all' },
    { group: 'friends', type: 'talk', topics: ['first'], list: 'new' },
    { group: 'some', type: 'psych', topics: ['some', 'date'], list: 'hot' },
    { group: 'free', type: 'balance', list: 'new' },
    { group: 'free', type: 'balance', list: 'all' },
  ];
  for (const c of combos) {
    await setSetup(p2, c);
    const n = expected(c).length;
    const text = await p2.$eval('#match-info', (el) => el.textContent);
    assert.match(text, new RegExp(`카드 ${n}장`), `${JSON.stringify(c)} → ${text}`);
    log(`${c.group}/${c.type}/${(c.topics || ['전체']).join('+')}/${c.list} → ${n}장`);
  }
  const coupleOnly = items.filter((i) => i.type === 'talk' && i.audience.solo === 0).length;
  assert.equal(expected({ group: 'couple', type: 'talk' }).length - expected({ group: 'solo', type: 'talk' }).length, coupleOnly - items.filter((i) => i.type === 'talk' && i.audience.couple === 0).length);
  log(`커플 전용 질문 ${coupleOnly}개는 커플에게만 노출`);
  await p2.close();

  /* ---------- 9. Empty state with suggestions (fixture) ---------- */
  console.log('\n[9] 조건에 맞는 카드가 없을 때');
  const p3 = await newPage();
  await p3.setRequestInterception(true);
  p3.on('request', (req) => {
    if (req.url().endsWith('/content/psych.json')) {
      const data = items.filter((i) => i.type === 'psych' && !(i.topic === 'some' && i.tags.includes('new')));
      req.respond({ status: 200, contentType: 'application/json', body: JSON.stringify(data) });
    } else req.continue();
  });
  await p3.goto(`${BASE}/#/setup`, { waitUntil: 'networkidle0' });
  await p3.waitForSelector('#setup-form');
  await setSetup(p3, { group: 'solo', type: 'psych', topics: ['some'], list: 'new' });
  await p3.waitForSelector('.match--empty');
  assert.equal(await p3.$eval('[data-testid=spin]', (b) => b.disabled), true);
  await shot(p3, 'mobile-empty-suggest', { fullPage: true });
  const sug = await p3.$eval('.suggest__btn', (b) => b.textContent);
  await p3.click('.suggest__btn');
  await p3.waitForSelector('.match:not(.match--empty)');
  assert.equal(await p3.$eval('[data-testid=spin]', (b) => b.disabled), false);
  log(`빈 결과 → 대안 제안 「${sug.trim()}」 적용 후 시작 가능`);
  await p3.close();

  /* ---------- 10. Reduced motion ---------- */
  console.log('\n[10] 움직임 줄이기');
  const p4 = await newPage();
  await p4.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  await p4.goto(`${BASE}/#/setup`, { waitUntil: 'networkidle0' });
  await p4.waitForSelector('#setup-form');
  await setSetup(p4, { group: 'friends', type: 'balance', list: 'all' });
  await p4.click('[data-testid=spin]');
  await waitCard(p4, 800);
  assert.equal(await p4.$('.slot'), null);
  log('prefers-reduced-motion: 슬롯 회전 없이 바로 카드 표시');
  await p4.close();

  /* ---------- 11. Desktop / tablet ---------- */
  console.log('\n[11] 데스크톱 · 태블릿');
  for (const [name, vp] of [['desktop', DESKTOP], ['tablet', { width: 820, height: 1180, deviceScaleFactor: 1, isMobile: true, hasTouch: true }], ['small', { width: 320, height: 640, deviceScaleFactor: 2, isMobile: true, hasTouch: true }]]) {
    const p = await newPage(vp);
    await p.goto(BASE, { waitUntil: 'networkidle0' });
    await p.waitForSelector('.home .wordmark');
    await shot(p, `${name}-home`);
    await p.click('[data-testid=start]');
    await p.waitForSelector('#setup-form');
    if (name === 'desktop') await shot(p, `${name}-setup`, { fullPage: true });
    await setSetup(p, { group: 'some', type: 'psych', list: 'all' });
    await p.click('[data-testid=spin]');
    await spinAndSkip(p);
    const first = byId[await cardId(p)];
    await p.click(`[data-action=pick][data-opt="${first.options[0].id}"]`);
    await new Promise((r) => setTimeout(r, 500));
    await p.evaluate(() => window.scrollTo(0, 0));
    await shot(p, `${name}-psych-result`, { fullPage: true });
    const overflow = await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    assert.equal(overflow, false, `${name}: horizontal overflow`);
    log(`${name} ${vp.width}×${vp.height}: 가로 스크롤 없음, 첫 카드 ${first.id}`);
    await p.close();
  }

  assert.deepEqual(errors, [], 'no runtime errors');
  console.log('\n✅ E2E 전체 통과 — 스크린샷: tests/screens/\n');
} catch (err) {
  console.error('\n❌ E2E 실패:', err.stack);
  if (errors.length) console.error(errors.join('\n'));
  process.exitCode = 1;
} finally {
  await browser.close();
}
