// Pure HTML renderers (string templates). Event handling lives in main.js via data-action delegation.
import { GROUPS, LISTS, TOPICS, TYPES, TOPIC_BY_ID, TYPE_BY_ID } from '../content/meta.js';
import { escapeHtml as e, objectParticle } from './dom.js';
import { visualMarkup } from './illustrations.js';

const NUM = ['①', '②', '③', '④'];

export function stickerTitle(text, { tag = 'h2', cls = '' } = {}) {
  const words = String(text).split(' ');
  const last = words.length > 1 && /테스트$/.test(words.at(-1)) ? words.pop() : null;
  const inner = last ? `<span class="hl">${e(words.join(' '))}</span> ${e(last)}` : e(text);
  return `<${tag} class="sticker-title ${cls}">${inner}</${tag}>`;
}

function cardHead(item) {
  const type = TYPE_BY_ID[item.type];
  const topic = TOPIC_BY_ID[item.topic];
  const badges = item.tags.map((t) => `<span class="badge badge--${t}">${t.toUpperCase()}</span>`).join('');
  return `<header class="card__head">
    <span class="card__type card__type--${item.type}"><span aria-hidden="true">${type.emoji}</span> ${e(type.label)}</span>
    <span class="card__topic">#${e(topic.label)}</span>
    <span class="card__badges">${badges}</span>
  </header>`;
}

export function renderCard(item, view) {
  const body = item.type === 'balance' ? balanceBody(item, view) : item.type === 'talk' ? talkBody(item, view) : psychBody(item, view);
  return `<article class="card card--${item.type}" data-card-id="${e(item.id)}" aria-labelledby="q-${e(item.id)}">
    ${cardHead(item)}
    ${body}
  </article>`;
}

function balanceBody(item, view) {
  const votes = view.votes || {};
  const total = Object.values(votes).reduce((a, b) => a + b, 0);
  const opt = (o, i) => `<button type="button" class="vs__opt vs__opt--${i ? 'b' : 'a'} ${votes[o.id] ? 'is-voted' : ''}" data-action="vote" data-opt="${e(o.id)}"
      aria-label="${e(o.label)} 선택, 현재 ${votes[o.id] || 0}명">
      <span class="vs__letter" aria-hidden="true">${i ? 'B' : 'A'}</span>
      <span class="vs__visual">${visualMarkup(o.visual)}</span>
      <span class="vs__label">${e(o.label)}</span>
      <span class="vs__count" aria-hidden="true">${votes[o.id] ? `${votes[o.id]}명 ✋` : '탭해서 선택'}</span>
    </button>`;
  return `<p class="card__eyebrow">둘 중 하나만 골라야 한다면?</p>
    <h2 class="card__question" id="q-${e(item.id)}">${e(item.question)}</h2>
    <div class="vs">${opt(item.options[0], 0)}<span class="vs__badge" aria-hidden="true">VS</span>${opt(item.options[1], 1)}</div>
    <div class="followup ${total ? 'is-open' : ''} ${view.followNew ? 'is-new' : ''}" aria-live="polite">
      ${total
        ? `<p class="followup__label">💬 골랐다면 이유를 한마디씩!</p><p class="followup__text">${e(item.followUp)}</p>
           <button type="button" class="link-btn" data-action="reset-votes">투표 초기화</button>`
        : `<p class="followup__hint">돌아가며 한 명씩 탭해요. 모두 고르면 이야기 질문이 나와요.</p>`}
    </div>`;
}

