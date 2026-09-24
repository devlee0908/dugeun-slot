import { createContentRepository } from './content/repository.js';
import { GROUP_BY_ID, LIST_BY_ID, TOPICS, TYPE_BY_ID, describeSettings, sanitizeSettings } from './content/meta.js';
import { countStatus, drawNext, filterContent, suggestAlternatives } from './content/query.js';
import { clearProgress, loadProgress, loadSettings, loadSound, saveProgress, saveSettings, saveSound } from './state.js';
import { renderCard, renderEmptyCard, renderEndCard, renderMatchInfo, renderSetupForm, readSetupForm, stickerTitle } from './ui/cards.js';
import { $, $$, escapeHtml as e, prefersReducedMotion, toast } from './ui/dom.js';
import { logoMark, visualMarkup } from './ui/illustrations.js';
import { runSlot } from './ui/slot.js';
import { renderShareImage, shareImage } from './ui/share.js';
import { ding, pop, setSound, tick } from './ui/sound.js';

const app = document.getElementById('app');
const repo = createContentRepository();

const state = {
  items: [],
  settings: loadSettings(),
  seen: new Set(),
  currentId: null,
  view: {},
  busy: false,
  slot: null,
  spinToken: 0,
  pendingSpin: false,
  sound: loadSound(),
  suggestions: [],
  sheetSettings: null,
  shareUrl: null,
};

const current = () => state.items.find((i) => i.id === state.currentId) || null;
const status = (s = state.settings) => countStatus(state.items, s, state.seen);
const persist = () => saveProgress({ seen: state.seen, currentId: state.currentId });

/* ---------------- routing ---------------- */

