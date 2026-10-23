// Kríza teraz: výber situácie a veľká karta s krokmi na odškrtávanie.
import { store } from '../store.js';
import { t, T, esc, bookHref } from '../core.js';

// Krízy, ku ktorým je v knihe príbehový scenár (src/data/scenarios.js)
const STORIES = ['blackout', 'flood', 'chemical', 'fire', 'heat', 'war'];
import { CRISES, ACTIONS, CRISIS_GROUPS, crisisById } from '../../../data/crises.js';
import { printDocs } from '../printdocs.js';

export function render(el, [id]) {
  if (!id) return renderChooser(el);
  const c = crisisById(id);
  if (!c) return renderChooser(el);
  const steps = c.now || c.steps;
  const st = store.state.nowChecks[id] || [];
  const fam = store.profile.family || {};
  const sh = store.profile.shelter || {};
  const personal = [];
  if (['war', 'nuclear', 'chemical', 'shelter', 'shelterInPlace'].includes(id) && (sh.address || fam.homeShelter)) personal.push(t('now.myShelter', { s: sh.address || fam.homeShelter }));
  if (['flood', 'fire', 'quake', 'evacuate', 'comms', 'war'].includes(id) && (fam.meet2 || fam.meet3)) personal.push(t('now.myMeet', { s: [fam.meet2, fam.meet3].filter(Boolean).join(' / ') }));
  el.innerHTML = `<div class="wrap narrow now-card">
<a class="back" href="#/teraz">← ${esc(t('c.back'))}</a>
<h1>${c.icon} ${esc(T(c.name))}</h1>
${personal.length ? `<div class="box note">${personal.map((x) => `<p><strong>${esc(x)}</strong></p>`).join('')}</div>` : ''}
<ol class="bigsteps">${steps.map((s, i) => `<li class="${st[i] ? 'done' : ''}"><button type="button" data-step="${i}" aria-pressed="${!!st[i]}"><span class="num">${i + 1}</span><span class="txt">${esc(T(s))}</span><span class="cb">${st[i] ? '☑' : '☐'}</span></button></li>`).join('')}</ol>
<div class="btn-row">
  <a class="btn btn-urgent" href="tel:112">📞 ${esc(t('now.call'))}</a>
  ${['war', 'nuclear', 'chemical', 'shelter', 'storm', 'terror'].includes(id) ? `<a class="btn" href="#/mapa">🗺️ ${esc(t('now.shelters'))}</a>` : ''}
  ${['flood', 'fire', 'evacuate', 'chemical', 'nuclear', 'war', 'quake'].includes(id) ? `<a class="btn" href="#/trasy">🧭 ${esc(t('now.routes'))}</a>` : ''}
  <a class="btn btn-ghost" href="${bookHref(c.chapter)}">📖 ${esc(t('now.details'))}</a>
  ${STORIES.includes(id) ? `<a class="btn btn-ghost" href="${bookHref('scenare', 'scenar-' + id)}">🎲 ${esc(t('now.story'))}</a>` : ''}
  <button class="btn btn-ghost" data-print>🖨️ ${esc(t('c.print'))}</button>
  <button class="btn btn-ghost" data-reset>↺ ${esc(t('now.reset'))}</button>
</div>
${c.before ? `<details><summary>${esc(t('now.prepare'))}</summary><ul>${c.before.map((s) => `<li>${esc(T(s))}</li>`).join('')}</ul></details>
<details><summary>${esc(t('now.after'))}</summary><ul>${c.after.map((s) => `<li>${esc(T(s))}</li>`).join('')}</ul></details>` : ''}
${c.now ? `<h2>${esc(t('now.protect'))}</h2><div class="grid chooser-grid">${ACTIONS.map((a) => `<a class="card quick-card" href="#/teraz/${a.id}"><span class="icon">${a.icon}</span><span>${esc(T(a.name))}</span></a>`).join('')}</div>` : ''}
</div>`;
  el.onclick = (e) => {
    const b = e.target.closest('[data-step]');
    if (b) {
      const i = Number(b.dataset.step);
      const arr = store.state.nowChecks[id] || [];
      arr[i] = !arr[i];
      store.state.nowChecks[id] = arr;
      store.saveState();
      render(el, [id]);
    }
    if (e.target.closest('[data-reset]')) { store.state.nowChecks[id] = []; store.saveState(); render(el, [id]); }
    if (e.target.closest('[data-print]')) printDocs(['card:' + id]);
  };
}

function renderChooser(el) {
  el.innerHTML = `<div class="wrap">
<h1>${esc(t('now.title'))}</h1>
<p class="lead">${esc(t('now.lead'))}</p>
<div class="btn-row"><a class="btn btn-urgent" href="tel:112">📞 ${esc(t('now.call'))}</a></div>
<h2>${esc(t('now.protect'))}</h2>
<div class="grid chooser-grid">${ACTIONS.map((a) => `<a class="card quick-card" href="#/teraz/${a.id}"><span class="icon">${a.icon}</span><span>${esc(T(a.name))}</span></a>`).join('')}</div>
${CRISIS_GROUPS.map((g) => `<h2>${esc(T(g.name))}</h2><div class="grid chooser-grid">${CRISES.filter((c) => c.group === g.id).map((c) => `<a class="card quick-card" href="#/teraz/${c.id}"><span class="icon">${c.icon}</span><span>${esc(T(c.name))}</span></a>`).join('')}</div>`).join('')}
</div>`;
}
