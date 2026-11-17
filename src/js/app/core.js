// Jazyk, preklady a pomocné funkcie rozhrania aplikácie.
import { S } from './strings.js';
import { store } from './store.js';
import { loadAsset } from './loader.js';
import { CURRENCY } from '../../data/currency.js';

// Poradie stĺpcov v textoch (strings.js): sk, cs, en, pl, hu. Chýbajúci preklad sa nahradí angličtinou.
export const LANGS = ['sk', 'cs', 'en', 'pl', 'hu'];
const urlLang = new URLSearchParams(location.search).get('lang');
const navLang = () => { const n = (navigator.language || 'sk').slice(0, 2); return LANGS.includes(n) ? n : n === 'cz' ? 'cs' : 'en'; };
export let LANG = LANGS.includes(urlLang) ? urlLang : LANGS.includes(store.prefs.lang) ? store.prefs.lang : navLang();
// Načíta preklad (PL, HU) pred prepnutím jazyka
export async function ensureLang(l) {
  if (['sk', 'cs', 'en'].includes(l) || typeof window === 'undefined' || window.KP_I18N?.[l]) return;
  await loadAsset(`i18n/${l}.js`).catch(() => {});
}
export async function switchLang(l) { await ensureLang(l); setLang(l); }
export function setLang(l) {
  if (!LANGS.includes(l)) return;
  LANG = l;
  store.prefs.lang = l;
  store.savePrefs();
  document.documentElement.lang = l;
  // ?lang= v adrese by po obnovení stránky prebil zvolený jazyk
  try { const u = new URL(location.href); if (u.searchParams.has('lang')) { u.searchParams.delete('lang'); history.replaceState(null, '', u); } } catch { /* */ }
}
const idx = () => LANGS.indexOf(LANG);
const fill = (s, vars = {}) => s.replace(/\{(\w+)\}/g, (m, k) => (vars[k] ?? m));

const pick = (v) => v?.[idx()] ?? v?.[2] ?? v?.[0];
// Preklady PL a HU: assets/i18n/<jazyk>.js (window.KP_I18N[jazyk] = { ui: {kľúč: text}, data: {anglický text: preklad} })
const X = () => (typeof window !== 'undefined' && window.KP_I18N?.[LANG]) || null;
const uiText = (key) => X()?.ui?.[key] ?? pick(S[key]);
export function t(key, vars) {
  if (!S[key]) return key;
  const s = uiText(key);
  return fill(Array.isArray(s) ? s[0] : s, vars);
}
// Množné číslo: sk/cs 1 | 2–4 | 5+; pl 1 | 2–4 (okrem 12–14) | ostatné; en 1 | ostatné; hu jeden tvar
export function pluralIndex(n, lang = LANG) {
  if (lang === 'en') return n === 1 ? 0 : 1;
  if (lang === 'hu') return 0;
  if (lang === 'pl') return n === 1 ? 0 : n % 10 >= 2 && n % 10 <= 4 && !(n % 100 >= 12 && n % 100 <= 14) ? 1 : 2;
  return n === 1 ? 0 : n >= 2 && n <= 4 ? 1 : 2;
}
export function tp(key, n, vars = {}) {
  const own = X()?.ui?.[key] ?? S[key]?.[idx()];
  const forms = own ?? S[key]?.[2];
  if (!Array.isArray(forms)) return t(key, { n, ...vars });
  const i = own ? pluralIndex(n) : pluralIndex(n, 'en');
  return fill(forms[i] ?? forms[forms.length - 1], { n, ...vars });
}
// Texty z dátových súborov { sk, cs, en, pl, hu }
export const T = (obj) => (obj && typeof obj === 'object' ? obj[LANG] ?? X()?.data?.[obj.en] ?? obj.en ?? obj.sk : obj ?? '');

export const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
export const $ = (s, el = document) => el.querySelector(s);
export const $$ = (s, el = document) => [...el.querySelectorAll(s)];
export const LOCALE = { sk: 'sk-SK', cs: 'cs-CZ', en: 'en-GB', pl: 'pl-PL', hu: 'hu-HU' };
// Ceny sú v dátach v eurách; poľská a maďarská verzia ich zobrazuje v miestnej mene (orientačný kurz).
export const money = (x) => {
  const c = CURRENCY[LANG] || CURRENCY.sk;
  return new Intl.NumberFormat(LOCALE[LANG], { style: 'currency', currency: c.code, maximumFractionDigits: c.code === 'HUF' ? 0 : 2 }).format((x || 0) * c.rate);
};
// prepočet cien (uložené v eurách) na miestnu menu a späť – pre polia s cenou a rozpočtom
export const rate = () => (CURRENCY[LANG] || CURRENCY.sk).rate;
export const toLocal = (eur) => { const c = CURRENCY[LANG] || CURRENCY.sk; const v = (Number(eur) || 0) * c.rate; return c.code === 'HUF' ? Math.round(v) : Math.round(v * 100) / 100; };
export const fromLocal = (x) => (Number(String(x).replace(',', '.')) || 0) / rate();
export const num = (x, d = 0) => new Intl.NumberFormat(LOCALE[LANG], { maximumFractionDigits: d }).format(x || 0);
export const fmtDate = (d) => (d ? new Date(d).toLocaleDateString(LOCALE[LANG]) : '');
export const fmtDuration = (sec) => {
  const m = Math.round(sec / 60);
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')} min`;
};