function route() {
  cancelSpin();
  closeDialogs();
  const r = location.hash.replace(/^#\/?/, '') || 'home';
  if (r === 'setup') renderSetup();
  else if (r === 'play') renderPlay();
  else renderHome();
  window.scrollTo(0, 0);
}

const go = (path) => {
  if (location.hash === `#/${path}`) route();
  else location.hash = `#/${path}`;
};

/* ---------------- home ---------------- */

function renderHome() {
  document.title = '두근슬롯 · 함께 돌리는 연애 수다 카드';
  const count = (t) => state.items.filter((i) => i.type === t).length;
  const resume = state.currentId && current();
  app.innerHTML = `<div class="screen home">
    <div class="deco" aria-hidden="true">
      <span class="deco__b deco__b--1">${visualMarkup({ kind: 'balloon', color: '#FF8FAB' })}</span>
      <span class="deco__b deco__b--2">${visualMarkup({ kind: 'heartBalloon', color: '#F2473F' })}</span>
      <span class="deco__b deco__b--3">${visualMarkup({ kind: 'balloon', color: '#FFD43B' })}</span>
      <span class="deco__b deco__b--4">${visualMarkup({ kind: 'balloon', color: '#3E8EDE' })}</span>
    </div>
    <main class="home__main">
      <section class="home__hero">
        <div class="home__logo">${logoMark(104)}</div>
        <h1 class="wordmark sticker-title"><span class="hl">두근</span>슬롯</h1>
        <p class="home__tagline">돌리면 시작되는 우리들의 연애 수다</p>
        <p class="home__desc">밸런스 게임 · 대화 질문 · 심리테스트를<br>한 대의 폰으로 돌려 보며 함께 즐겨요.</p>
        <div class="home__cta">
          <a class="btn btn--primary btn--xl" href="#/setup" data-testid="start">시작하기</a>
          ${resume ? '<a class="btn btn--ghost" href="#/play">이어서 하기</a>' : ''}
        </div>
        <ul class="home__stats" aria-label="준비된 카드">
          <li><b>${count('balance')}</b>밸런스 게임</li>
          <li><b>${count('talk')}</b>대화 질문</li>
          <li><b>${count('psych')}</b>심리테스트</li>
        </ul>
      </section>
      <section class="home__fan" aria-hidden="true">
        <div class="mini mini--balance">
          <span class="mini__tag">⚖️ 밸런스 게임</span>
          <p class="mini__q">연락 스타일, 하나만 고른다면?</p>
          <div class="mini__vs"><span>📱<br>매일 짧게</span><b>VS</b><span>☎️<br>주 1회 길게</span></div>
        </div>
        <div class="mini mini--talk">
          <span class="mini__tag">💬 대화 질문</span>
          <p class="mini__q">'어, 나 이 사람 좋아하나?' 알아차리는 순간은?</p>
          <span class="mini__emoji">💡</span>
        </div>
        <div class="mini mini--psych">
          ${stickerTitle('마음 풍선 테스트', { tag: 'p', cls: 'mini__title' })}
          <div class="mini__grid">
            ${[['balloon', '#F2473F'], ['heartBalloon', '#3E8EDE'], ['balloon', '#FFD43B'], ['balloonDog', '#FFFFFF']].map(([kind, color]) => `<span>${visualMarkup({ kind, color })}</span>`).join('')}
          </div>
        </div>
      </section>
    </main>
    <footer class="home__foot">가입 없이 바로 · 선택과 결과는 서버로 보내지 않아요</footer>
  </div>`;
}

/* ---------------- setup ---------------- */

function topbar({ play = false } = {}) {
  const s = state.settings;
  const topicText = s.topics.length === 0 || s.topics.length === TOPICS.length ? '전체 주제' : `주제 ${s.topics.length}개`;
  return `<header class="topbar">
    <a href="#/" class="topbar__home" aria-label="두근슬롯 처음 화면으로">${logoMark(38)}<span>두근슬롯</span></a>
    ${play ? `<button type="button" class="cond-chip" data-action="open-settings" title="${e(describeSettings(s))}" aria-label="조건 바꾸기: ${e(describeSettings(s))}">
      <span aria-hidden="true">${GROUP_BY_ID[s.group].emoji}</span><span class="cond-chip__text">${e(TYPE_BY_ID[s.type].label)} · ${topicText} · ${LIST_BY_ID[s.list].label}</span><span class="cond-chip__edit">변경</span>
    </button>` : '<span class="topbar__spacer"></span>'}
    <button type="button" class="icon-btn" data-action="toggle-sound" aria-pressed="${state.sound}" aria-label="효과음 ${state.sound ? '끄기' : '켜기'}">${state.sound ? '🔊' : '🔇'}</button>
  </header>`;
}

function renderSetup() {
  document.title = '게임 설정 · 두근슬롯';
  app.innerHTML = `<div class="screen setup">
    ${topbar()}
    <main class="setup__main">
      <div class="setup__intro">
        ${stickerTitle('오늘의 판 짜기', { tag: 'h1', cls: 'page-title' })}
        <p class="page-sub">누구와, 어떤 연애 이야기를 해볼까요?</p>
      </div>
      ${renderSetupForm(state.settings, 'setup')}
    </main>
    <div class="dock">
      <div class="dock__inner">
        <div id="match-info"></div>
        <button type="button" class="btn btn--primary btn--xl btn--block" data-action="start" data-testid="spin">🎰 슬롯 돌리기</button>
      </div>
    </div>
  </div>`;
  updateMatch(state.settings, $('#match-info'), $('[data-action="start"]'));
}

function updateMatch(s, target, button) {
  const st = status(s);
  state.suggestions = st.total ? [] : suggestAlternatives(state.items, s);
  target.innerHTML = renderMatchInfo(st, state.suggestions, s.type);
  if (button) button.disabled = st.total === 0;
  const dock = target.closest('.dock');
  if (dock) document.documentElement.style.setProperty('--dock-h', `${dock.offsetHeight}px`);
}

function syncTopicChecks(form, changed) {
  const all = form.querySelector('input[name="topicAll"]');
  const topics = $$('input[name="topic"]', form);
  if (changed === all && all.checked) topics.forEach((t) => (t.checked = false));
  if (changed?.name === 'topic' && changed.checked) all.checked = false;
  if (topics.every((t) => !t.checked)) all.checked = true;
  if (topics.every((t) => t.checked)) {
    topics.forEach((t) => (t.checked = false));
    all.checked = true;
  }
}

/* ---------------- play ---------------- */

function renderPlay() {
  document.title = '플레이 · 두근슬롯';
  app.innerHTML = `<div class="screen play">
    ${topbar({ play: true })}
    <div class="progress" id="progress"></div>
    <main class="stage" id="stage" tabindex="-1"></main>
    <footer class="actionbar" id="actionbar"></footer>
  </div>`;
  const item = current();
  if (state.pendingSpin || !item) {
    state.pendingSpin = false;
    spin();
  } else {
    showCard(item, { animate: false });
  }
}

function updateProgress() {
  const el = $('#progress');
  if (!el) return;
  const st = status();
  const pct = st.total ? Math.round((st.seen / st.total) * 100) : 0;
  el.innerHTML = st.total
    ? `<span class="progress__text"><b>${st.seen}</b> / ${st.total}장 · 남은 카드 ${st.remaining}장</span>
       <span class="progress__bar" role="progressbar" aria-valuemin="0" aria-valuemax="${st.total}" aria-valuenow="${st.seen}" aria-label="진행도"><i style="width:${pct}%"></i></span>`
    : '';
}

function renderActions(mode) {
  const bar = $('#actionbar');
  if (!bar) return;
  const item = current();
  const busy = state.busy ? 'disabled' : '';
  if (mode === 'end') {
    bar.innerHTML = `<div class="actionbar__inner">
      <a class="btn btn--ghost" href="#/">처음으로</a>
      <button type="button" class="btn btn--primary" data-action="open-settings">조건 바꾸기</button>
    </div>`;
    return;
  }
  const nextLabel = item?.type === 'psych' ? '다음 테스트' : '다음 카드';
  bar.innerHTML = `<div class="actionbar__inner">
    <button type="button" class="btn btn--icon" data-action="share" ${busy} aria-label="카드 이미지로 공유">📤<span>공유</span></button>
    ${item?.type === 'talk' ? `<button type="button" class="btn btn--ghost" data-action="skip" ${busy}>건너뛰기</button>` : ''}
    <button type="button" class="btn btn--primary btn--grow" data-action="next" data-testid="next" ${busy}>${nextLabel} →</button>
  </div>`;
}

function spin() {
  if (state.busy) return;
  const stage = $('#stage');
  if (!stage) return;
  const next = drawNext(state.items, state.settings, state.seen);
  if (!next) {
    const st = status();
    state.currentId = null;
    persist();
    state.suggestions = st.total ? [] : suggestAlternatives(state.items, state.settings);
    stage.innerHTML = st.total ? renderEndCard(st, state.settings.type) : renderEmptyCard(state.suggestions, state.settings.type);
    updateProgress();
    renderActions('end');
    return;
  }
  state.busy = true;
  state.seen.add(next.id);
  state.currentId = next.id;
  state.view = { votes: {}, viewed: new Set() };
  persist();
  updateProgress();
  renderActions();
  $$('.cond-chip').forEach((b) => (b.disabled = true));
  const token = ++state.spinToken;
  state.slot = runSlot(stage, {
    target: next,
    pool: state.items.filter((i) => i.type === next.type),
    reduced: prefersReducedMotion(),
    onTick: tick,
    onDone: () => {
      if (token !== state.spinToken) return;
      state.busy = false;
      state.slot = null;
      $$('.cond-chip').forEach((b) => (b.disabled = false));
      ding();
      showCard(next, { animate: true });
    },
  });
}

function cancelSpin() {
  state.spinToken++;
  state.busy = false;
  state.slot = null;
}

function showCard(item, { animate = false } = {}) {
  const stage = $('#stage');
  if (!stage) return;
  stage.innerHTML = renderCard(item, state.view);
  renderActions();
  updateProgress();
  if (animate) {
    const card = stage.firstElementChild;
    card.classList.add('is-revealing');
    if (!prefersReducedMotion()) burst(stage);
    stage.focus({ preventScroll: true });
  }
}

function rerenderCard() {
  const item = current();
  if (item) $('#stage').innerHTML = renderCard(item, state.view);
  state.view.followNew = false;
}

function burst(stage) {
  const layer = document.createElement('div');
  layer.className = 'burst';
  layer.setAttribute('aria-hidden', 'true');
  const glyphs = ['♥', '✦', '♥', '●', '♥', '✦', '♥', '●', '♥', '✦'];
  layer.innerHTML = glyphs.map((g, i) => {
    const angle = (i / glyphs.length) * Math.PI * 2;
    const r = 110 + Math.random() * 70;
    return `<i style="--x:${Math.cos(angle) * r}px;--y:${Math.sin(angle) * r}px;--c:${['#F2473F', '#FF8FAB', '#FFD43B', '#3E8EDE'][i % 4]}">${g}</i>`;
  }).join('');
  stage.append(layer);
  setTimeout(() => layer.remove(), 1100);
}

/* ---------------- settings sheet ---------------- */

function openSettings() {
  if (state.busy) return;
  state.sheetSettings = { ...state.settings };
  let dlg = $('#settings-sheet');
  if (!dlg) {
    dlg = document.createElement('dialog');
    dlg.id = 'settings-sheet';
    dlg.className = 'sheet';
    dlg.setAttribute('aria-labelledby', 'sheet-title');
    document.body.append(dlg);
    dlg.addEventListener('click', (ev) => { if (ev.target === dlg) dlg.close(); });
  }
  dlg.innerHTML = `<div class="sheet__inner">
    <div class="sheet__head">
      <h2 id="sheet-title" class="sheet__title">조건 바꾸기</h2>
      <button type="button" class="icon-btn" data-action="close-sheet" aria-label="닫기">✕</button>
    </div>
    <p class="sheet__note">이미 본 카드는 다시 나오지 않아요.</p>
    ${renderSetupForm(state.sheetSettings, 'sheet')}
    <div class="sheet__foot">
      <div id="sheet-match"></div>
      <div class="sheet__buttons">
        <a class="btn btn--ghost" href="#/">처음 화면</a>
        <button type="button" class="btn btn--primary btn--grow" data-action="apply-sheet">이 조건으로 돌리기</button>
      </div>
    </div>
  </div>`;
  updateMatch(state.sheetSettings, $('#sheet-match'), $('[data-action="apply-sheet"]', dlg));
  dlg.showModal();
}

function closeDialogs() {
  $$('dialog[open]').forEach((d) => d.close());
}

/* ---------------- share ---------------- */

async function openShare() {
  const item = current();
  if (!item || state.busy) return;
  const btn = $('[data-action="share"]');
  if (btn) btn.disabled = true;
  try {
    const blob = await renderShareImage(item, state.view);
    if (state.shareUrl) URL.revokeObjectURL(state.shareUrl);
    state.shareUrl = URL.createObjectURL(blob);
    state.shareBlob = blob;
    let dlg = $('#share-dialog');
    if (!dlg) {
      dlg = document.createElement('dialog');
      dlg.id = 'share-dialog';
      dlg.className = 'sheet sheet--share';
      dlg.setAttribute('aria-label', '카드 공유');
      document.body.append(dlg);
      dlg.addEventListener('click', (ev) => { if (ev.target === dlg) dlg.close(); });
    }
    const canShareFiles = !!navigator.canShare?.({ files: [new File([blob], 'x.png', { type: 'image/png' })] });
    dlg.innerHTML = `<div class="sheet__inner">
      <div class="sheet__head"><h2 class="sheet__title">카드 공유</h2><button type="button" class="icon-btn" data-action="close-sheet" aria-label="닫기">✕</button></div>
      <img class="share__img" src="${state.shareUrl}" alt="${e(item.type === 'psych' ? item.title : item.question)} 카드 이미지" width="1080" height="1350">
      <p class="sheet__note">${canShareFiles ? '인스타 스토리·메신저로 바로 보낼 수 있어요.' : '이미지를 저장한 뒤 원하는 곳에 올려 주세요. (길게 눌러 저장도 가능)'}</p>
      <div class="sheet__buttons">
        <a class="btn btn--ghost btn--grow" href="${state.shareUrl}" download="dugeun-slot-${e(item.id)}.png" data-testid="download">이미지 저장</a>
        ${canShareFiles ? '<button type="button" class="btn btn--primary btn--grow" data-action="native-share">공유하기</button>' : ''}
      </div>
    </div>`;
    dlg.showModal();
  } catch (err) {
    console.error(err);
    toast('이미지를 만들지 못했어요. 다시 시도해 주세요.');
  } finally {
    if (btn) btn.disabled = false;
  }
}

/* ---------------- events ---------------- */

const actions = {
  start() {
    if (!status().total) return;
    saveSettings(state.settings);
    state.pendingSpin = true;
    go('play');
  },
  next: spin,
  skip() {
    toast('다음 질문으로 넘어갈게요 👋');
    spin();
  },
  'skip-slot'() {
    state.slot?.skip();
  },
  vote(el) {
    const id = el.dataset.opt;
    state.view.followNew = Object.keys(state.view.votes).length === 0;
    state.view.votes[id] = (state.view.votes[id] || 0) + 1;
    pop();
    rerenderCard();
    $(`[data-opt="${CSS.escape(id)}"]`)?.focus({ preventScroll: true });
  },
  'reset-votes'() {
    state.view.votes = {};
    rerenderCard();
  },
  'show-follow'() {
    state.view.showFollow = true;
    state.view.followNew = true;
    rerenderCard();
  },
  pick(el) {
    state.view.picked = el.dataset.opt;
    state.view.viewed.add(el.dataset.opt);
    pop();
    rerenderCard();
    const result = $('.result');
    result?.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });
    result?.focus({ preventScroll: true });
  },
  'other-result'() {
    state.view.picked = null;
    rerenderCard();
    $('.card__question')?.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });
    toast('다음 사람도 골라 보세요!');
  },
  reshuffle() {
    for (const i of filterContent(state.items, state.settings)) state.seen.delete(i.id);
    persist();
    spin();
  },
  'open-settings': openSettings,
  'close-sheet'(el) {
    el.closest('dialog')?.close();
  },
  'apply-sheet'() {
    state.settings = sanitizeSettings(state.sheetSettings);
    saveSettings(state.settings);
    closeDialogs();
    state.currentId = null;
    renderPlay();
  },
  'apply-suggestion'(el) {
    const sg = state.suggestions[Number(el.dataset.index)];
    if (!sg) return;
    const inSheet = el.closest('#settings-sheet');
    if (inSheet) {
      state.sheetSettings = sanitizeSettings({ ...state.sheetSettings, ...sg.patch });
      const form = $('#sheet-form');
      form.outerHTML = renderSetupForm(state.sheetSettings, 'sheet');
      updateMatch(state.sheetSettings, $('#sheet-match'), $('[data-action="apply-sheet"]'));
      return;
    }
    state.settings = sanitizeSettings({ ...state.settings, ...sg.patch });
    saveSettings(state.settings);
    if ($('#stage')) {
      renderPlay();
    } else {
      renderSetup();
      toast('조건을 바꿨어요!');
    }
  },
  'toggle-sound'(el) {
    state.sound = !state.sound;
    setSound(state.sound);
    saveSound(state.sound);
    el.textContent = state.sound ? '🔊' : '🔇';
    el.setAttribute('aria-pressed', String(state.sound));
    el.setAttribute('aria-label', `효과음 ${state.sound ? '끄기' : '켜기'}`);
    toast(state.sound ? '효과음을 켰어요' : '효과음을 껐어요');
  },
  share: openShare,
  async 'native-share'() {
    try {
      await shareImage(state.shareBlob, current());
    } catch (err) {
      if (err?.name !== 'AbortError') toast('공유를 완료하지 못했어요.');
    }
  },
};

