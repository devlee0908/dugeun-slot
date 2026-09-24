// Slot-machine reveal. Spins a reel of card snippets and lands on the target card.
import { escapeHtml as e } from './dom.js';
import { reelLabel } from './cards.js';
import { shuffle } from '../content/query.js';

const DURATION = 1900;
const FILLERS = 16;

const itemHtml = (item, target = false) => {
  const { emoji, text } = reelLabel(item);
  return `<div class="slot__item ${target ? 'is-target' : ''}"><span class="slot__emoji" aria-hidden="true">${e(emoji)}</span><span class="slot__text">${e(text)}</span></div>`;
};

/**
 * @returns {{ skip: () => void }}
 */
export function runSlot(container, { target, pool, reduced = false, onTick = () => {}, onDone }) {
  let finished = false;
  let raf = 0;
  const done = () => {
    if (finished) return;
    finished = true;
    cancelAnimationFrame(raf);
    onDone();
  };

  if (reduced) {
    container.innerHTML = '';
    queueMicrotask(done);
    return { skip: done };
  }

  const others = pool.filter((i) => i.id !== target.id);
  const source = others.length ? others : [target];
  const fillers = Array.from({ length: FILLERS }, (_, i) => shuffle(source)[i % source.length]);

  container.innerHTML = `<div class="slot" role="status" aria-live="polite" aria-label="카드를 고르는 중">
    <div class="slot__marquee" aria-hidden="true">${'<i></i>'.repeat(9)}</div>
    <div class="slot__brand" aria-hidden="true">♥ 두근슬롯 ♥</div>
    <div class="slot__window">
      <div class="slot__reel">${fillers.map((f) => itemHtml(f)).join('')}${itemHtml(target, true)}</div>
      <div class="slot__glass" aria-hidden="true"></div>
      <div class="slot__pointer slot__pointer--l" aria-hidden="true"></div>
      <div class="slot__pointer slot__pointer--r" aria-hidden="true"></div>
    </div>
    <p class="slot__caption">두근두근… 어떤 카드가 나올까?</p>
    <button type="button" class="slot__skip" data-action="skip-slot">바로 보기 ⏭</button>
  </div>`;

  const slot = container.querySelector('.slot');
  const reel = container.querySelector('.slot__reel');
  const h = reel.firstElementChild.getBoundingClientRect().height || 84;
  const dist = FILLERS * h;

  const anim = reel.animate(
    [{ transform: 'translateY(0)', filter: 'blur(0)' }, { transform: `translateY(${-dist * 0.35}px)`, filter: 'blur(1.5px)', offset: 0.3 }, { transform: `translateY(${-dist}px)`, filter: 'blur(0)' }],
    { duration: DURATION, easing: 'cubic-bezier(.2,.75,.25,1.03)', fill: 'forwards' },
  );

  let lastIdx = 0;
  raf = requestAnimationFrame(function loop() {
    const m = new DOMMatrixReadOnly(getComputedStyle(reel).transform);
    const idx = Math.floor(-m.m42 / h);
    if (idx !== lastIdx) {
      lastIdx = idx;
      onTick();
    }
    raf = requestAnimationFrame(loop);
  });

  let holdTimer;
  anim.onfinish = () => {
    cancelAnimationFrame(raf);
    slot.classList.add('is-landed');
    holdTimer = setTimeout(done, 420);
  };

  return {
    skip() {
      if (finished) return;
      clearTimeout(holdTimer);
      anim.onfinish = null;
      anim.finish();
      done();
    },
  };
}
