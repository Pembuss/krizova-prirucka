// Tlačové centrum.
import { store } from '../store.js';
import { t, tp, esc, $$ } from '../core.js';
import { printDocs, PRINTABLE } from '../printdocs.js';

const LABEL = { plan: 'pr.plan', family: 'pr.family', wallet: 'pr.wallet', help: 'pr.help', cards: 'pr.cards', shopping: 'pr.shopping', purchase: 'pr.purchase', rotation: 'pr.rotation', bags: 'pr.bags', energy: 'pr.energy', routes: 'pr.routes' };
const ICON = { plan: '📋', family: '📞', wallet: '💳', help: '🆘', cards: '🟧', shopping: '🛒', purchase: '🗓️', rotation: '🔄', bags: '🎒', energy: '🔋', routes: '🧭' };

export function render(el) {
  const sel = new Set(store.prefs.printSel || ['plan', 'family', 'wallet', 'cards', 'shopping']);
  let days = Number(store.profile.supplies.targetDays) || 7;
  el.innerHTML = `<div class="wrap narrow">
<h1>${esc(t('pr.title'))}</h1><p class="lead">${esc(t('pr.lead'))}</p>
<ul class="print-list">${PRINTABLE.map((id) => `<li><label class="check-row"><input type="checkbox" value="${id}" ${sel.has(id) ? 'checked' : ''}><span>${ICON[id]} ${esc(t(LABEL[id]))}</span></label></li>`).join('')}</ul>
<div class="field-row"><span class="lbl">${esc(t('sup.forDays'))}</span><div class="chips">${[3, 7, 14, 30].map((d) => `<button type="button" class="chip" data-d="${d}" aria-pressed="${d === days}">${esc(tp('c.days', d))}</button>`).join('')}</div></div>
<div class="btn-row"><button class="btn" data-go>🖨️ ${esc(t('pr.go'))}</button></div>
<p class="muted small">${esc(t('c.disclaimer'))}</p></div>`;
  el.addEventListener('change', () => {
    store.prefs.printSel = $$('input[type=checkbox]', el).filter((c) => c.checked).map((c) => c.value);
    store.savePrefs();
  });
  el.addEventListener('click', (e) => {
    const d = e.target.closest('[data-d]');
    if (d) { days = Number(d.dataset.d); $$('[data-d]', el).forEach((b) => b.setAttribute('aria-pressed', String(b === d))); }
    if (e.target.closest('[data-go]')) {
      const ids = $$('input[type=checkbox]', el).filter((c) => c.checked).map((c) => c.value);
      if (ids.length) printDocs(ids, { days });
    }
  });
}
