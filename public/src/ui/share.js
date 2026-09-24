// Renders a question/result card to a 1080×1350 PNG (Instagram portrait) entirely on-device.
import { TOPIC_BY_ID, TYPE_BY_ID } from '../content/meta.js';
import { logoMark, visualSvg } from './illustrations.js';
import { objectParticle } from './dom.js';

const W = 1080;
const H = 1350;
const C = { paper: '#FFFCF6', bg: '#FFE4EB', grid: 'rgba(122,26,38,0.08)', border: '#F5716B', maroon: '#7A1A26', ink: '#3A1A1F', pink: '#FF9DB0', red: '#F2473F', blue: '#3E8EDE', yellow: '#FFD43B', soft: '#FFF1D6' };
const SANS = '"Pretendard Variable", Pretendard, "Apple SD Gothic Neo", "Noto Sans KR", sans-serif';
const DISPLAY = 'Jua, "Pretendard Variable", sans-serif';
const EMOJI = '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';

const loadImage = (svg) => new Promise((resolve, reject) => {
  const img = new Image();
  img.onload = () => resolve(img);
  img.onerror = reject;
  img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
});

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function wrap(ctx, text, maxWidth) {
  const lines = [];
  let line = '';
  for (const word of String(text).split(/\s+/)) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width <= maxWidth) { line = test; continue; }
    if (line) lines.push(line);
    line = '';
    for (const ch of word) {
      if (ctx.measureText(line + ch).width > maxWidth && line) { lines.push(line); line = ''; }
      line += ch;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function paragraph(ctx, text, { x, y, width, size, lh = 1.45, color = C.ink, weight = 700, font = SANS, align = 'center', maxLines = 8 }) {
  ctx.font = `${weight} ${size}px ${font}`;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = 'top';
  const lines = wrap(ctx, text, width).slice(0, maxLines);
  const ax = align === 'center' ? x + width / 2 : x;
  lines.forEach((l, i) => ctx.fillText(l, ax, y + i * size * lh));
  return y + lines.length * size * lh;
}

function sticker(ctx, text, cx, y, size) {
  ctx.font = `${size}px ${DISPLAY}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  while (ctx.measureText(text).width > W - 220 && size > 40) ctx.font = `${(size -= 4)}px ${DISPLAY}`;
  ctx.lineJoin = 'round';
  ctx.strokeStyle = C.maroon;
  ctx.lineWidth = size * 0.2;
  ctx.strokeText(text, cx, y + size * 0.08);
  ctx.fillStyle = C.maroon;
  ctx.fillText(text, cx, y + size * 0.08);
  ctx.strokeText(text, cx, y);
  ctx.fillStyle = '#fff';
  ctx.fillText(text, cx, y);
  return y + size * 1.25;
}

async function drawVisual(ctx, visual, cx, cy, size) {
  if (!visual) return;
  if (visual.kind === 'emoji') {
    ctx.font = `${size * 0.8}px ${EMOJI}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(visual.value, cx, cy + size * 0.04);
    return;
  }
  const img = await loadImage(visualSvg(visual));
  ctx.drawImage(img, cx - size / 2, cy - size / 2, size, size);
}

function pill(ctx, text, x, y, bg, fg = '#fff') {
  ctx.font = `700 30px ${SANS}`;
  const w = ctx.measureText(text).width + 44;
  roundRect(ctx, x, y, w, 54, 27);
  ctx.fillStyle = bg;
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = C.maroon;
  ctx.stroke();
  ctx.fillStyle = fg;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x + 22, y + 28);
  return w;
}

