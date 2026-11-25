// Aplikácia: smerovanie, navigácia, jazyk, vzhľad, service worker.
import { store } from './store.js';
import { t, LANG, setLang, switchLang, ensureLang, $, $$, esc } from './core.js';
import { LANGS as LANG_INFO } from '../../data/ui.js';
import { icon } from './icons.js';
import { THEMES, THEME_NUM, applyTheme, activeTheme, chosenTheme, setTheme, onThemeChange } from './theme.js';
import { ROUTES, NAV_GROUPS, TABS, UNDER_MORE } from './routes.js';
import { offerOnFirstRun, isStandalone } from './install.js';
import { initUpdates, applyUpdate } from './update.js';
import { watchTables } from './tables.js';
import { keepStorage } from './store.js';

const navLink = (k, active, cls = '', tab = false) => {
  const r = ROUTES[k];
  const cur = k === active || (tab && k === 'viac' && UNDER_MORE.has(active));
  return `<a class="${cls}" href="#/${k}" data-nav="${r.nav}"${cur ? ' aria-current="page"' : ''}>${icon(r.ico)}<span>${esc(t((tab ? 'tab.' : 'nav.') + r.nav))}</span></a>`;
};
function renderChrome(active) {
  $('#app-nav').innerHTML = NAV_GROUPS.map((g) => `<div class="nav-group">${g.map((k) => navLink(k, active)).join('')}</div>`).join('');
  $('#app-tabs').innerHTML = TABS.map((k) => navLink(k, active, k === 'teraz' ? 'tab-urgent' : '', true)).join('');
  $$('[data-t]').forEach((el) => { el.textContent = t(el.dataset.t); });
  const sel = $('#app-lang');
  if (sel.options.length !== LANG_INFO.length) sel.innerHTML = LANG_INFO.map((l) => `<option value="${l.id}">${l.short}</option>`).join('');
  sel.value = LANG;
  sel.title = LANG_INFO.find((l) => l.id === LANG)?.name || '';
  const lb = $('[data-look-menu]');
  lb.innerHTML = `${icon('palette', 20)}<span class="look-letter">${THEME_NUM[activeTheme()]}</span>`;
  lb.setAttribute('aria-label', `${t('look.title')}: ${t('look.' + activeTheme())}`);
  const call = $('.hdr-112');
  call.innerHTML = `${icon('phone', 18)}<span>112</span>`;
  call.setAttribute('aria-label', t('now.call'));
}

// Výber vzhľadu v hlavičke
function lookPopHtml() {
  const cur = chosenTheme();
  return `<p class="look-pop-title">${esc(t('look.title'))}</p>
${THEMES.map((id) => `<button type="button" class="look-opt" data-look="${id}" aria-pressed="${id === cur}"><span class="look-swatch look-sw-${id}" aria-hidden="true"></span><span><strong>${esc(t('look.' + id))}</strong><small>${esc(t('look.' + id + 'Desc'))}</small></span></button>`).join('')}`;
}
function closeLookPop() { const p = $('#look-pop'); p.hidden = true; $('[data-look-menu]').setAttribute('aria-expanded', 'false'); }

