// Tiny hand-drawn-ish SVG illustrations. Every function returns a standalone SVG string
// (with xmlns) so it can be inlined in the DOM and also drawn onto the share canvas.
import { escapeHtml } from './dom.js';

const INK = '#5B1621';

function shade(hex, amt) {
  const n = parseInt(hex.replace('#', ''), 16);
  const c = (s) => Math.max(0, Math.min(255, ((n >> s) & 255) + amt));
  return `#${((c(16) << 16) | (c(8) << 8) | c(0)).toString(16).padStart(6, '0')}`;
}

const svg = (body, vb = '0 0 120 120') =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" width="120" height="120" aria-hidden="true" focusable="false">${body}</svg>`;

const string = (x, y, color = '#6D7A86') =>
  `<path d="M${x} ${y} q-7 8 0 15 t0 15 t0 14" fill="none" stroke="${color}" stroke-width="3" stroke-linecap="round"/>`;

const balloon = (color) => svg(`
  <ellipse cx="60" cy="46" rx="30" ry="35" fill="${color}"/>
  <path d="M42 30 q6 -12 18 -13" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity=".65"/>
  <path d="M54 80 l6 -3 l6 3 l-2 5 h-8 z" fill="${shade(color, -30)}"/>
  ${string(60, 85, shade(color, -60))}`);

const heartBalloon = (color) => svg(`
  <path d="M60 84 C28 62 18 46 22 32 C26 16 48 12 60 30 C72 12 94 16 98 32 C102 46 92 62 60 84 Z" fill="${color}"/>
  <path d="M34 30 q4 -9 14 -9" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity=".6"/>
  <path d="M55 86 l5 -3 l5 3 l-2 4 h-6 z" fill="${shade(color, -35)}"/>
  <path d="M60 90 v28" stroke="#E4E8EC" stroke-width="3"/>`);

const balloonDog = (color) => svg(`
  <g fill="${color}" stroke="${INK}" stroke-width="3.2" stroke-linejoin="round">
    <ellipse cx="80" cy="30" rx="10" ry="17" transform="rotate(-25 80 30)"/>
    <ellipse cx="60" cy="68" rx="22" ry="11"/>
    <ellipse cx="36" cy="92" rx="8" ry="15" transform="rotate(20 36 92)"/>
    <ellipse cx="84" cy="92" rx="8" ry="15" transform="rotate(-20 84 92)"/>
    <ellipse cx="30" cy="62" rx="8" ry="12" transform="rotate(-10 30 62)"/>
    <circle cx="86" cy="54" r="11"/>
    <ellipse cx="104" cy="52" rx="10" ry="6"/>
  </g>
  <path d="M22 50 l-6 -6 M113 52 h5" stroke="${INK}" stroke-width="3.2" stroke-linecap="round"/>
  <circle cx="88" cy="51" r="2.3" fill="${INK}"/>`);

