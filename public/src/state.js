// Browser persistence. Only non-personal UI state is stored, and only on this device:
//  - settings + sound preference → localStorage (remembered next visit)
//  - seen card ids + current card → sessionStorage (cleared when the tab closes)
// Psych-test answers/results are never stored or sent anywhere.
import { sanitizeSettings } from './content/meta.js';

const KEYS = { settings: 'dugeun:settings', sound: 'dugeun:sound', progress: 'dugeun:progress' };

function read(store, key) {
  try {
    return JSON.parse(store.getItem(key));
  } catch {
    return null;
  }
}

function write(store, key, value) {
  try {
    store.setItem(key, JSON.stringify(value));
  } catch {
    /* storage may be unavailable (private mode) — the app still works in memory */
  }
}

export const loadSettings = () => sanitizeSettings(read(localStorage, KEYS.settings));
export const saveSettings = (s) => write(localStorage, KEYS.settings, s);

export const loadSound = () => read(localStorage, KEYS.sound) === true;
export const saveSound = (on) => write(localStorage, KEYS.sound, !!on);

export function loadProgress() {
  const p = read(sessionStorage, KEYS.progress);
  return { seen: new Set(Array.isArray(p?.seen) ? p.seen : []), currentId: typeof p?.currentId === 'string' ? p.currentId : null };
}

export const saveProgress = ({ seen, currentId }) => write(sessionStorage, KEYS.progress, { seen: [...seen], currentId });

export function clearProgress() {
  try {
    sessionStorage.removeItem(KEYS.progress);
  } catch {
    /* ignore */
  }
}