let cleanup = null, current = { key: null, mod: null, view: null };
let renderSeq = 0;
async function route() {
  const hash = location.hash.replace(/^#\/?/, '');
  const [name, ...params] = hash.split('/');
  const key = ROUTES[name] ? name : '';
  // prvé spustenie (nie pri priamom odkaze, napr. na krízový postup): na webe najprv ponuka inštalácie
  // do telefónu, potom úvodná inštruktáž. Nainštalovaná aplikácia (z ikony na ploche) ide rovno na inštruktáž.
  if (key === '' && !sessionStorage.getItem('kp.skipIntro')) {
    if (offerOnFirstRun()) { location.replace('#/instalacia'); return; }
    if (!store.prefs.onboarded) { location.replace('#/uvod'); return; }
  }
  const r = ROUTES[key];
  const args = params.map(decodeURIComponent);
  document.body.classList.toggle('bare', !!r.bare);
  renderChrome(key);
  closeLookPop();
  // tá istá obrazovka s inými parametrami (napr. iná sekcia kapitoly) – bez prekreslenia
  if (current.key === key && current.mod?.update && current.view?.isConnected) {
    if (await current.mod.update(current.view, args)) return;
  }
  let view = $('#view');
  if (cleanup) { try { cleanup(); } catch { /* */ } cleanup = null; }
  const my = ++renderSeq;
  let keepScroll = false;
  try {
    const mod = await r.load();
    if (my !== renderSeq) return;
    // Nový prázdny kontajner zahodí obsluhy udalostí predchádzajúcej obrazovky
    // (inak by sa po návrate klik spracoval dvakrát a prepínače by sa vrátili späť).
    const fresh = view.cloneNode(false);
    view.replaceWith(fresh);
    view = fresh;
    current = { key, mod, view };
    keepScroll = !!mod.keepScroll;
    cleanup = (await mod.render(view, args)) || null;
  } catch (e) {
    console.error(e);
    view.innerHTML = `<div class="wrap"><p class="error">${esc(e.message)}</p></div>`;
  }
  document.title = key ? `${t('nav.' + r.nav)} – ${t('app.title')}` : t('app.title');
  if (!keepScroll) { view.focus({ preventScroll: true }); window.scrollTo(0, 0); }
  // prehliadka so šípkami (po inštruktáži alebo z Pomoci)
  if (key === '' && sessionStorage.getItem('kp.tour')) {
    sessionStorage.removeItem('kp.tour');
    import('./tour.js').then((m) => setTimeout(m.startTour, 250));
  }
}
export function rerender() { current.key = null; route(); }

document.addEventListener('click', (e) => {
  const lm = e.target.closest('[data-look-menu]');
  if (lm) {
    const p = $('#look-pop');
    p.innerHTML = lookPopHtml();
    p.hidden = !p.hidden;
    lm.setAttribute('aria-expanded', String(!p.hidden));
    if (!p.hidden) p.querySelector('[aria-pressed="true"]')?.focus();
    return;
  }
  const lo = e.target.closest('[data-look]');
  if (lo && lo.closest('#look-pop')) {
    setTheme(lo.dataset.look);
    closeLookPop();
    return;
  }
  if (!e.target.closest('#look-pop')) closeLookPop();
});
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeLookPop(); });
$('#app-lang').addEventListener('change', async (e) => {
  await switchLang(e.target.value);
  rerender();
});
// domovská obrazovka má pre každý vzhľad iné rozloženie
onThemeChange(() => rerender());
window.addEventListener('hashchange', route);
applyTheme();
watchTables(document.querySelector('.app-body'));
// preklad PL/HU sa načíta pred prvým vykreslením
ensureLang(LANG).then(() => { setLang(LANG); route(); });

if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  navigator.serviceWorker.register('sw.js', { scope: './' }).catch(() => {});
  initUpdates();
}
// Nainštalovaná aplikácia požiada prehliadač o trvalé uloženie údajov (inak ich môže po dlhšom nepoužívaní zmazať)
if (isStandalone() || store.prefs.installed) keepStorage();

// Pás „Nová verzia je pripravená“ – aplikácia sa neobnoví sama, aby neprerušila čítanie postupu
function showUpdateBanner() {
  if (document.getElementById('update-banner')) return;
  const b = document.createElement('div');
  b.id = 'update-banner'; b.className = 'update-banner no-print'; b.setAttribute('role', 'status');
  b.innerHTML = `${icon('download', 20)}<span>${esc(t('upd.ready'))}</span><button type="button" class="btn btn-sm" data-upd-apply>${esc(t('upd.apply'))}</button><button type="button" class="hint-x" data-upd-close aria-label="${esc(t('c.close'))}">${icon('close', 18)}</button>`;
  b.addEventListener('click', (e) => {
    if (e.target.closest('[data-upd-apply]')) applyUpdate();
    if (e.target.closest('[data-upd-close]')) b.remove();
  });
  document.body.appendChild(b);
}
window.addEventListener('kp-update-ready', showUpdateBanner);
// Natívne inštalačné okno (Chrome, Edge, Samsung Internet) – ponúkne ho obrazovka Inštalácia
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); window._installPrompt = e; window.dispatchEvent(new Event('kp-installable')); });
window.addEventListener('appinstalled', () => {
  window._installPrompt = null;
  store.prefs.installed = true;
  store.savePrefs();
  window.dispatchEvent(new Event('kp-installed'));
});
export { route };
