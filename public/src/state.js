// Browser persistence. Only non-personal UI state is stored, and only on this device:
//  - settings + sound preference → localStorage (remembered next visit)
// Game progress (seen cards, current card) lives in memory only and ends with the page.
// Psych-test answers/results are never stored or sent anywhere.
import { sanitizeSettings } from './content/meta.js';

const KEYS = { settings: 'dugeun:settings', sound: 'dugeun:sound' };

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
