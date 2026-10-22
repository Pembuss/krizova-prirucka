// Aplikácia: smerovanie, navigácia, jazyk, service worker.
import { store } from './store.js';
import { t, LANG, setLang, $, $$, esc } from './core.js';

const ROUTES = {
  '': { mod: './views/home.js', nav: 'home', icon: '🏠' },
  teraz: { mod: './views/now.js', nav: 'now', icon: '⚡' },
  plan: { mod: './views/plan.js', nav: 'plan', icon: '📋' },
  profil: { mod: './views/profile.js', nav: 'profile', icon: '👪' },
  zasoby: { mod: './views/supplies.js', nav: 'supplies', icon: '🥫' },
  energia: { mod: './views/energy.js', nav: 'energy', icon: '🔋' },
  batohy: { mod: './views/bags.js', nav: 'bags', icon: '🎒' },
  rodina: { mod: './views/family.js', nav: 'family', icon: '📞' },
  mapa: { mod: './views/map.js', nav: 'map', icon: '🗺️' },
  trasy: { mod: './views/routes.js', nav: 'routes', icon: '🧭' },
  tlac: { mod: './views/print.js', nav: 'print', icon: '🖨️' },
  nastavenia: { mod: './views/settings.js', nav: 'settings', icon: '⚙️' },
};
const SIDE = ['', 'teraz', 'plan', 'profil', 'zasoby', 'energia', 'batohy', 'rodina', 'mapa', 'trasy', 'tlac', 'nastavenia'];
const TABS = ['', 'teraz', 'plan', 'mapa', 'more'];

function renderNav(active) {
  const link = (k) => {
    const r = ROUTES[k];
    return `<a href="#/${k}" data-nav="${r.nav}"${k === active ? ' aria-current="page"' : ''}><span class="ico" aria-hidden="true">${r.icon}</span><span>${esc(t('nav.' + r.nav))}</span></a>`;
  };
  $('#app-nav').innerHTML = SIDE.map(link).join('') +
    `<hr><a href="../${LANG}/kniha/index.html"><span class="ico">📖</span><span>${esc(t('nav.book'))}</span></a><a href="../${LANG}/index.html"><span class="ico">🌐</span><span>${esc(t('nav.web'))}</span></a>`;
  $('#app-tabs').innerHTML = TABS.map((k) => k === 'more'
    ? `<button type="button" data-more aria-expanded="false"><span class="ico">☰</span><span>${esc(t('nav.more'))}</span></button>`
    : link(k)).join('');
  $$('[data-t]').forEach((el) => { el.textContent = t(el.dataset.t); });
  $('[data-i="appTitle"]').textContent = t('app.title');
  $('#app-lang').value = LANG;
}

let cleanup = null;
let current = null;
async function route() {
  const hash = location.hash.replace(/^#\/?/, '');
  const [name, ...params] = hash.split('/');
  const key = ROUTES[name] ? name : '';
  const r = ROUTES[key];
  renderNav(key);
  document.body.classList.remove('more-open');
  const view = $('#view');
  if (cleanup) { try { cleanup(); } catch { /* */ } cleanup = null; }
  current = key;
  try {
    const mod = await import(r.mod);
    if (current !== key) return;
    view.innerHTML = '';
    cleanup = (await mod.render(view, params.map(decodeURIComponent))) || null;
  } catch (e) {
    console.error(e);
    view.innerHTML = `<div class="wrap"><p class="error">${esc(e.message)}</p></div>`;
  }
  document.title = `${t('nav.' + r.nav)} – ${t('app.title')}`;
  if (!hash.includes('?')) view.focus({ preventScroll: true });
  window.scrollTo(0, 0);
}

document.addEventListener('click', (e) => {
  const more = e.target.closest('[data-more]');
  if (more) {
    const open = document.body.classList.toggle('more-open');
    more.setAttribute('aria-expanded', String(open));
  }
});
$('#app-lang').addEventListener('change', (e) => {
  setLang(e.target.value);
  const u = new URL(location.href);
  u.searchParams.set('lang', e.target.value);
  history.replaceState(null, '', u);
  route();
});
window.addEventListener('hashchange', route);
setLang(LANG);
route();

if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  navigator.serviceWorker.register('../sw.js', { scope: '../' }).then(async () => {
    const reg = await navigator.serviceWorker.ready;
    reg.active?.postMessage({ type: 'cache-lang', lang: LANG });
  }).catch(() => {});
}
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); window._installPrompt = e; });
export { route };