function talkBody(item, view) {
  const deep = item.level === 'deep';
  return `<div class="talk">
      <div class="talk__visual" aria-hidden="true"><span class="emoji">${e(item.emoji || '💬')}</span></div>
      <span class="level level--${item.level}">${deep ? '🌙 조금 깊게' : '😆 가볍게'}</span>
    </div>
    <h2 class="card__question card__question--talk" id="q-${e(item.id)}">${e(item.question)}</h2>
    <div class="followup ${view.showFollow ? 'is-open' : ''} ${view.followNew ? 'is-new' : ''}" aria-live="polite">
      ${view.showFollow
        ? `<p class="followup__label">🔁 꼬리 질문</p><p class="followup__text">${e(item.followUp)}</p>`
        : `<button type="button" class="ghost-btn" data-action="show-follow">꼬리 질문 보기 ↓</button>`}
    </div>
    <p class="card__note">답하고 싶은 사람부터 편하게 이야기해요. 부담되면 「건너뛰기」도 괜찮아요.</p>`;
}

function psychBody(item, view) {
  const picked = item.options.find((o) => o.id === view.picked);
  const viewed = view.viewed || new Set();
  const n = item.options.length;
  const choices = item.options.map((o, i) => `<button type="button" class="choice ${o.id === view.picked ? 'is-picked' : ''} ${viewed.has(o.id) && o.id !== view.picked ? 'is-viewed' : ''}"
      data-action="pick" data-opt="${e(o.id)}" aria-pressed="${o.id === view.picked}">
      <span class="choice__visual">${visualMarkup(o.visual)}</span>
      <span class="choice__label"><b>${i + 1}.</b> ${e(o.label)}</span>
      ${viewed.has(o.id) && o.id !== view.picked ? '<span class="choice__seen">봤어요 ✓</span>' : ''}
    </button>`).join('');
  return `${stickerTitle(item.title, { cls: 'card__sticker' })}
    <h2 class="card__question card__question--psych" id="q-${e(item.id)}">${e(item.question)}</h2>
    <div class="choices choices--${n}" role="group" aria-label="선택지">${choices}</div>
    <div class="result-slot" aria-live="polite">${picked ? resultPanel(item, picked) : `<p class="card__note center">마음이 가는 걸 하나 골라 보세요. 고르는 즉시 결과가 열려요!</p>`}</div>`;
}

function resultPanel(item, o) {
  const idx = item.options.indexOf(o);
  return `<section class="result" id="result-${e(item.id)}" tabindex="-1">
    <div class="result__pick"><span class="result__mini">${visualMarkup(o.visual)}</span> ${NUM[idx] || idx + 1} 「${e(o.label)}」${objectParticle(o.label)} 고른 당신은</div>
    <h3 class="result__title">${e(o.result.title)}</h3>
    <p class="result__body">${e(o.result.body)}</p>
    <div class="result__talk"><p class="followup__label">💬 이어서 이야기해요</p><p class="followup__text">${e(o.result.talk)}</p></div>
    <div class="result__actions">
      <button type="button" class="btn btn--ghost" data-action="other-result">다른 결과 보기</button>
      <button type="button" class="btn btn--primary" data-action="next">다음 테스트 →</button>
    </div>
    <p class="disclaimer">재미로 보는 해석이에요. 성격을 진단하는 결과가 아니라 서로의 생각을 여는 이야깃거리로 즐겨 주세요.</p>
  </section>`;
}

/* ---------- setup form ---------- */

function chip(name, value, label, emoji, checked, type = 'radio', hint = '') {
  return `<label class="chip ${type === 'checkbox' ? 'chip--multi' : ''}">
    <input type="${type}" name="${name}" value="${e(value)}" ${checked ? 'checked' : ''}>
    <span class="chip__face">${emoji ? `<span class="chip__emoji" aria-hidden="true">${emoji}</span>` : ''}<span class="chip__text">${e(label)}${hint ? `<small>${e(hint)}</small>` : ''}</span></span>
  </label>`;
}

