// Tri vzhľady aplikácie: A – Pokojný sprievodca, B – Núdzový signál (tmavý), C – Príručka do vrecka.
// Pri tmavom režime telefónu sa automaticky použije B (dá sa vypnúť v Nastaveniach).
import { store } from './store.js';

export const THEMES = ['a', 'b', 'c', 'd'];
export const THEME_COLOR = { a: '#0B5C7A', b: '#0B1220', c: '#2F6F4E', d: '#A39896' };
const dark = typeof matchMedia === 'function' ? matchMedia('(prefers-color-scheme: dark)') : null;

export const chosenTheme = () => (THEMES.includes(store.prefs.look) ? store.prefs.look : 'a');
export const autoDark = () => store.prefs.autoDark !== false;
// Vzhľad, ktorý sa práve zobrazuje (zvolený alebo automaticky tmavý)
export const activeTheme = () => (autoDark() && dark?.matches ? 'b' : chosenTheme());

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
export function setAutoDark(on) {
  store.prefs.autoDark = !!on;
  store.savePrefs();
  applyTheme();
}
export function cycleTheme() {
  const cur = chosenTheme();
  // ak práve beží automatický tmavý režim, prvé ťuknutie ho vypne a ponechá zvolený vzhľad
  if (activeTheme() !== cur) { setAutoDark(false); return cur; }
  const next = THEMES[(THEMES.indexOf(cur) + 1) % THEMES.length];
  setTheme(next);
  return next;
}
dark?.addEventListener?.('change', applyTheme);
