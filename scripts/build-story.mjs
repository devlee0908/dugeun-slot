// Renders Instagram story cuts (1080×1920 PNG) using the site's own fonts, styles and card components.
// Needs `npm run dev` running (or BASE_URL). Output: marketing/instagram-story/
import puppeteer from 'puppeteer-core';
import { mkdir } from 'node:fs/promises';
import { loadAll } from './validate-content.mjs';
import { renderCard, stickerTitle } from '../public/src/ui/cards.js';
import { logoMark, visualMarkup } from '../public/src/ui/illustrations.js';
import { GROUPS } from '../public/src/content/meta.js';

const BASE = process.env.BASE_URL || 'http://localhost:5173';
const CHROME = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const SITE = 'devlee0908.github.io/dugeun-slot';
const OUT = new URL('../marketing/instagram-story/', import.meta.url);

const items = await loadAll();
const byId = Object.fromEntries(items.map((i) => [i.id, i]));
const count = (t) => items.filter((i) => i.type === t).length;
const card = (id, view = {}) => renderCard(byId[id], { votes: {}, viewed: new Set(), ...view });

// Layout is designed at 540×960 and captured at 2× → 1080×1920.
// Key content stays between y≈120 and y≈780 (Instagram overlays the top bar and the bottom reply area).
const STYLE = `
  *, *::before, *::after { animation: none !important; transition: none !important; }
  html, body { margin: 0; width: 540px; height: 960px; overflow: hidden; }
  .story { position: relative; width: 540px; height: 960px; overflow: hidden; padding: 112px 30px 190px; box-sizing: border-box; justify-content: center;
    background-color: var(--page);
    background-image: linear-gradient(var(--grid) 1px, transparent 1px), linear-gradient(90deg, var(--grid) 1px, transparent 1px);
    background-size: 24px 24px; display: flex; flex-direction: column; align-items: center; }
  .brand { position: absolute; top: 46px; left: 30px; display: flex; align-items: center; gap: 8px; font-family: var(--font-display); font-size: 22px; color: var(--maroon); }
  .kicker { display: inline-block; padding: 6px 16px; border-radius: 999px; background: var(--yellow); border: 3px solid var(--maroon); box-shadow: 0 3px 0 var(--maroon);
    font-family: var(--font-display); font-size: 20px; color: var(--maroon); margin-bottom: 14px; }
  .headline { font-size: 58px; text-align: center; line-height: 1.12; }
  .sub { margin: 16px 0 0; font-family: var(--font-display); font-size: 25px; color: var(--maroon); text-align: center; line-height: 1.35; }
  .note { margin: 10px 0 0; font-size: 17px; font-weight: 600; color: var(--ink-soft); text-align: center; }
  .swipe { position: absolute; bottom: 150px; left: 0; right: 0; text-align: center; font-family: var(--font-display); font-size: 22px; color: var(--coral); }
  .deco { position: absolute; width: 86px; pointer-events: none; }
  .deco svg { width: 100%; height: auto; }
  .fit { width: 100%; transform-origin: top center; }
  .card { width: 100%; box-sizing: border-box; }
  .result__actions, .disclaimer, .card__note, .ghost-btn, .link-btn { display: none !important; }

  /* cut 1 */
  .bubbles { display: grid; gap: 14px; width: 100%; margin-top: 34px; }
  .bubble { max-width: 82%; padding: 16px 20px; border-radius: 24px; background: #fff; border: 3px solid var(--maroon); box-shadow: 0 4px 0 rgba(122,26,38,.25);
    font-size: 21px; font-weight: 700; line-height: 1.35; }
  .bubble:nth-child(odd) { justify-self: start; border-bottom-left-radius: 6px; }
  .bubble:nth-child(even) { justify-self: end; border-bottom-right-radius: 6px; background: var(--pink-soft); }
  .dots { justify-self: center; font-size: 40px; letter-spacing: 8px; color: var(--maroon); margin-top: 4px; }

  /* cut 2 */
  .logo-big { margin-top: 40px; filter: drop-shadow(0 8px 0 rgba(122,26,38,.18)); }
  .wordmark { font-size: 104px; margin-top: 10px; }
  .pills { display: flex; flex-wrap: wrap; justify-content: center; gap: 10px; margin-top: 30px; }
  .pill { padding: 10px 18px; border-radius: 999px; background: #fff; border: 3px solid var(--maroon); font-weight: 800; font-size: 19px; color: var(--maroon); }
  .types { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; width: 100%; margin-top: 30px; }
  .type { background: var(--paper); border: 3px solid var(--coral); border-radius: 20px; padding: 14px 6px; text-align: center; box-shadow: 0 4px 0 rgba(245,113,107,.45); }
  .type b { display: block; font-size: 40px; }
  .type span { display: block; font-family: var(--font-display); font-size: 19px; color: var(--maroon); margin-top: 4px; }
  .type small { display: block; font-size: 14px; font-weight: 700; color: var(--coral); }

  /* cut 3 */
  .how-steps { display: grid; gap: 10px; width: 100%; margin-top: 18px; }
  .how-step { display: flex; align-items: center; gap: 14px; background: #fff; border: 3px solid var(--maroon); border-radius: 22px; padding: 11px 14px; box-shadow: 0 5px 0 var(--maroon); }
  .how-step__n { flex: none; width: 46px; height: 46px; border-radius: 50%; background: var(--red); color: #fff; display: grid; place-items: center; font-family: var(--font-display); font-size: 26px; border: 3px solid var(--maroon); }
  .how-step__t { font-family: var(--font-display); font-size: 25px; color: var(--maroon); }
  .how-step__d { font-size: 16px; font-weight: 600; color: var(--ink-soft); margin-top: 2px; }
  .chips-row { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
  .chip-mini { padding: 4px 10px; border-radius: 999px; border: 2px solid var(--maroon); background: var(--yellow-soft); font-size: 14px; font-weight: 800; }
  .slot { margin-top: 0; animation: none; width: 100%; box-sizing: border-box; }
  .slot { padding: 12px 14px 14px; } .slot__marquee { padding-bottom: 8px; } .slot__window { --h: 70px; }

  /* cut 7 */
  .link-zone { margin-top: 30px; width: 100%; box-sizing: border-box; padding: 26px 18px; border: 4px dashed var(--coral); border-radius: 28px; background: rgba(255,255,255,.75); text-align: center; }
  .link-zone__hint { font-family: var(--font-display); font-size: 24px; color: var(--coral); }
  .link-zone__url { margin-top: 10px; font-size: 21px; font-weight: 800; color: var(--maroon); word-break: break-all; }
  .cta-btn { margin-top: 26px; font-size: 28px; min-height: 76px; padding: 0 40px; }
`;

