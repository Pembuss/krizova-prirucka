// Postupové karty: okamžité kroky pre každú krízu a spôsob ochrany, tlač jednej alebo všetkých.
import { t, T, esc } from '../core.js';
import { icon } from '../icons.js';
import { CRISES, ACTIONS } from '../../../data/crises.js';
import { chapterById } from '../../../data/book.js';
import { printDocs } from '../printdocs.js';

const ALL = [...CRISES, ...ACTIONS];
export function render(el, [focus]) {
  el.innerHTML = `<div class="wrap" style="max-width:860px">
<div class="page-head"><h1>${esc(t('nav.cards'))}</h1></div>
<p class="lead">${esc(t('cards.lead'))}</p>
<div class="btn-row"><button class="btn" data-print-all>${icon('print', 20)} ${esc(t('cards.printAll'))}</button></div>
<nav class="chips" aria-label="${esc(t('nav.cards'))}">${ALL.map((c) => `<a class="chip" href="#karta-${c.id}" data-jump="${c.id}">${c.icon} ${esc(T(c.name))}</a>`).join('')}</nav>
${ALL.map((c) => {
    const ch = c.chapter && chapterById(c.chapter);
    return `<section class="card stepcard" id="karta-${c.id}">
<h2 class="card-h">${c.icon} ${esc(T(c.name))}</h2>
<div class="box urgent"><p class="box-title">${esc(t('nav.now'))}</p><ol class="steps">${(c.now || c.steps).map((s) => `<li>${esc(T(s))}</li>`).join('')}</ol></div>
${c.before ? `<details><summary>${esc(t('now.prepare'))}</summary><ul>${c.before.map((s) => `<li>${esc(T(s))}</li>`).join('')}</ul></details>
<details><summary>${esc(t('now.after'))}</summary><ul>${c.after.map((s) => `<li>${esc(T(s))}</li>`).join('')}</ul></details>` : ''}
<div class="btn-row"><a class="btn btn-sm btn-urgent" href="#/teraz/${c.id}">${icon('bolt', 18)} ${esc(t('cards.stepByStep'))}</a>
${ch ? `<a class="btn btn-sm btn-ghost" href="#/kniha/${c.chapter}">${icon('book', 18)} ${esc(T(ch.title))}</a>` : ''}
<button class="btn btn-sm btn-ghost" data-print="${c.id}">${icon('print', 18)} ${esc(t('c.print'))}</button></div>
</section>`;
  }).join('')}
</div>`;
  el.addEventListener('click', (e) => {
    const j = e.target.closest('[data-jump]');
    if (j) { e.preventDefault(); document.getElementById('karta-' + j.dataset.jump)?.scrollIntoView({ behavior: 'smooth' }); }
    const p = e.target.closest('[data-print]');
    if (p) printDocs(['card:' + p.dataset.print]);
    if (e.target.closest('[data-print-all]')) printDocs(ALL.map((c) => 'card:' + c.id));
  });
  if (focus) setTimeout(() => document.getElementById('karta-' + focus)?.scrollIntoView(), 30);
}
