// Optional synthesized sounds (no audio files). Muted by default.
let ctx = null;
let enabled = false;

export const isSoundOn = () => enabled;

export function setSound(on) {
  enabled = !!on;
  if (enabled && !ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    ctx = AC ? new AC() : null;
  }
  if (ctx?.state === 'suspended') ctx.resume();
}

function beep(freq, duration, { type = 'square', gain = 0.04, when = 0 } = {}) {
  if (!enabled || !ctx) return;
  const t = ctx.currentTime + when;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + duration);
  osc.connect(g).connect(ctx.destination);
  osc.start(t);
  osc.stop(t + duration + 0.02);
}

export const tick = () => beep(1400, 0.03, { gain: 0.025 });

export function ding() {
  beep(880, 0.12, { type: 'triangle', gain: 0.08 });
  beep(1320, 0.22, { type: 'triangle', gain: 0.07, when: 0.1 });
}

export const pop = () => beep(620, 0.06, { type: 'sine', gain: 0.07 });
