// Viac: všetky ďalšie časti aplikácie ako dlaždice (mobil).
import { t, esc } from '../core.js';
import { icon } from '../icons.js';
import { ROUTES, NAV_GROUPS } from '../routes.js';
import { VERSION } from '../../../data/version.js';

const GROUPS = [['more.prepare', ['plan', 'profil', 'zasoby', 'energia', 'batohy', 'rodina']], ['more.info', ['trasy', 'karty', 'zoznamy', 'krajiny', 'kryty']], ['more.app', NAV_GROUPS[3]]];
export function render(el) {
  el.innerHTML = `<div class="more-wrap">
<div class="page-head"><h1>${esc(t('nav.more'))}</h1></div>
${GROUPS.map(([title, keys]) => `<h2 class="section-title">${esc(t(title))}</h2>
<div class="tile-grid">${keys.map((k) => `<a class="tile" href="#/${k}">${icon(ROUTES[k].ico, 26)}<strong>${esc(t('nav.' + ROUTES[k].nav))}</strong><small>${esc(t('sub.' + ROUTES[k].nav))}</small></a>`).join('')}</div>`).join('')}
<p class="small muted" style="text-align:center">${esc(t('app.title'))} · ${esc(VERSION)}</p>
</div>`;
}