const door = (color) => {
  const dark = shade(color, -45);
  const vine = color.toLowerCase() === '#3cb371'
    ? `<g fill="#2E8B57" stroke="${INK}" stroke-width="1.5">${[[30, 22], [40, 12], [58, 8], [76, 12], [88, 24], [92, 44], [28, 46]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="6" ry="4" transform="rotate(${x - 60} ${x} ${y})"/>`).join('')}</g>`
    : '';
  return svg(`
    <path d="M22 116 V48 a38 38 0 0 1 76 0 V116 Z" fill="#FFF6E6" stroke="${INK}" stroke-width="3.5"/>
    <path d="M30 116 V50 a30 30 0 0 1 60 0 V116 Z" fill="${color}" stroke="${INK}" stroke-width="3"/>
    <rect x="42" y="36" width="36" height="22" rx="6" fill="#fff" opacity=".55" stroke="${dark}" stroke-width="2"/>
    <rect x="42" y="68" width="36" height="36" rx="5" fill="none" stroke="${dark}" stroke-width="2.5"/>
    <circle cx="80" cy="86" r="4.5" fill="#FFD43B" stroke="${INK}" stroke-width="2"/>
    ${vine}`);
};

const umbrella = (color) => {
  const dark = shade(color, -60);
  return svg(`
    <path d="M60 14 v4" stroke="${INK}" stroke-width="4" stroke-linecap="round"/>
    <path d="M12 62 C14 34 36 18 60 18 C84 18 106 34 108 62 q-12 -9 -24 0 q-12 -9 -24 0 q-12 -9 -24 0 q-12 -9 -24 0 Z" fill="${color}" stroke="${dark}" stroke-width="3" stroke-linejoin="round"/>
    <path d="M60 18 C50 30 46 46 48 60 M60 18 C70 30 74 46 72 60" fill="none" stroke="${dark}" stroke-width="2" opacity=".6"/>
    <path d="M60 60 V100 a9 9 0 0 1 -18 0" fill="none" stroke="${INK}" stroke-width="4.5" stroke-linecap="round"/>`);
};

const gift = (color, ribbon) => {
  const hasRibbon = ribbon && ribbon !== 'none';
  const tie = hasRibbon
    ? `<rect x="54" y="42" width="12" height="70" fill="${ribbon}" stroke="${INK}" stroke-width="2"/>
       <path d="M60 42 C44 20 26 30 38 42 Z M60 42 C76 20 94 30 82 42 Z" fill="${ribbon}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
       <circle cx="60" cy="42" r="6" fill="${ribbon}" stroke="${INK}" stroke-width="3"/>`
    : `<path d="M30 78 h60 M46 62 l-6 16 M80 88 l-6 18" stroke="${shade(color, -40)}" stroke-width="2.5" stroke-linecap="round"/>
       <path d="M50 44 q10 -10 20 0" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>`;
  return svg(`
    <rect x="22" y="58" width="76" height="54" rx="6" fill="${color}" stroke="${INK}" stroke-width="3.5"/>
    <rect x="16" y="44" width="88" height="18" rx="5" fill="${shade(color, -12)}" stroke="${INK}" stroke-width="3.5"/>
    ${tie}`);
};

const RENDERERS = { balloon, heartBalloon, balloonDog, door, umbrella, gift };

/** Returns inline markup (SVG or emoji span) for a content `visual` object. */
export function visualMarkup(visual) {
  if (!visual) return '';
  if (visual.kind === 'emoji') return `<span class="emoji" aria-hidden="true">${escapeHtml(visual.value)}</span>`;
  return visualSvg(visual);
}

export function visualSvg(visual) {
  const fn = RENDERERS[visual?.kind];
  return fn ? fn(visual.color, visual.ribbon) : '';
}

export function logoMark(size = 64) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="${size}" height="${size}" aria-hidden="true">
    <rect x="6" y="6" width="108" height="108" rx="30" fill="#FFE1E8" stroke="${INK}" stroke-width="5"/>
    <path d="M60 92 C30 72 20 56 24 40 C28 24 50 20 60 38 C70 20 92 24 96 40 C100 56 90 72 60 92 Z" fill="#F2473F" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>
    <rect x="30" y="44" width="60" height="22" rx="8" fill="#FFFCF6" stroke="${INK}" stroke-width="4"/>
    <circle cx="44" cy="55" r="5" fill="#FFD43B"/>
    <path d="M60 60 c-6 -4 -7 -7 -5 -9 c2 -2 4 -1 5 1 c1 -2 3 -3 5 -1 c2 2 1 5 -5 9z" fill="#FF6F91"/>
    <circle cx="76" cy="55" r="5" fill="#3E8EDE"/>
    <path d="M38 34 q4 -7 11 -7" stroke="#fff" stroke-width="5" fill="none" stroke-linecap="round" opacity=".7"/>
    <path d="M60 94 q-6 7 0 12" stroke="${INK}" stroke-width="4" fill="none" stroke-linecap="round"/>
    <path d="M98 16 l3 7 l7 3 l-7 3 l-3 7 l-3 -7 l-7 -3 l7 -3z" fill="#FFD43B" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/>
  </svg>`;
}
