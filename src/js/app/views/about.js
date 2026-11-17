// O aplikácii: čo to je, novinky, metodika, súkromie, licencie, verzia a zdroje dát.
import { t, T, esc } from '../core.js';
import { icon } from '../icons.js';
import { SITE } from '../../../data/site.js';
import { CHANGES } from '../../../data/help.js';
import { VERSION, VERSION_DATE } from '../../../data/version.js';

export function render(el) {
  el.innerHTML = `<div class="help-wrap">
<div class="page-head"><h1>${esc(t('nav.about'))}</h1></div>
<p class="lead">${esc(T(SITE.tagline))}</p>
<p>${esc(T(SITE.about))}</p>
<section class="card"><h2 class="card-h">${esc(t('about.new', { v: VERSION }))}</h2><ul>${CHANGES.map((c) => `<li>${esc(T(c))}</li>`).join('')}</ul>
<p class="small muted">${esc(t('set.version'))}: <strong>${esc(VERSION)}</strong> · ${esc(VERSION_DATE)}</p></section>
<h2 class="section-title">${esc(T(SITE.methodTitle))}</h2><ul>${SITE.method.map((m) => `<li>${esc(T(m))}</li>`).join('')}</ul>
<p><a class="btn btn-ghost" href="#/kniha/zdroje">${icon('sources', 20)} ${esc(t('about.sources'))}</a></p>
<h2 class="section-title">${icon('shield', 20)} ${esc(T(SITE.privacyTitle))}</h2><p>${esc(T(SITE.privacy))}</p>
<h2 class="section-title">${esc(T(SITE.licenseTitle))}</h2><p>${esc(T(SITE.license))}</p>
<p class="small muted">${esc(t('set.mapData'))}</p>
<p class="small muted">© OpenStreetMap contributors (ODbL) · Natural Earth (public domain) · Leaflet (BSD-2) · OSRM / FOSSGIS · Inter, Space Grotesk, Atkinson Hyperlegible, Source Serif 4 (OFL)</p>
<div class="box urgent"><p class="box-title">⚠️</p><p>${esc(t('c.disclaimer'))}</p></div>
</div>`;
}