export function renderSetupForm(s, idPrefix = 'setup') {
  const allTopics = s.topics.length === 0;
  return `<form class="setup-form" id="${idPrefix}-form" novalidate>
    <fieldset class="field">
      <legend><span class="step">1</span>함께하는 사람</legend>
      <div class="chips chips--group">${GROUPS.map((g) => chip('group', g.id, g.label, g.emoji, s.group === g.id, 'radio', g.hint)).join('')}</div>
    </fieldset>
    <fieldset class="field">
      <legend><span class="step">2</span>진행 유형</legend>
      <div class="chips chips--type">${TYPES.map((t) => chip('type', t.id, t.label, t.emoji, s.type === t.id, 'radio', t.hint)).join('')}</div>
    </fieldset>
    <fieldset class="field">
      <legend><span class="step">3</span>연애 주제 <small>여러 개 골라도 돼요</small></legend>
      <div class="chips chips--topic">
        ${chip('topicAll', 'all', '전체 주제', '🌈', allTopics, 'checkbox')}
        ${TOPICS.map((t) => chip('topic', t.id, t.label, t.emoji, s.topics.includes(t.id), 'checkbox')).join('')}
      </div>
    </fieldset>
    <fieldset class="field">
      <legend><span class="step">4</span>질문 목록</legend>
      <div class="chips chips--list">${LISTS.map((l) => chip('list', l.id, l.label, '', s.list === l.id, 'radio', l.hint)).join('')}</div>
    </fieldset>
  </form>`;
}

export function readSetupForm(form) {
  const fd = new FormData(form);
  return { group: fd.get('group'), type: fd.get('type'), topics: fd.getAll('topic'), list: fd.get('list') };
}

export function renderMatchInfo(status, suggestions, type) {
  if (status.total === 0) {
    return `<div class="match match--empty">
      <p class="match__title">앗, 이 조건에 맞는 ${e(TYPE_BY_ID[type].label)} 카드가 아직 없어요 🥲</p>
      <p class="match__sub">이렇게 바꿔 보면 바로 시작할 수 있어요.</p>
      <div class="suggest">${suggestions.map((sg, i) => `<button type="button" class="suggest__btn" data-action="apply-suggestion" data-index="${i}">${e(sg.label)} <b>${sg.count}장</b></button>`).join('')}</div>
    </div>`;
  }
  const rest = status.seen ? ` <span class="match__seen">(이미 본 ${status.seen}장 제외 ${status.remaining}장 남음)</span>` : '';
  return `<p class="match">조건에 맞는 카드 <b>${status.total}장</b>${rest}</p>`;
}

export function renderEndCard(status, type) {
  return `<article class="card card--end">
    <div class="end__art" aria-hidden="true">🎉</div>
    ${stickerTitle('모든 카드 완주!', { tag: 'h2' })}
    <p class="card__question">이 조건의 ${e(TYPE_BY_ID[type].label)} 카드 ${status.total}장을 모두 봤어요.</p>
    <p class="card__note center">같은 카드로 다시 즐기거나, 조건을 바꿔 새로운 카드를 뽑아 보세요.</p>
    <div class="end__actions">
      <button type="button" class="btn btn--primary" data-action="reshuffle">🔀 다시 섞기</button>
      <button type="button" class="btn btn--ghost" data-action="open-settings">⚙️ 조건 바꾸기</button>
    </div>
  </article>`;
}

export function renderEmptyCard(suggestions, type) {
  return `<article class="card card--end">
    <div class="end__art" aria-hidden="true">🔍</div>
    ${stickerTitle('카드가 비어 있어요', { tag: 'h2' })}
    ${renderMatchInfo({ total: 0 }, suggestions, type)}
    <div class="end__actions"><button type="button" class="btn btn--ghost" data-action="open-settings">⚙️ 조건 직접 바꾸기</button></div>
  </article>`;
}

/** Short text shown on the slot reel. */
export function reelLabel(item) {
  if (item.type === 'psych') return { emoji: item.options[0].visual.kind === 'emoji' ? item.options[0].visual.value : '🔮', text: item.title };
  if (item.type === 'balance') return { emoji: item.options[0].visual.value || '⚖️', text: `${item.options[0].label} vs ${item.options[1].label}` };
  return { emoji: item.emoji || '💬', text: item.question };
}