const fitScript = `
  document.fonts.ready.then(() => {
    for (const el of document.querySelectorAll('.fit')) {
      const max = Number(el.dataset.max);
      const s = Math.min(1, max / el.scrollHeight);
      el.style.transform = 'scale(' + s + ')';
      el.style.height = (el.scrollHeight * s) + 'px';
    }
    document.body.dataset.ready = '1';
  });
`;

const brand = `<div class="brand">${logoMark(36)}<span>두근슬롯</span></div>`;

const CUTS = [
  {
    name: '01-hook',
    html: `
      <div class="kicker">모임에서 이런 적 있다면?</div>
      ${stickerTitle('모이면 뭐 하지?', { tag: 'h1', cls: 'headline' })}
      <div class="bubbles">
        <div class="bubble">연애 얘기 하고 싶은데… 😶</div>
        <div class="bubble">먼저 꺼내긴 좀 애매하고</div>
        <div class="bubble">질문도 막상 생각 안 나고</div>
        <div class="dots">···</div>
      </div>
      <p class="sub">어색한 침묵 3초 전,<br>이걸 돌려 보세요 👀</p>
      <div class="swipe">넘겨 보기 →</div>`,
    deco: [['balloon', '#FF8FAB', 'left:-18px;top:150px'], ['heartBalloon', '#F2473F', 'right:-14px;top:110px;width:76px']],
  },
  {
    name: '02-intro',
    html: `
      <div class="logo-big">${logoMark(150)}</div>
      ${stickerTitle('두근슬롯', { tag: 'h1', cls: 'wordmark' }).replace('두근슬롯', '<span class="hl">두근</span>슬롯')}
      <p class="sub">돌리면 시작되는<br>우리들의 연애 수다</p>
      <div class="types">
        <div class="type"><b>⚖️</b><span>밸런스 게임</span><small>${count('balance')}개</small></div>
        <div class="type"><b>💬</b><span>대화 질문</span><small>${count('talk')}개</small></div>
        <div class="type"><b>🔮</b><span>심리테스트</span><small>${count('psych')}개</small></div>
      </div>
      <div class="pills"><span class="pill">가입 없이</span><span class="pill">무료</span><span class="pill">폰 한 대면 끝</span></div>`,
    deco: [['balloon', '#FFD43B', 'left:-10px;top:300px;width:70px'], ['balloon', '#3E8EDE', 'right:-8px;top:240px;width:66px']],
  },
  {
    name: '03-how',
    html: `
      <div class="kicker">사용법은 3초</div>
      ${stickerTitle('이렇게 돌려요', { tag: 'h1', cls: 'headline' })}
      <div class="how-steps">
        <div class="how-step"><div class="how-step__n">1</div><div><div class="how-step__t">누구랑 하는지 고르고</div>
          <div class="chips-row">${GROUPS.map((g) => `<span class="chip-mini">${g.emoji} ${g.label}</span>`).join('')}</div></div></div>
        <div class="how-step"><div class="how-step__n">2</div><div><div class="how-step__t">게임과 주제를 정하면</div><div class="how-step__d">밸런스 · 대화 · 심리테스트 / 썸 · 데이트 · 미래…</div></div></div>
        <div class="how-step"><div class="how-step__n">3</div><div><div class="how-step__t">🎰 슬롯이 카드를 뽑아요!</div><div class="how-step__d">돌아가며 답하고 「다음 카드」</div></div></div>
      </div>
      <div class="slot" style="margin-top:16px">
        <div class="slot__marquee">${'<i></i>'.repeat(9)}</div>
        
        <div class="slot__window"><div class="slot__reel"><div class="slot__item is-target"><span class="slot__emoji">🎈</span><span class="slot__text">마음 풍선 테스트</span></div></div><div class="slot__glass"></div></div>
      </div>`,
  },
  {
    name: '04-balance',
    html: `
      <div class="kicker">⚖️ 밸런스 게임</div>
      ${stickerTitle('너라면 뭐 골라?', { tag: 'h1', cls: 'headline' })}
      <p class="note">돌아가며 한 명씩 탭! 고른 이유를 이야기해요</p>
      <div class="fit" data-max="560" style="margin-top:18px">${card('bal-002', { votes: { a: 2, b: 3 } })}</div>`,
  },
  {
    name: '05-psych',
    html: `
      <div class="kicker">🔮 심리테스트</div>
      ${stickerTitle('고르면 바로 결과', { tag: 'h1', cls: 'headline' })}
      <p class="note">${count('psych')}가지 테스트 · 고르는 순간 해석이 열려요</p>
      <div class="fit" data-max="500" style="margin-top:14px">${card('psy-001', { picked: 'red', viewed: new Set(['red']) })}</div>`,
  },
  {
    name: '06-talk',
    html: `
      <div class="kicker">💬 대화 질문</div>
      ${stickerTitle('가볍게, 때론 깊게', { tag: 'h1', cls: 'headline' })}
      <p class="note">부담되면 「건너뛰기」도 OK</p>
      <div class="fit" data-max="560" style="margin-top:18px">${card('talk-002', { showFollow: true })}</div>`,
  },
  {
    name: '07-cta',
    html: `
      <div class="logo-big" style="margin-top:10px">${logoMark(110)}</div>
      ${stickerTitle('오늘 같이 돌려 볼래?', { tag: 'h1', cls: 'headline' })}
      <p class="sub">다음 모임, 첫 질문은<br>두근슬롯에게 맡겨요 💌</p>
      <div class="link-zone">
        <div class="link-zone__hint">👇 링크 눌러서 바로 시작</div>
        <div class="link-zone__url">${SITE}</div>
      </div>
      <p class="note">가입 없이 무료 · 고른 답은 어디에도 저장되지 않아요</p>`,
    deco: [['heartBalloon', '#F2473F', 'left:-12px;top:150px;width:80px'], ['balloon', '#FFD43B', 'right:-10px;top:200px;width:70px']],
  },
];