export async function renderShareImage(item, view = {}) {
  await Promise.all([`64px ${DISPLAY}`, `700 40px ${SANS}`].map((f) => document.fonts?.load(f).catch(() => {})));
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = C.bg;
  ctx.fillRect(0, 0, W, H);
  const X = 44, Y = 44, CW = W - 88, CH = H - 88;
  roundRect(ctx, X, Y + 10, CW, CH, 48);
  ctx.fillStyle = '#F2A9A6';
  ctx.fill();
  roundRect(ctx, X, Y, CW, CH, 48);
  ctx.fillStyle = C.paper;
  ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.strokeStyle = C.grid;
  ctx.lineWidth = 2;
  for (let gx = X; gx < X + CW; gx += 36) { ctx.beginPath(); ctx.moveTo(gx, Y); ctx.lineTo(gx, Y + CH); ctx.stroke(); }
  for (let gy = Y; gy < Y + CH; gy += 36) { ctx.beginPath(); ctx.moveTo(X, gy); ctx.lineTo(X + CW, gy); ctx.stroke(); }
  ctx.restore();
  roundRect(ctx, X, Y, CW, CH, 48);
  ctx.lineWidth = 8;
  ctx.strokeStyle = C.border;
  ctx.stroke();

  const logo = await loadImage(logoMark(120));
  ctx.drawImage(logo, 86, 82, 76, 76);
  ctx.font = `44px ${DISPLAY}`;
  ctx.fillStyle = C.maroon;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('두근슬롯', 176, 122);
  const type = TYPE_BY_ID[item.type];
  ctx.font = `700 30px ${SANS}`;
  const typeText = `${type.label}`;
  const tw = ctx.measureText(typeText).width + 44;
  pill(ctx, typeText, W - 86 - tw, 94, item.type === 'balance' ? C.blue : item.type === 'talk' ? C.red : '#9B5DE5');

  const title = item.type === 'psych' ? item.title : item.type === 'balance' ? '둘 중 하나만!' : '오늘의 연애 질문';
  let y = sticker(ctx, title, W / 2, 200, 88);
  ctx.font = `700 28px ${SANS}`;
  ctx.fillStyle = C.border;
  ctx.textAlign = 'center';
  ctx.fillText(`#${TOPIC_BY_ID[item.topic].label}`, W / 2, y + 4);
  y += 58;
  y = paragraph(ctx, item.question, { x: 110, y, width: W - 220, size: item.type === 'psych' ? 44 : 54, color: C.ink }) + 34;

  if (item.type === 'balance') {
    const bw = 400, bh = 470, gap = 60, top = y + Math.max(10, (H - 170 - y - bh) / 2);
    for (const [i, o] of item.options.entries()) {
      const bx = W / 2 - gap / 2 - bw + i * (bw + gap);
      roundRect(ctx, bx, top + 8, bw, bh, 36);
      ctx.fillStyle = C.maroon;
      ctx.fill();
      roundRect(ctx, bx, top, bw, bh, 36);
      ctx.fillStyle = i ? '#E3F0FF' : '#FFE3E1';
      ctx.fill();
      ctx.lineWidth = 5;
      ctx.strokeStyle = C.maroon;
      ctx.stroke();
      await drawVisual(ctx, o.visual, bx + bw / 2, top + 120, 150);
      paragraph(ctx, o.label, { x: bx + 30, y: top + 230, width: bw - 60, size: 40, color: i ? '#1F4E8C' : '#A3211B', maxLines: 5 });
    }
    ctx.beginPath();
    ctx.arc(W / 2, top + bh / 2, 58, 0, Math.PI * 2);
    ctx.fillStyle = C.yellow;
    ctx.fill();
    ctx.lineWidth = 6;
    ctx.strokeStyle = C.maroon;
    ctx.stroke();
    ctx.font = `52px ${DISPLAY}`;
    ctx.fillStyle = C.maroon;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('VS', W / 2, top + bh / 2 + 4);
  } else if (item.type === 'talk') {
    y += Math.max(0, (H - 170 - y - 600) / 2);
    ctx.beginPath();
    ctx.arc(W / 2, y + 160, 150, 0, Math.PI * 2);
    ctx.fillStyle = C.soft;
    ctx.fill();
    ctx.lineWidth = 6;
    ctx.strokeStyle = C.maroon;
    ctx.stroke();
    await drawVisual(ctx, { kind: 'emoji', value: item.emoji || '💬' }, W / 2, y + 160, 200);
    y += 370;
    roundRect(ctx, 130, y, W - 260, 200, 32);
    ctx.fillStyle = '#fff';
    ctx.fill();
    ctx.lineWidth = 5;
    ctx.stroke();
    paragraph(ctx, '🔁 꼬리 질문', { x: 150, y: y + 30, width: W - 300, size: 32, font: DISPLAY, weight: 400, color: C.border });
    paragraph(ctx, item.followUp, { x: 150, y: y + 82, width: W - 300, size: 36, color: C.ink, maxLines: 2 });
  } else {
    const picked = item.options.find((o) => o.id === view.picked);
    if (picked) {
      await drawVisual(ctx, picked.visual, W / 2, y + 100, 190);
      y += 210;
      ctx.font = `700 32px ${SANS}`;
      ctx.fillStyle = C.border;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(`「${picked.label}」${objectParticle(picked.label)} 고른 당신은`, W / 2, y);
      y += 60;
      const boxTop = y;
      roundRect(ctx, 110, boxTop, W - 220, H - 150 - boxTop, 36);
      ctx.fillStyle = '#FFF';
      ctx.fill();
      ctx.lineWidth = 5;
      ctx.strokeStyle = C.maroon;
      ctx.stroke();
      y = paragraph(ctx, picked.result.title, { x: 150, y: boxTop + 34, width: W - 300, size: 52, font: DISPLAY, weight: 400, color: C.red, maxLines: 2 }) + 18;
      y = paragraph(ctx, picked.result.body, { x: 150, y, width: W - 300, size: 33, weight: 500, lh: 1.55, maxLines: 7 }) + 18;
      paragraph(ctx, `💬 ${picked.result.talk}`, { x: 150, y, width: W - 300, size: 32, color: C.maroon, maxLines: 2 });
    } else {
      const n = item.options.length;
      const cols = n === 3 ? 3 : 2;
      const rows = Math.ceil(n / cols);
      const cw = (W - 220) / cols;
      const ch = Math.min(300, (H - 170 - y) / rows);
      for (const [i, o] of item.options.entries()) {
        const cx = 110 + (i % cols) * cw + cw / 2;
        const cy = y + Math.floor(i / cols) * ch;
        await drawVisual(ctx, o.visual, cx, cy + ch * 0.38, Math.min(180, ch * 0.6));
        paragraph(ctx, `${i + 1}. ${o.label}`, { x: cx - cw / 2 + 10, y: cy + ch * 0.74, width: cw - 20, size: 36, font: DISPLAY, weight: 400, color: C.maroon, maxLines: 2 });
      }
    }
  }

  ctx.font = `600 28px ${SANS}`;
  ctx.fillStyle = 'rgba(122,26,38,0.7)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`함께 돌리는 연애 수다 카드 · 두근슬롯${location.host ? ` · ${location.host}` : ''}`, W / 2, H - 104);

  return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
}

export async function shareImage(blob, item) {
  const file = new File([blob], `dugeun-slot-${item.id}.png`, { type: 'image/png' });
  if (navigator.canShare?.({ files: [file] })) {
    await navigator.share({ files: [file], title: '두근슬롯', text: '같이 해볼래? 두근슬롯 연애 카드 💌' });
    return 'shared';
  }
  return 'unsupported';
}
