// Kríza teraz: výber situácie, postup po krokoch (jeden krok na obrazovku) alebo všetky kroky naraz.
// Adresy: #/teraz · #/teraz/<kríza> (1. krok) · #/teraz/<kríza>/<n> · #/teraz/<kríza>/vsetko · #/teraz/<kríza>/hotovo
import { store } from '../store.js';
import { t, tp, T, esc } from '../core.js';
import { icon } from '../icons.js';
import { CRISES, ACTIONS, CRISIS_GROUPS, crisisById } from '../../../data/crises.js';
import { chapterById, chapterNumber } from '../../../data/book.js';
import { printDocs } from '../printdocs.js';

// Krízy, ku ktorým je v knihe príbehový scenár (src/data/scenarios.js)
const STORIES = ['blackout', 'flood', 'chemical', 'fire', 'heat', 'war'];
const SHELTER = ['war', 'nuclear', 'chemical', 'shelter', 'shelterInPlace', 'storm', 'terror'];
const LEAVE = ['flood', 'fire', 'evacuate', 'chemical', 'nuclear', 'war', 'quake'];

export function render(el, [id, sub]) {
  const c = id && crisisById(id);
  if (!c) return chooser(el);
  const steps = c.now || c.steps;
  const listMode = sub === 'vsetko' || (!sub && store.prefs.nowMode === 'list');
  if (listMode) return listView(el, c, steps);
  if (sub === 'hotovo') return doneView(el, c, steps);
  const n = Math.min(Math.max(parseInt(sub, 10) || 1, 1), steps.length);
  return stepView(el, c, steps, n);
}

const checks = (id) => store.state.nowChecks[id] || [];
function toggle(id, i, val) {
  const arr = [...checks(id)];
  arr[i] = val ?? !arr[i];
  store.state.nowChecks[id] = arr;
  store.saveState();
}
function personal(id) {
  const fam = store.profile.family || {};
  const sh = store.profile.shelter || {};
  const out = [];
  if (['war', 'nuclear', 'chemical', 'shelter', 'shelterInPlace'].includes(id) && (sh.address || fam.homeShelter)) out.push(t('now.myShelter', { s: sh.address || fam.homeShelter }));
  if (['flood', 'fire', 'quake', 'evacuate', 'comms', 'war'].includes(id) && (fam.meet2 || fam.meet3)) out.push(t('now.myMeet', { s: [fam.meet2, fam.meet3].filter(Boolean).join(' / ') }));
  return out;
}
const chLabel = (c) => {
  const ch = chapterById(c.chapter);
  return ch ? `${t('now.inBook')}: ${T(ch.title)} (${t('book.chShort')} ${chapterNumber(c.chapter)})` : t('now.details');
};
function topBar(c) {
  return `<div class="step-top">
<a class="hdr-btn" href="#/teraz" aria-label="${esc(t('c.back'))}">${icon('back', 22)}</a>
<div class="st-title"><small class="muted">${esc(t('nav.now'))}</small><strong>${c.icon} ${esc(T(c.name))}</strong></div></div>`;
}
function extras(c, mode) {
  const links = [];
  links.push(mode === 'list'
    ? `<a class="mode-toggle" href="#/teraz/${c.id}/1" data-mode="steps">${icon('next', 18)} ${esc(t('now.showSteps'))}</a>`
    : `<a class="mode-toggle" href="#/teraz/${c.id}/vsetko" data-mode="list">${icon('list', 18)} ${esc(t('now.showAll'))}</a>`);
  if (SHELTER.includes(c.id)) links.push(`<a class="mode-toggle" href="#/mapa">${icon('pin', 18)} ${esc(t('now.shelters'))}</a>`);
  if (LEAVE.includes(c.id)) links.push(`<a class="mode-toggle" href="#/trasy">${icon('route', 18)} ${esc(t('now.routes'))}</a>`);
  if (c.chapter) links.push(`<a class="mode-toggle" href="#/kniha/${c.chapter}">${icon('book', 18)} ${esc(chLabel(c))}</a>`);
  if (STORIES.includes(c.id)) links.push(`<a class="mode-toggle" href="#/kniha/scenare/scenar-${c.id}">${icon('dice', 18)} ${esc(t('now.story'))}</a>`);
  return `<div class="step-extra">${links.join('')}</div>`;
}

