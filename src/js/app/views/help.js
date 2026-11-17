// Pomoc: prehliadka, inštruktáž, príručka k aplikácii (PDF), časté otázky, tiesňové čísla.
import { t, T, esc, LANG } from '../core.js';
import { icon } from '../icons.js';
import { FAQ } from '../../../data/help.js';
import { manualFile, fmtSize } from '../downloads.js';
import { requestTour } from '../tour.js';
import { store } from '../store.js';

export function render(el) {
  const man = manualFile(LANG);
  el.innerHTML = `<div class="help-wrap">
<div class="page-head"><h1>${esc(t('nav.help'))}</h1></div>
<p class="lead">${esc(t('help.lead'))}</p>
<div class="tile-grid">
<button type="button" class="tile" data-tour-start>${icon('play', 26)}<strong>${esc(t('help.tour'))}</strong><small>${esc(t('help.tourSub'))}</small></button>
<button type="button" class="tile" data-intro>${icon('flag', 26)}<strong>${esc(t('help.intro'))}</strong><small>${esc(t('help.introSub'))}</small></button>
${man ? `<a class="tile" href="${esc(man.file)}" download>${icon('download', 26)}<strong>${esc(t('help.manual'))}</strong><small>PDF · ${esc(fmtSize(man.size, LANG))}</small></a>` : ''}
<a class="tile" href="#/kniha">${icon('book', 26)}<strong>${esc(t('nav.book'))}</strong><small>${esc(t('home.tBookSub'))}</small></a>
</div>
<h2 class="section-title">${icon('help', 20)} ${esc(t('help.faq'))}</h2>
<div class="faq">${FAQ.map((f, i) => `<details${i ? '' : ' open'}><summary>${esc(T(f.q))}</summary><p>${esc(T(f.a))}</p></details>`).join('')}</div>
<h2 class="section-title">${icon('phone', 20)} ${esc(t('help.numbers'))}</h2>
<div class="box urgent"><p><strong>112</strong> – ${esc(t('help.n112'))}</p><p class="small">${esc(t('help.nLocal'))}</p></div>
<p class="small muted"><a href="#/o-aplikacii">${esc(t('nav.about'))}</a> · ${esc(t('c.disclaimer'))}</p>
</div>`;
  el.addEventListener('click', (e) => {
    if (e.target.closest('[data-tour-start]')) requestTour();
    if (e.target.closest('[data-intro]')) { store.prefs.onboarded = false; store.savePrefs(); location.hash = '#/uvod'; }
  });
}
