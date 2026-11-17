// Aplikácia: smerovanie, navigácia, jazyk, vzhľad, service worker.
import { store } from './store.js';
import { t, LANG, setLang, $, $$, esc } from './core.js';
import { LANGS as LANG_INFO } from '../../data/ui.js';
import { icon } from './icons.js';
import { THEMES, applyTheme, activeTheme, chosenTheme, autoDark, setTheme, setAutoDark, onThemeChange } from './theme.js';
import { ROUTES, NAV_GROUPS, TABS, UNDER_MORE } from './routes.js';

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
  lb.innerHTML = `${icon('palette', 20)}<span class="look-letter">${activeTheme().toUpperCase()}</span>`;
  lb.setAttribute('aria-label', `${t('look.title')}: ${t('look.' + activeTheme())}`);
  const call = $('.hdr-112');
  call.innerHTML = `${icon('phone', 18)}<span>112</span>`;
  call.setAttribute('aria-label', t('now.call'));
}

// Výber vzhľadu v hlavičke
function lookPopHtml() {
  const cur = chosenTheme();
  return `<p class="look-pop-title">${esc(t('look.title'))}</p>
${THEMES.map((id) => `<button type="button" class="look-opt" data-look="${id}" aria-pressed="${id === cur}"><span class="look-swatch look-sw-${id}" aria-hidden="true"></span><span><strong>${esc(t('look.' + id))}</strong><small>${esc(t('look.' + id + 'Desc'))}</small></span></button>`).join('')}
<label class="look-auto"><input type="checkbox" data-look-auto ${autoDark() ? 'checked' : ''}> ${esc(t('look.auto'))}</label>`;
}
function closeLookPop() { const p = $('#look-pop'); p.hidden = true; $('[data-look-menu]').setAttribute('aria-expanded', 'false'); }

let cleanup = null, current = { key: null, mod: null, view: null };
let renderSeq = 0;
async function route() {
  const hash = location.hash.replace(/^#\/?/, '');
  const [name, ...params] = hash.split('/');
  const key = ROUTES[name] ? name : '';
  // prvé spustenie: úvodná inštruktáž (nie pri priamom odkaze, napr. na krízový postup)
  if (!store.prefs.onboarded && key === '' && !sessionStorage.getItem('kp.skipIntro')) { location.replace('#/uvod'); return; }
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
    // výslovná voľba vzhľadu má prednosť pred automatickým tmavým režimom
    if (activeTheme() !== lo.dataset.look) setAutoDark(false);
    closeLookPop();
    return;
  }
  if (!e.target.closest('#look-pop')) closeLookPop();
});
document.addEventListener('change', (e) => {
  if (e.target.matches('[data-look-auto]')) setAutoDark(e.target.checked);
});
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeLookPop(); });
$('#app-lang').addEventListener('change', (e) => {
  setLang(e.target.value);
  const u = new URL(location.href);
  u.searchParams.delete('lang');
  history.replaceState(null, '', u);
  rerender();
});
// vzhľad sa môže zmeniť aj sám (tmavý režim telefónu) – domovská obrazovka má pre každý vzhľad iné rozloženie
onThemeChange(() => rerender());
window.addEventListener('hashchange', route);
applyTheme();
setLang(LANG);
route();

if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  navigator.serviceWorker.register('sw.js', { scope: './' }).catch(() => {});
}
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); window._installPrompt = e; });
export { route };
