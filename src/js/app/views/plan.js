// Môj plán: rizikový profil s dôvodmi a odškrtávateľné kroky po kategóriách.
import { store, download } from '../store.js';
import { t, T, esc, $$, bookHref } from '../core.js';
import { riskProfile } from '../../calc.js';
import { crisisById } from '../../../data/crises.js';
import { buildTasks, readiness, icsReminders } from '../tasks.js';

export function taskLink(x) {
  if (!x.link) return '';
  if (x.link.startsWith('book:')) {
    const [ch, anchor] = x.link.slice(5).split('#');
    return `<a class="tlink" href="${bookHref(ch, anchor)}">📖</a>`;
  }
  return `<a class="tlink" href="${x.link}">→</a>`;
}

const CATS = ['basics', 'supplies', 'home', 'people', 'shelter', 'skills'];

export function render(el) {
  const p = store.profile;
  const draw = () => {
    const tasks = buildTasks(p);
    const r = readiness(tasks, store.state);
    const risk = riskProfile(p);
    el.innerHTML = `<div class="wrap">
<h1>${esc(t('plan.title'))}</h1>
${store.state.wizardDone ? '' : `<p class="notice">${esc(t('plan.empty'))} <a href="#/profil">${esc(t('home.startWizard'))}</a></p>`}
<div class="meter" role="meter" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${r.pct}"><span style="width:${r.pct}%"></span></div>
<p class="muted">${esc(t('home.tasksDone', { done: r.done, total: r.total }))}</p>
<section>
<h2>${esc(t('plan.risks'))}</h2>
<p class="muted small">${esc(t('plan.riskNote'))}</p>
<div class="table-wrap"><table class="data risk-table"><tbody>
${risk.list.map((x) => { const c = crisisById(x.id); return `<tr><th scope="row"><a href="#/teraz/${x.id}">${c.icon} ${esc(T(c.name))}</a></th><td><span class="badge risk-${x.score}">${esc(t('risk.l' + x.score))}</span></td><td class="muted">${x.reasons.map((k) => esc(t('reason.' + k))).join(', ')}</td></tr>`; }).join('')}
</tbody></table></div>
</section>
<section>
<h2>${esc(t('plan.tasks'))}</h2>
${CATS.map((cat) => {
  const items = tasks.filter((x) => x.cat === cat);
  if (!items.length) return '';
  return `<h3>${esc(t('cat.' + cat))}</h3><ul class="checklist app-tasks">${items.map((x) => {
    const on = x.auto || store.state.tasksDone[x.id];
    return `<li class="${on ? 'done' : ''} prio-${x.prio}"><button type="button" class="cbx" data-task="${x.id}" aria-pressed="${!!on}" ${x.auto ? 'disabled' : ''} aria-label="${esc(x.text)}">${on ? '☑' : '☐'}</button><span class="ttext">${esc(x.text)}</span>${taskLink(x)}</li>`;
  }).join('')}</ul>`;
}).join('')}
</section>
<div class="btn-row"><button class="btn btn-ghost" data-ics>🗓️ ${esc(t('plan.ics'))}</button><a class="btn btn-ghost" href="#/tlac">🖨️ ${esc(t('nav.print'))}</a></div>
</div>`;
  };
  draw();
  el.addEventListener('click', (e) => {
    const b = e.target.closest('[data-task]');
    if (b) {
      const id = b.dataset.task;
      store.state.tasksDone[id] = !store.state.tasksDone[id];
      store.saveState();
      draw();
    }
    if (e.target.closest('[data-ics]')) {
      const tasks = buildTasks(p).filter((x) => !(x.auto || store.state.tasksDone[x.id]));
      const now = Date.now();
      const items = tasks.slice(0, 12).map((x, i) => ({ date: now + (7 + i * 7) * 86400000, text: x.text }));
      items.push({ date: now + 182 * 86400000, text: t('task.review') });
      download('krizova-priprava.ics', icsReminders(items, t('plan.title')), 'text/calendar');
    }
  });
}