function stepView(el, c, steps, n) {
  const st = checks(c.id);
  const mine = n === 1 ? personal(c.id) : [];
  el.innerHTML = `<div class="step-wrap">
${topBar(c)}
<div><div class="step-meta"><span>${esc(t('now.stepOf', { n, total: steps.length }))}</span><span>${esc(t('now.doneCount', { n: st.filter(Boolean).length, total: steps.length }))}</span></div>
<div class="step-progress" aria-hidden="true">${steps.map((_, i) => `<span class="${i < n || st[i] ? 'on' : ''}"></span>`).join('')}</div></div>
${mine.length ? `<div class="box note">${mine.map((x) => `<p><strong>${esc(x)}</strong></p>`).join('')}</div>` : ''}
<section class="step-card" aria-live="polite">
<div class="step-num">${n}<small> / ${steps.length}</small></div>
<p class="step-text">${esc(T(steps[n - 1]))}</p>
<label class="step-check"><input type="checkbox" data-check="${n - 1}" ${st[n - 1] ? 'checked' : ''}> ${esc(t('now.stepDone'))}</label>
</section>
<div class="step-nav">
${n > 1 ? `<a class="btn btn-ghost" href="#/teraz/${c.id}/${n - 1}">${icon('back', 20)} ${esc(t('c.back'))}</a>` : ''}
<a class="btn grow" href="#/teraz/${c.id}/${n < steps.length ? n + 1 : 'hotovo'}" data-next="${n - 1}">${esc(n < steps.length ? t('now.nextStep') : t('now.finish'))} ${icon('next', 20)}</a>
</div>
${extras(c, 'steps')}
</div>`;
  el.addEventListener('change', (e) => { if (e.target.matches('[data-check]')) toggle(c.id, Number(e.target.dataset.check), e.target.checked); });
  // „Ďalej“ zároveň označí krok ako hotový
  el.addEventListener('click', (e) => {
    const nx = e.target.closest('[data-next]');
    if (nx) toggle(c.id, Number(nx.dataset.next), true);
    const md = e.target.closest('[data-mode]');
    if (md) { store.prefs.nowMode = md.dataset.mode; store.savePrefs(); }
  });
}

function listView(el, c, steps) {
  const draw = () => {
    const st = checks(c.id);
    el.innerHTML = `<div class="step-wrap">
${topBar(c)}
${personal(c.id).map((x) => `<div class="box note"><p><strong>${esc(x)}</strong></p></div>`).join('')}
<ol class="bigsteps">${steps.map((s, i) => `<li class="${st[i] ? 'done' : ''}"><button type="button" data-step="${i}" aria-pressed="${!!st[i]}"><span class="num">${i + 1}</span><span class="txt">${esc(T(s))}</span><span class="cb">${st[i] ? '☑' : '☐'}</span></button></li>`).join('')}</ol>
${extras(c, 'list')}
<div class="btn-row"><button class="btn btn-ghost" data-print>${icon('print', 20)} ${esc(t('c.print'))}</button><button class="btn btn-ghost" data-reset>↺ ${esc(t('now.reset'))}</button></div>
${c.before ? `<details><summary>${esc(t('now.prepare'))}</summary><ul>${c.before.map((s) => `<li>${esc(T(s))}</li>`).join('')}</ul></details>
<details><summary>${esc(t('now.after'))}</summary><ul>${c.after.map((s) => `<li>${esc(T(s))}</li>`).join('')}</ul></details>` : ''}
</div>`;
  };
  draw();
  el.addEventListener('click', (e) => {
    const b = e.target.closest('[data-step]');
    if (b) { toggle(c.id, Number(b.dataset.step)); draw(); }
    if (e.target.closest('[data-reset]')) { store.state.nowChecks[c.id] = []; store.saveState(); draw(); }
    if (e.target.closest('[data-print]')) printDocs(['card:' + c.id]);
    const md = e.target.closest('[data-mode]');
    if (md) { store.prefs.nowMode = md.dataset.mode; store.savePrefs(); }
  });
}

function doneView(el, c, steps) {
  const st = checks(c.id);
  const left = steps.map((s, i) => [s, i]).filter(([, i]) => !st[i]);
  el.innerHTML = `<div class="step-wrap">
${topBar(c)}
<section class="step-card step-done">
${icon('check', 56)}
<h1 style="margin:0">${esc(t('now.finished'))}</h1>
<p>${esc(left.length ? tp('now.leftSteps', left.length) : t('now.allChecked'))}</p>
${left.length ? `<ul style="text-align:left">${left.map(([s, i]) => `<li><a href="#/teraz/${c.id}/${i + 1}">${esc(T(s))}</a></li>`).join('')}</ul>` : ''}
</section>
${extras(c, 'steps')}
${c.after ? `<details open><summary>${esc(t('now.after'))}</summary><ul>${c.after.map((s) => `<li>${esc(T(s))}</li>`).join('')}</ul></details>` : ''}
<div class="btn-row"><a class="btn" href="#/teraz/${c.id}/1">↺ ${esc(t('now.again'))}</a><a class="btn btn-ghost" href="#/">${icon('home', 20)} ${esc(t('nav.home'))}</a></div>
</div>`;
}

function chooser(el) {
  const grid = (list) => `<div class="crisis-grid">${list.map((c) => `<a href="#/teraz/${c.id}"><span class="em" aria-hidden="true">${c.icon}</span><span>${esc(T(c.name))}</span></a>`).join('')}</div>`;
  el.innerHTML = `<div class="wrap" style="max-width:900px">
<div class="page-head"><h1>${esc(t('now.title'))}</h1></div>
<p class="lead">${esc(t('now.lead'))}</p>
<div class="btn-row"><a class="btn btn-call" href="tel:112">${icon('phone', 20)} ${esc(t('now.call'))}</a></div>
${CRISIS_GROUPS.map((g) => `<h2 class="section-title">${esc(T(g.name))}</h2>${grid(CRISES.filter((c) => c.group === g.id))}`).join('')}
<h2 class="section-title">${esc(t('now.protect'))}</h2>${grid(ACTIONS)}
</div>`;
}
