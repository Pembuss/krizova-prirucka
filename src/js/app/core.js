// Jazyk, preklady a pomocné funkcie rozhrania aplikácie.
import { S } from './strings.js';
import { store } from './store.js';

const LANGS = ['sk', 'cs', 'en'];
const urlLang = new URLSearchParams(location.search).get('lang');
export let LANG = LANGS.includes(urlLang) ? urlLang : LANGS.includes(store.prefs.lang) ? store.prefs.lang : (navigator.language || 'sk').startsWith('cs') ? 'cs' : (navigator.language || 'sk').startsWith('en') ? 'en' : 'sk';
export function setLang(l) {
  if (!LANGS.includes(l)) return;
  LANG = l;
  store.prefs.lang = l;
  store.savePrefs();
  document.documentElement.lang = l;
}
const idx = () => LANGS.indexOf(LANG);
const fill = (s, vars = {}) => s.replace(/\{(\w+)\}/g, (m, k) => (vars[k] ?? m));

export function t(key, vars) {
  const v = S[key];
  if (!v) return key;
  const s = v[idx()];
  return fill(Array.isArray(s) ? s[0] : s, vars);
}
// Množné číslo: sk/cs 1 | 2–4 | 5+, en 1 | ostatné
export function tp(key, n, vars = {}) {
  const forms = S[key]?.[idx()];
  if (!Array.isArray(forms)) return t(key, { n, ...vars });
  const i = LANG === 'en' ? (n === 1 ? 0 : 1) : n === 1 ? 0 : n >= 2 && n <= 4 ? 1 : 2;
  return fill(forms[i] ?? forms[forms.length - 1], { n, ...vars });
}
// Texty z dátových súborov { sk, cs, en }
export const T = (obj) => (obj && typeof obj === 'object' ? obj[LANG] ?? obj.sk : obj ?? '');

export const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
export const $ = (s, el = document) => el.querySelector(s);
export const $$ = (s, el = document) => [...el.querySelectorAll(s)];
export const money = (x) => new Intl.NumberFormat(LANG === 'en' ? 'en-IE' : LANG === 'cs' ? 'cs-CZ' : 'sk-SK', { style: 'currency', currency: 'EUR' }).format(x || 0);
export const num = (x, d = 0) => new Intl.NumberFormat(LANG === 'en' ? 'en-GB' : LANG, { maximumFractionDigits: d }).format(x || 0);
export const fmtDate = (d) => (d ? new Date(d).toLocaleDateString(LANG === 'en' ? 'en-GB' : LANG) : '');
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
  const v = value ?? getPath(store.profile, path) ?? '';
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
export function bindForm(root, onChange) {
  const save = () => { clearTimeout(saveTimer); saveTimer = setTimeout(() => store.saveProfile(), 250); };
  root.addEventListener('input', (e) => {
    const el = e.target.closest('[data-bind]');
    if (!el) return;
    let v = el.value;
    if (el.dataset.kind === 'num') v = v === '' ? '' : Number(String(v).replace(',', '.'));
    if (el.dataset.kind === 'bool') v = el.checked;
    setPath(store.profile, el.dataset.bind, v);
    save();
    onChange?.(el.dataset.bind, v);
  });
  root.addEventListener('click', (e) => {
    const b = e.target.closest('[data-chip]');
    if (!b) return;
    const path = b.dataset.chip;
    const raw = b.dataset.val;
    const val = /^-?\d+(\.\d+)?$/.test(raw) ? Number(raw) : raw;
    if (b.dataset.multi === 'true') {
      const arr = new Set(getPath(store.profile, path) || []);
      arr.has(val) ? arr.delete(val) : arr.add(val);
      setPath(store.profile, path, [...arr]);
      b.setAttribute('aria-pressed', String(arr.has(val)));
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
export const bookHref = (chapter, anchor = '') => `../${LANG}/kniha/${chapter}.html${anchor ? '#' + anchor : ''}`;
export const webHref = (page = 'index.html') => `../${LANG}/${page}`;
