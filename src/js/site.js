// Interaktivita webu a knihy: vzhľad, jazyk, menu, zoznamy, rozcestník, filter krajín, offline.
import { initBook } from './book.js';
const root = document.body.dataset.root || './';
const lang = document.body.dataset.lang || 'sk';
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];

function loadJSON(key, def) { try { return JSON.parse(localStorage.getItem(key)) ?? def; } catch { return def; } }
function saveJSON(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch { /* súkromný režim */ } }

// Predvoľby (vzhľad, veľkosť písma, jazyk)
const prefs = loadJSON('kp.prefs', {});
prefs.lang = lang;
saveJSON('kp.prefs', prefs);
const applyPrefs = () => {
  const d = document.documentElement;
  if (prefs.theme) d.dataset.theme = prefs.theme; else delete d.dataset.theme;
  if (prefs.size) d.dataset.size = prefs.size; else delete d.dataset.size;
};
$('[data-theme-toggle]')?.addEventListener('click', () => {
  const order = [undefined, 'light', 'dark'];
  prefs.theme = order[(order.indexOf(prefs.theme) + 1) % order.length];
  saveJSON('kp.prefs', prefs); applyPrefs();
});
$('[data-size-toggle]')?.addEventListener('click', () => {
  const order = [undefined, 'l', 'xl'];
  prefs.size = order[(order.indexOf(prefs.size) + 1) % order.length];
  saveJSON('kp.prefs', prefs); applyPrefs();
});
$('[data-lang-switch]')?.addEventListener('change', (e) => { location.href = e.target.value; });

// Menu a obsah knihy na mobile
for (const [btnSel, targetSel] of [['.menu-toggle', '#nav'], ['.toc-toggle', '#toc']]) {
  const btn = $(btnSel), target = $(targetSel);
  btn?.addEventListener('click', () => {
    const open = target.classList.toggle('open');
    btn.setAttribute('aria-expanded', String(open));
  });
}
$$('[data-print]').forEach((b) => b.addEventListener('click', () => window.print()));

// Kontrolné zoznamy – odškrtávanie s uložením
const checks = loadJSON('kp.checks', {});
$$('ul.checklist').forEach((ul, listIdx) => {
  const block = ul.closest('[data-persist]') || ul.closest('.checklist-block');
  const key = (block?.dataset.persist || block?.id || location.pathname + '#' + listIdx);
  const state = checks[key] || [];
  $$('li', ul).forEach((li, i) => {
    const cb = $('.cb', li);
    if (!cb) return;
    li.tabIndex = 0;
    li.setAttribute('role', 'checkbox');
    const set = (on) => { li.classList.toggle('done', on); cb.textContent = on ? '☑' : '☐'; li.setAttribute('aria-checked', String(on)); };
    set(!!state[i]);
    const toggle = () => {
      const s = checks[key] || [];
      s[i] = !s[i];
      checks[key] = s;
      saveJSON('kp.checks', checks);
      set(s[i]);
    };
    li.addEventListener('click', (e) => { if (e.target.closest('a')) return; toggle(); });
    li.addEventListener('keydown', (e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); toggle(); } });
  });
});

// Interaktívny rozcestník knihy
const sp = $('[data-signpost]');
if (sp) {
  const data = JSON.parse($('#signpost-data').textContent);
  const out = $('[data-signpost-out]', sp);
  let sel = null, need = 'now';
  const render = () => {
    if (!sel) return;
    let ids;
    if (sel.type === 'crisis') ids = data.paths[sel.id][need];
    else ids = data.situations[sel.id];
    out.innerHTML = `<ol class="path">${ids.map((id) => `<li><a href="${id}.html">${data.titles[id]}</a></li>`).join('')}</ol>`;
  };
  $$('[data-crisis],[data-situation]', sp).forEach((b) => b.addEventListener('click', () => {
    $$('[data-crisis],[data-situation]', sp).forEach((x) => x.setAttribute('aria-pressed', 'false'));
    b.setAttribute('aria-pressed', 'true');
    sel = b.dataset.crisis ? { type: 'crisis', id: b.dataset.crisis } : { type: 'situation', id: b.dataset.situation };
    $('.needs', sp).hidden = sel.type !== 'crisis';
    render();
    out.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }));
  $$('[data-need]', sp).forEach((b) => b.addEventListener('click', () => {
    $$('[data-need]', sp).forEach((x) => x.setAttribute('aria-pressed', 'false'));
    b.setAttribute('aria-pressed', 'true');
    need = b.dataset.need;
    render();
  }));
}

// Filter krajín
$('[data-country-filter]')?.addEventListener('input', (e) => {
  const q = e.target.value.trim().toLowerCase();
  $$('.country').forEach((c) => { c.hidden = q && !c.textContent.toLowerCase().includes(q); });
});

// Offline: service worker, jazyk, súbory na stiahnutie
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register(root + 'sw.js', { scope: root }).then(async () => {
    const reg = await navigator.serviceWorker.ready;
    reg.active?.postMessage({ type: 'cache-lang', lang });
  }).catch(() => {});
}
const status = $('[data-offline-status]');
// Verzia otvorená z disku je celá v počítači – ukladanie cez service worker tam nie je potrebné ani možné.
if (location.protocol === 'file:') $$('[data-save-offline]').forEach((b) => { b.disabled = true; if (status) status.textContent = '✓ ' + ({ sk: 'Táto kópia je uložená v tvojom počítači a funguje bez internetu.', cs: 'Tato kopie je uložená ve tvém počítači a funguje bez internetu.', en: 'This copy is stored on your computer and works offline.' }[lang] || ''); });
$('[data-save-offline]')?.addEventListener('click', async () => {
  const reg = await navigator.serviceWorker?.ready;
  if (!reg?.active) { if (status) status.textContent = '—'; return; }
  const urls = ['sk', 'cs', 'en'].flatMap((l) => [`${root}downloads/krizova-prirucka-${l}.pdf`, `${root}downloads/krizova-prirucka-${l}.epub`]);
  const ch = new MessageChannel();
  ch.port1.onmessage = (e) => { if (status) status.textContent = `${e.data.done}/${e.data.total}${e.data.finished ? ' ✓' : ''}`; };
  reg.active.postMessage({ type: 'cache-docs', urls }, [ch.port2]);
  ['sk', 'cs', 'en'].forEach((l) => reg.active.postMessage({ type: 'cache-lang', lang: l }));
});

initBook();