document.addEventListener('click', (ev) => {
  const el = ev.target.closest('[data-action]');
  if (el && !el.disabled && actions[el.dataset.action]) {
    ev.preventDefault();
    actions[el.dataset.action](el);
    return;
  }
  if (state.slot && ev.target.closest('.slot')) state.slot.skip();
});

document.addEventListener('change', (ev) => {
  const form = ev.target.closest('.setup-form');
  if (!form) return;
  syncTopicChecks(form, ev.target);
  const s = sanitizeSettings(readSetupForm(form));
  if (form.id === 'sheet-form') {
    state.sheetSettings = s;
    updateMatch(s, $('#sheet-match'), $('[data-action="apply-sheet"]'));
  } else {
    state.settings = s;
    saveSettings(s);
    updateMatch(s, $('#match-info'), $('[data-action="start"]'));
  }
});

document.addEventListener('keydown', (ev) => {
  if (state.slot && (ev.key === 'Enter' || ev.key === ' ' || ev.key === 'Escape')) {
    ev.preventDefault();
    state.slot.skip();
  }
});

document.addEventListener('pointerdown', () => setSound(state.sound), { once: true });

/* ---------------- boot ---------------- */

async function boot() {
  try {
    state.items = await repo.listItems();
  } catch (err) {
    console.error(err);
    app.innerHTML = `<div class="screen error"><div class="card card--end">
      <div class="end__art" aria-hidden="true">📡</div>
      <h1 class="card__question">카드를 불러오지 못했어요</h1>
      <p class="card__note center">네트워크 상태를 확인한 뒤 다시 시도해 주세요.</p>
      <button type="button" class="btn btn--primary" onclick="location.reload()">다시 시도</button>
    </div></div>`;
    return;
  }
  const p = loadProgress();
  const known = new Set(state.items.map((i) => i.id));
  state.seen = new Set([...p.seen].filter((id) => known.has(id)));
  state.currentId = known.has(p.currentId) ? p.currentId : null;
  state.view = { votes: {}, viewed: new Set() };
  if (!state.currentId && !state.seen.size) clearProgress();
  window.addEventListener('hashchange', route);
  route();
  document.documentElement.classList.add('is-ready');
}

boot();

// Expose a tiny hook for automated checks (read-only snapshot).
window.__dugeun = { get state() { return { settings: state.settings, seen: [...state.seen], currentId: state.currentId, busy: state.busy }; } };
