// Dva vzhľady aplikácie: 1 – Zemité karty (predvolený), 2 – Dlaždice.
// Interné značky: a = Zemité karty, b = Dlaždice (html[data-look]).
import { store } from './store.js';

export const THEMES = ['a', 'b'];
export const THEME_COLOR = { a: '#A39896', b: '#E8EAED' };
export const THEME_NUM = { a: '1', b: '2' };

// Zvolený vzhľad; neznámy (napr. zo staršej verzie) sa nahradí predvoleným
export const chosenTheme = () => (THEMES.includes(store.prefs.look) ? store.prefs.look : 'a');
export const activeTheme = chosenTheme;

const listeners = new Set();
export function onThemeChange(fn) { listeners.add(fn); return () => listeners.delete(fn); }

export function applyTheme() {
  const th = activeTheme();
  const root = document.documentElement;
  const changed = root.dataset.look !== th;
  root.dataset.look = th;
  root.dataset.size = store.prefs.size || '';
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = THEME_COLOR[th];
  if (changed) for (const fn of listeners) fn(th);
  return th;
}
export function setTheme(id) {
  if (!THEMES.includes(id)) return;
  store.prefs.look = id;
  store.savePrefs();
  applyTheme();
}
export function cycleTheme() {
  const next = THEMES[(THEMES.indexOf(chosenTheme()) + 1) % THEMES.length];
  setTheme(next);
  return next;
}