// Získanie/nastavenie hodnoty v profile podľa cesty "a.b.c"
export function getPath(obj, p) { return p.split('.').reduce((o, k) => (o == null ? o : o[k]), obj); }
export function setPath(obj, p, v) {
  const ks = p.split('.');
  const last = ks.pop();
  const target = ks.reduce((o, k) => (o[k] ??= {}), obj);
  target[last] = v;
}

// Formulárové prvky viazané na profil: data-bind="cesta" data-kind="num|bool|text|multi"
export function input(path, label, { type = 'text', value, hint, attrs = '', kind } = {}) {
  let v = value ?? getPath(store.profile, path) ?? '';
  if (kind === 'money' && v !== '') v = toLocal(v);
  return `<label class="field-row"><span class="lbl">${esc(label)}</span><input type="${type}" data-bind="${path}" data-kind="${kind || (type === 'number' ? 'num' : 'text')}" value="${esc(v)}" ${attrs}>${hint ? `<small>${esc(hint)}</small>` : ''}</label>`;
}
export function textarea(path, label, { value, rows = 3, hint } = {}) {
  const v = value ?? getPath(store.profile, path) ?? '';
  return `<label class="field-row"><span class="lbl">${esc(label)}</span><textarea data-bind="${path}" data-kind="text" rows="${rows}">${esc(v)}</textarea>${hint ? `<small>${esc(hint)}</small>` : ''}</label>`;
}
export function select(path, label, options, { value } = {}) {
  const v = value ?? getPath(store.profile, path);
  return `<label class="field-row"><span class="lbl">${esc(label)}</span><select data-bind="${path}" data-kind="${typeof options[0]?.[0] === 'number' ? 'num' : 'text'}">${options.map(([val, lab]) => `<option value="${esc(val)}"${String(val) === String(v) ? ' selected' : ''}>${esc(lab)}</option>`).join('')}</select></label>`;
}
export function check(path, label, { value } = {}) {
  const v = value ?? getPath(store.profile, path);
  return `<label class="check-row"><input type="checkbox" data-bind="${path}" data-kind="bool"${v ? ' checked' : ''}><span>${esc(label)}</span></label>`;
}
export function chips(path, options, { multi = false } = {}) {
  const v = getPath(store.profile, path);
  const on = (val) => (multi ? (v || []).includes(val) : String(v) === String(val));
  return `<div class="chips" role="group">${options.map(([val, lab]) => `<button type="button" class="chip" data-chip="${path}" data-val="${esc(val)}" data-multi="${multi}" aria-pressed="${on(val)}">${esc(lab)}</button>`).join('')}</div>`;
}

let saveTimer;
const boundRoots = new WeakSet();
export function bindForm(root, onChange) {
  // Ten istý kontajner sa viaže iba raz – dvojitá obsluha by výber vo viacnásobných voľbách hneď vrátila späť.
  if (boundRoots.has(root)) return;
  boundRoots.add(root);
  const save = () => { clearTimeout(saveTimer); saveTimer = setTimeout(() => store.saveProfile(), 250); };
  root.addEventListener('input', (e) => {
    const el = e.target.closest('[data-bind]');
    if (!el) return;
    let v = el.value;
    if (el.dataset.kind === 'num') v = v === '' ? '' : Number(String(v).replace(',', '.'));
    if (el.dataset.kind === 'money') v = v === '' ? '' : fromLocal(v);
    if (el.dataset.kind === 'bool') v = el.checked;
    setPath(store.profile, el.dataset.bind, v);
    save();
    onChange?.(el.dataset.bind, v);
  });
  root.addEventListener('click', (e) => {
    const b = e.target.closest('[data-chip]');
    if (!b || e.kpChip) return;
    e.kpChip = true;
    const path = b.dataset.chip;
    const raw = b.dataset.val;
    const val = /^-?\d+(\.\d+)?$/.test(raw) ? Number(raw) : raw;
    if (b.dataset.multi === 'true') {
      // Nový stav podľa tlačidla, ktoré používateľ vidí (nie podľa uloženého poľa).
      const want = b.getAttribute('aria-pressed') !== 'true';
      const cur = getPath(store.profile, path);
      const arr = new Set(Array.isArray(cur) ? cur : []);
      want ? arr.add(val) : arr.delete(val);
      setPath(store.profile, path, [...arr]);
      b.setAttribute('aria-pressed', String(want));
    } else {
      setPath(store.profile, path, val);
      $$(`[data-chip="${path}"]`, root).forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    }
    save();
    onChange?.(path, val);
  });
}

export function toast(msg, ms = 2500) {
  let el = $('#toast');
  if (!el) { el = document.createElement('div'); el.id = 'toast'; el.setAttribute('role', 'status'); document.body.appendChild(el); }
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove('show'), ms);
}

// Odkaz do knihy/webu v aktuálnom jazyku (z aplikácie /app/)
export const bookHref = (chapter, anchor = '') => `#/kniha/${chapter}${anchor && anchor !== chapter ? '/' + anchor : ''}`;
