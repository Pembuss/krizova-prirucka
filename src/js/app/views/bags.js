// Batohy a kontrolné zoznamy prispôsobené členom domácnosti.
import { store } from '../store.js';
import { t, T, esc } from '../core.js';
import { checklistById } from '../../../data/checklists.js';
import { printDocs } from '../printdocs.js';

// Zostaví zoznamy pre domácnosť: [{key, title, icon, items:[text]}]
export function bagLists(p) {
  const out = [];
  (p.members || []).forEach((m, i) => {
    const age = Number(m.age);
    const name = m.name || t('mem.person', { n: i + 1 });
    const base = age < 12 ? checklistById('goBagChild') : checklistById('goBagAdult');
    const items = base.items.map((x) => T(x.t));
    if (age >= 65 || ['limited', 'wheelchair', 'bedridden'].includes(m.mobility) || m.powerDevice || m.conditions) items.push(...checklistById('goBagSenior').items.map((x) => T(x.t)));
    if ((m.meds || []).length) items.unshift(t('bags.meds', { meds: m.meds.join('; ') }));
    if (m.allergies) items.unshift(t('bags.allergy', { a: m.allergies }));
    if (m.powerDevice) items.unshift(t('bags.device', { d: t('dev.' + m.powerDevice) }));
    out.push({ key: 'member-' + (m.id || i), title: t('bags.for', { name }), icon: age < 12 ? '🧒' : age >= 65 ? '🧓' : '🎒', items });
  });
  if ((p.pets || []).length) {
    const c = checklistById('goBagPet');
    out.push({ key: 'pets', title: `${T(c.name)} (${p.pets.map((x) => x.name || t('pet.' + x.type)).join(', ')})`, icon: c.icon, items: c.items.map((x) => T(x.t)) });
  }
  const ids = ['documents', 'firstAid', 'leaveHome', 'shelterBag', 'homeStock', 'communication'];
  if (p.mobility?.car && p.mobility.car !== 'none') ids.push('carKit');
  ids.push('blackoutKit', 'waterKit', 'winterKit', 'heatKit', 'review');
  for (const id of ids) {
    const c = checklistById(id);
    out.push({ key: id, title: T(c.name), icon: c.icon, note: c.note ? T(c.note) : '', items: c.items.map((x) => T(x.t)) });
  }
  return out;
}

export function render(el) {
  const p = store.profile;
  const draw = () => {
    const lists = bagLists(p);
    el.innerHTML = `<div class="wrap narrow">
<h1>${esc(t('bags.title'))}</h1>
<div class="btn-row"><button class="btn" data-print>🖨️ ${esc(t('pr.bags'))}</button></div>
${lists.map((l) => {
  const st = store.state.checks[l.key] || [];
  const n = st.filter(Boolean).length;
  return `<details class="listcard" ${l.key.startsWith('member') ? 'open' : ''}><summary><span>${l.icon} ${esc(l.title)}</span><span class="badge">${n}/${l.items.length}</span></summary>
${l.note ? `<p class="muted small">${esc(l.note)}</p>` : ''}
<ul class="checklist">${l.items.map((x, i) => `<li class="${st[i] ? 'done' : ''}"><button type="button" class="cbx" data-list="${l.key}" data-i="${i}" aria-pressed="${!!st[i]}">${st[i] ? '☑' : '☐'}</button><span>${esc(x)}</span></li>`).join('')}</ul>
<button class="btn btn-ghost btn-sm" data-reset="${l.key}">↺ ${esc(t('bags.reset'))}</button></details>`;
}).join('')}
</div>`;
  };
  draw();
  el.addEventListener('click', (e) => {
    const b = e.target.closest('[data-list]');
    if (b) {
      const arr = store.state.checks[b.dataset.list] || [];
      arr[Number(b.dataset.i)] = !arr[Number(b.dataset.i)];
      store.state.checks[b.dataset.list] = arr;
      store.saveState();
      const li = b.closest('li');
      li.classList.toggle('done', !!arr[Number(b.dataset.i)]);
      b.textContent = arr[Number(b.dataset.i)] ? '☑' : '☐';
      b.setAttribute('aria-pressed', String(!!arr[Number(b.dataset.i)]));
      const badge = b.closest('details').querySelector('summary .badge');
      badge.textContent = `${arr.filter(Boolean).length}/${b.closest('ul').children.length}`;
    }
    const r = e.target.closest('[data-reset]');
    if (r) { store.state.checks[r.dataset.reset] = []; store.saveState(); draw(); }
    if (e.target.closest('[data-print]')) printDocs(['bags']);
  });
}
