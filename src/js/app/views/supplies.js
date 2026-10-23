// Zásoby: nákupný zoznam s cenami a „mám“, postupný nákup, obmena zásob.
import { store, uid, download } from '../store.js';
import { t, tp, T, esc, money, num, fmtDate, toast, $, $$ } from '../core.js';
import { shoppingList, purchaseSchedule } from '../../calc.js';
import { CATEGORIES, ITEMS, itemById } from '../../../data/items.js';
import { icsReminders } from '../tasks.js';
import { printDocs } from '../printdocs.js';

export function computeList(p, days) {
  const list = shoppingList(p, days, store.state.prices);
  for (const r of list.rows) {
    const have = Number(store.state.have[r.id] || 0);
    r.have = have;
    r.buy = Math.max(0, r.qty - have);
    r.buyCost = Math.round(r.buy * r.price * 100) / 100;
  }
  return list;
}

export function render(el, [tab = 'list']) {
  const p = store.profile;
  let days = Number(p.supplies.targetDays) || 7;

  const draw = () => {
    const list = computeList(p, days);
    const toBuy = list.rows.reduce((s, r) => s + r.buyCost, 0);
    const head = `<div class="wrap">
<h1>${esc(t('sup.title'))}</h1>
<div class="field-row"><span class="lbl">${esc(t('sup.forDays'))}</span><div class="chips">${[3, 7, 14, 30].map((d) => `<button type="button" class="chip" data-days="${d}" aria-pressed="${d === days}">${esc(tp('c.days', d))}</button>`).join('')}</div></div>
<div class="grid stats">
  <div class="stat"><span class="stat-ico">💧</span><span>${esc(t('sup.water', { l: list.need.waterTotal, d: list.need.waterPerDay }))}</span></div>
  <div class="stat"><span class="stat-ico">🍽️</span><span>${esc(t('sup.kcal', { kcal: num(list.food.kcalNeeded), kpd: num(list.need.kcalPerDay) }))}</span></div>
  <div class="stat"><span class="stat-ico">🔥</span><span>${esc(t('sup.noCook', { p: Math.round(list.food.noCookShare * 100) }))}</span></div>
  <div class="stat"><span class="stat-ico">💶</span><span>${esc(t('sup.cash', { eur: list.cashSuggested }))}</span></div>
</div>
<div class="tabs" role="tablist">${[['list', 'sup.tabList'], ['plan', 'sup.tabPlan'], ['rot', 'sup.tabRot']].map(([k, l]) => `<a role="tab" href="#/zasoby/${k}" aria-selected="${tab === k}">${esc(t(l))}</a>`).join('')}</div>`;
    let body = '';
    if (tab === 'list') {
      const section = (rows, title) => `<tbody><tr class="group"><th colspan="7">${esc(title)}</th></tr>${rows.map((r) => {
        const it = itemById(r.id);
        return `<tr class="${r.buy === 0 ? 'done' : ''}"><td>${CATEGORIES.find((c) => c.id === r.cat).icon}</td><th scope="row">${esc(T(it.name))}</th><td class="num">${r.qty}</td>
<td><input class="qty" type="number" min="0" inputmode="numeric" data-have="${r.id}" value="${r.have || ''}" aria-label="${esc(t('sup.have'))}"></td><td class="num"><strong>${r.buy}</strong></td>
<td><input class="price" type="number" min="0" step="0.01" inputmode="decimal" data-price="${r.id}" value="${r.price}" aria-label="${esc(t('sup.unit'))}"></td><td class="num">${money(r.buyCost)}</td></tr>`;
      }).join('')}</tbody>`;
      const cons = list.rows.filter((r) => !r.equip), eq = list.rows.filter((r) => r.equip);
      body = `<p class="muted small">${esc(t('sup.prices'))}</p>
<div class="table-wrap"><table class="data shop"><thead><tr><th></th><th>${esc(t('rot.item'))}</th><th>${esc(t('sup.need'))}</th><th>${esc(t('sup.have'))}</th><th>${esc(t('sup.buy'))}</th><th>${esc(t('sup.unit'))}</th><th>${esc(t('sup.cost'))}</th></tr></thead>
${section(cons, t('sup.consumables'))}${section(eq, t('sup.equipment'))}
<tfoot><tr><th colspan="6">${esc(t('sup.toBuy'))}</th><td class="num"><strong>${money(toBuy)}</strong></td></tr></tfoot></table></div>
<div class="btn-row"><button class="btn" data-print-list>🖨️ ${esc(t('pr.shopping'))}</button><button class="btn btn-ghost" data-reset-prices>↺ ${esc(t('sup.resetPrices'))}</button></div>`;
    } else if (tab === 'plan') {
      const rows = list.rows.map((r) => ({ ...r, qty: r.buy, cost: r.buyCost })).filter((r) => r.qty > 0);
      const s = purchaseSchedule(rows, p.supplies.budgetMonthly || 60);
      body = `<label class="field-row"><span class="lbl">${esc(t('sup.budget'))}</span><input type="number" min="0" step="10" data-budget value="${p.supplies.budgetMonthly || 60}"></label>
<p><strong>${esc(t('sup.weekly', { eur: num(s.weekly, 2), n: s.weeks.length }))}</strong></p>
<ol class="weeks">${s.weeks.map((w, i) => `<li><div class="week-h"><strong>${esc(t('sup.week', { n: i + 1 }))}</strong><span>${money(w.cost)}</span></div><ul>${w.items.map((x) => `<li>${x.qty}× ${esc(T(itemById(x.id).name))}</li>`).join('')}</ul></li>`).join('')}</ol>
<div class="btn-row"><button class="btn" data-print-plan>🖨️ ${esc(t('pr.purchase'))}</button></div>`;
    } else {
      const inv = [...store.state.inventory].sort((a, b) => (a.expiry || '9999').localeCompare(b.expiry || '9999'));
      const today = new Date().toISOString().slice(0, 10);
      const soon = new Date(Date.now() + 60 * 86400000).toISOString().slice(0, 10);
      body = `<form class="rot-form form-grid" onsubmit="return false">
<label class="field-row"><span class="lbl">${esc(t('rot.item'))}</span><select id="rot-item"><option value="">${esc(t('rot.custom'))}</option>${ITEMS.filter((i) => i.shelf).map((i) => `<option value="${i.id}">${esc(T(i.name))}</option>`).join('')}</select><input id="rot-custom" type="text" placeholder="${esc(t('rot.custom'))}"></label>
<div class="two"><label class="field-row"><span class="lbl">${esc(t('rot.qty'))}</span><input id="rot-qty" type="number" min="1" value="1"></label>
<label class="field-row"><span class="lbl">${esc(t('rot.bought'))}</span><input id="rot-bought" type="date" value="${today}"></label></div>
<div class="two"><label class="field-row"><span class="lbl">${esc(t('rot.expiry'))}</span><input id="rot-exp" type="date"></label>
<label class="field-row"><span class="lbl">${esc(t('rot.where'))}</span><input id="rot-where" type="text"></label></div>
<button class="btn" type="button" data-rot-add>＋ ${esc(t('rot.add'))}</button></form>
${inv.length ? `<div class="table-wrap"><table class="data"><thead><tr><th>${esc(t('rot.item'))}</th><th>${esc(t('rot.qty'))}</th><th>${esc(t('rot.bought'))}</th><th>${esc(t('rot.expiry'))}</th><th>${esc(t('rot.where'))}</th><th></th></tr></thead><tbody>
${inv.map((x) => { const st = x.expiry && x.expiry < today ? 'expired' : x.expiry && x.expiry < soon ? 'soon' : ''; return `<tr class="${st}"><th scope="row">${esc(x.name)}</th><td>${x.qty}</td><td>${fmtDate(x.bought)}</td><td>${fmtDate(x.expiry)} ${st ? `<span class="badge ${st === 'expired' ? 'risk-5' : 'risk-4'}">${esc(t('rot.' + st))}</span>` : ''}</td><td>${esc(x.where || '')}</td><td><button class="btn btn-ghost btn-sm" data-rot-del="${x.id}">✕</button></td></tr>`; }).join('')}
</tbody></table></div>` : `<p class="muted">${esc(t('rot.empty'))}</p>`}
<div class="btn-row"><button class="btn btn-ghost" data-rot-ics ${inv.length ? '' : 'disabled'}>🗓️ ${esc(t('rot.ics'))}</button><button class="btn" data-print-rot>🖨️ ${esc(t('pr.rotation'))}</button></div>`;
    }
    el.innerHTML = head + body + '</div>';
  };
  draw();

  el.addEventListener('click', (e) => {
    const d = e.target.closest('[data-days]');
    if (d) { days = Number(d.dataset.days); draw(); }
    if (e.target.closest('[data-reset-prices]')) { store.state.prices = {}; store.saveState(); draw(); }
    if (e.target.closest('[data-print-list]')) printDocs(['shopping'], { days });
    if (e.target.closest('[data-print-plan]')) printDocs(['purchase'], { days });
    if (e.target.closest('[data-print-rot]')) printDocs(['rotation']);
    if (e.target.closest('[data-rot-add]')) {
      const id = $('#rot-item').value;
      const it = id ? itemById(id) : null;
      const name = it ? T(it.name) : $('#rot-custom').value.trim();
      if (!name) { toast(t('rot.needName'), 3500); $('#rot-custom').focus(); return; }
      const bought = $('#rot-bought').value || new Date().toISOString().slice(0, 10);
      let expiry = $('#rot-exp').value;
      if (!expiry && it?.shelf) { const dt = new Date(bought); dt.setMonth(dt.getMonth() + it.shelf); expiry = dt.toISOString().slice(0, 10); }
      store.state.inventory.push({ id: uid(), item: id, name, qty: Number($('#rot-qty').value) || 1, bought, expiry, where: $('#rot-where').value.trim() });
      store.saveState(); draw();
    }
    const del = e.target.closest('[data-rot-del]');
    if (del) { store.state.inventory = store.state.inventory.filter((x) => x.id !== del.dataset.rotDel); store.saveState(); draw(); }
    if (e.target.closest('[data-rot-ics]')) {
      const items = store.state.inventory.filter((x) => x.expiry).map((x) => ({ date: new Date(new Date(x.expiry).getTime() - 30 * 86400000), text: `${x.name} (${fmtDate(x.expiry)})` }));
      download('obmena-zasob.ics', icsReminders(items, t('sup.tabRot')), 'text/calendar');
    }
  });
  el.addEventListener('change', (e) => {
    const h = e.target.closest('[data-have]');
    if (h) { store.state.have[h.dataset.have] = Number(h.value) || 0; store.saveState(); draw(); }
    const pr = e.target.closest('[data-price]');
    if (pr) { store.state.prices[pr.dataset.price] = Math.max(0, Number(String(pr.value).replace(',', '.')) || 0); store.saveState(); draw(); }
    const b = e.target.closest('[data-budget]');
    if (b) { p.supplies.budgetMonthly = Number(b.value) || 0; store.saveProfile(); draw(); }
    // Obmena: po výbere položky netreba vlastný názov a dátum spotreby sa doplní podľa trvanlivosti
    if (e.target.matches('#rot-item, #rot-bought')) {
      const it = $('#rot-item').value ? itemById($('#rot-item').value) : null;
      $('#rot-custom').hidden = !!it;
      if (it?.shelf) { const dt = new Date($('#rot-bought').value || Date.now()); dt.setMonth(dt.getMonth() + it.shelf); $('#rot-exp').value = dt.toISOString().slice(0, 10); }
    }
  });
}
