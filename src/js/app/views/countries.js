// Krajiny: tiesňové čísla, varovanie, úkryty a úrady v európskych krajinách (príloha knihy) s filtrom.
import { t, esc } from '../core.js';
import { icon } from '../icons.js';
import { chapterBody } from './book.js';

export async function render(el) {
  el.innerHTML = `<div class="wrap" style="max-width:860px">
<div class="page-head"><h1>${esc(t('nav.countries'))}</h1></div>
<p class="lead">${esc(t('ctry.lead'))}</p>
<div class="search-box">${icon('search', 20)}<label class="visually-hidden" for="cfilter">${esc(t('ctry.filter'))}</label><input id="cfilter" type="search" placeholder="${esc(t('ctry.filter'))}" autocomplete="off"></div>
<div class="reader-content book-main" data-body><p class="muted">${esc(t('c.loading'))}</p></div>
<p><a class="btn btn-ghost" href="#/kniha/kryty-europa">${icon('book', 20)} ${esc(t('ctry.inBook'))}</a></p>
</div>`;
  const body = el.querySelector('[data-body]');
  body.innerHTML = await chapterBody('kryty-europa').catch(() => '') || `<p class="error">${esc(t('book.loadErr'))}</p>`;
  el.querySelector('#cfilter').addEventListener('input', (e) => {
    const q = e.target.value.trim().toLowerCase();
    body.querySelectorAll('.country').forEach((c) => { c.hidden = !!q && !c.textContent.toLowerCase().includes(q); });
  });
}
