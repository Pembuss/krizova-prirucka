// Prehľad: pripravenosť, riziká, ďalšie kroky, rýchle akcie.
import { store } from '../store.js';
import { t, tp, T, esc } from '../core.js';
import { riskProfile } from '../../calc.js';
import { crisisById } from '../../../data/crises.js';
import { buildTasks, readiness } from '../tasks.js';
import { taskLink } from './plan.js';

export function render(el) {
  const p = store.profile;
  const done = store.state.wizardDone;
  const tasks = buildTasks(p);
  const r = readiness(tasks, store.state);
  const risk = riskProfile(p);
  const next = tasks.filter((x) => !(x.auto || store.state.tasksDone[x.id])).slice(0, 5);
  const top = risk.list.slice(0, 5);
  const members = p.members || [];
  el.innerHTML = `<div class="wrap">
<section class="app-hero">
  <h1>${esc(t('home.welcome'))}</h1>
  ${done ? '' : `<p class="lead">${esc(t('home.intro'))}</p>`}
  <div class="btn-row">
    <a class="btn btn-urgent" href="#/teraz">⚡ ${esc(t('nav.now'))}</a>
    <a class="btn" href="#/profil">${done ? '✏️ ' + esc(t('home.editProfile')) : '▶ ' + esc(t('home.startWizard'))}</a>
  </div>
</section>
<div class="grid dash">
  <section class="card">
    <h2 class="card-h">${esc(t('home.readiness'))}</h2>
    <div class="meter" role="meter" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${r.pct}"><span style="width:${r.pct}%"></span></div>
    <p class="big">${r.pct} %</p>
    <p class="muted">${esc(t('home.tasksDone', { done: r.done, total: r.total }))}</p>
    <p class="muted">${esc(t('home.household'))}: ${esc(tp('c.persons', members.length))}${(p.pets || []).length ? ` · 🐾 ${p.pets.length}` : ''} · ${esc(t('home.goal', { days: tp('c.days', Number(p.supplies.targetDays) || 0), cur: tp('c.days', Number(p.supplies.currentDays) || 0) }))}</p>
  </section>
  <section class="card">
    <h2 class="card-h">${esc(t('home.topRisks'))}</h2>
    <ul class="risklist">${top.map((x) => { const c = crisisById(x.id); return `<li><a href="#/teraz/${x.id}"><span>${c.icon} ${esc(T(c.name))}</span><span class="badge risk-${x.score}">${esc(t('risk.l' + x.score))}</span></a></li>`; }).join('')}</ul>
    ${risk.npp ? `<p class="muted">☢️ ${esc(t('home.npp', { name: risk.npp.name, km: risk.npp.km }))}</p>` : `<p class="muted">${esc(t('home.noLocation'))}</p>`}
    <a href="#/plan">${esc(t('plan.risks'))} →</a>
  </section>
  <section class="card wide">
    <h2 class="card-h">${esc(t('home.nextTasks'))}</h2>
    <ol class="tasklist">${next.map((x) => `<li><span>${esc(x.text)}</span> ${taskLink(x)}</li>`).join('')}</ol>
    <a href="#/plan">${esc(t('home.allTasks'))} →</a>
  </section>
</div>
<section>
  <h2>${esc(t('home.quick'))}</h2>
  <div class="grid quick">
    ${[['#/zasoby', '🥫', 'nav.supplies'], ['#/mapa', '🗺️', 'nav.map'], ['#/trasy', '🧭', 'nav.routes'], ['#/rodina', '📞', 'nav.family'], ['#/batohy', '🎒', 'nav.bags'], ['#/energia', '🔋', 'nav.energy'], ['#/tlac', '🖨️', 'nav.print'], ['#/nastavenia', '⚙️', 'nav.settings']]
      .map(([h, i, k]) => `<a class="card quick-card" href="${h}"><span class="icon">${i}</span><span>${esc(t(k))}</span></a>`).join('')}
  </div>
</section>
<p class="muted small">${esc(t('c.disclaimer'))}</p>
</div>`;
}