const page_ = (cut) => `<!doctype html><html lang="ko"><head><meta charset="utf-8">
  <link rel="stylesheet" href="${BASE}/assets/fonts/fonts.css"><link rel="stylesheet" href="${BASE}/src/styles.css">
  <style>${STYLE}</style></head><body>
  <div class="story">${brand}${(cut.deco || []).map(([k, c, s]) => `<span class="deco" style="${s}">${visualMarkup({ kind: k, color: c })}</span>`).join('')}${cut.html}</div>
  <script>${fitScript}</script></body></html>`;

await mkdir(OUT, { recursive: true });
const browser = await puppeteer.launch({ executablePath: CHROME, headless: true });
const page = await browser.newPage();
await page.setViewport({ width: 540, height: 960, deviceScaleFactor: 2 });
await page.goto(BASE, { waitUntil: 'networkidle0' });
for (const cut of CUTS) {
  await page.setContent(page_(cut), { waitUntil: 'load' });
  await page.waitForSelector('body[data-ready="1"]', { timeout: 15000 });
  await new Promise((r) => setTimeout(r, 200));
  await page.screenshot({ path: new URL(`${cut.name}.png`, OUT).pathname });
  console.log(`  ✓ ${cut.name}.png`);
}
await browser.close();
console.log(`✓ ${CUTS.length} story cuts (1080×1920) → marketing/instagram-story/`);
