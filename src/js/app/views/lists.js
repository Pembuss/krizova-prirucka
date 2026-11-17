// Kontrolné zoznamy: batožina, zásoby, dokumenty… – odškrtávanie sa ukladá v zariadení, tlač s políčkami.
import { t, T, esc } from '../core.js';
import { icon } from '../icons.js';
import { CHECKLISTS } from '../../../data/checklists.js';
import { chapterById } from '../../../data/book.js';
import { bindChecklists } from '../bookrt.js';
import { printHtml } from '../printdocs.js';

const block = (c, printing) => `<div class="checklist-block avoid-break" id="zoznam-${c.id}" data-persist="list-${c.id}">
<p class="checklist-title">${c.icon} ${esc(T(c.name))}</p>${c.note ? `<p class="checklist-note">${esc(T(c.note))}</p>` : ''}
<ul class="checklist">${c.items.map((it) => `<li><span class="cb">☐</span> ${esc(T(it.t))}</li>`).join('')}</ul>
${printing ? '' : `<div class="btn-row no-print">${c.chapter && chapterById(c.chapter) ? `<a class="btn btn-sm btn-ghost" href="#/kniha/${c.chapter}">${icon('book', 18)} ${esc(T(chapterById(c.chapter).title))}</a>` : ''}<button class="btn btn-sm btn-ghost" data-print="${c.id}">${icon('print', 18)} ${esc(t('c.print'))}</button><button class="btn btn-sm btn-ghost" data-clear="${c.id}">↺ ${esc(t('now.reset'))}</button></div>`}
</div>`;

export function render(el) {
  const draw = () => {
    el.innerHTML = `<div class="wrap" style="max-width:860px">
<div class="page-head"><h1>${esc(t('nav.lists'))}</h1></div>
<p class="lead">${esc(t('lists.lead'))}</p>
<div class="btn-row"><button class="btn" data-print-all>${icon('print', 20)} ${esc(t('cards.printAll'))}</button><a class="btn btn-ghost" href="#/batohy">${icon('bag', 20)} ${esc(t('nav.bags'))}</a></div>
<nav class="chips" aria-label="${esc(t('nav.lists'))}">${CHECKLISTS.map((c) => `<a class="chip" href="#zoznam-${c.id}" data-jump="${c.id}">${c.icon} ${esc(T(c.name))}</a>`).join('')}</nav>
${CHECKLISTS.map((c) => block(c)).join('')}
</div>`;
    bindChecklists(el, 'zoznamy');
  };
  draw();
  el.addEventListener('click', (e) => {
    const j = e.target.closest('[data-jump]');
    if (j) { e.preventDefault(); document.getElementById('zoznam-' + j.dataset.jump)?.scrollIntoView({ behavior: 'smooth' }); }
    const p = e.target.closest('[data-print]');
    if (p) printHtml(block(CHECKLISTS.find((c) => c.id === p.dataset.print), true));
    if (e.target.closest('[data-print-all]')) printHtml(CHECKLISTS.map((c) => block(c, true)).join(''));
    const cl = e.target.closest('[data-clear]');
    if (cl) {
      try { const all = JSON.parse(localStorage.getItem('kp.checks') || '{}'); delete all['list-' + cl.dataset.clear]; localStorage.setItem('kp.checks', JSON.stringify(all)); } catch { /* */ }
      const y = window.scrollY; draw(); window.scrollTo(0, y);
    }
  });
}
