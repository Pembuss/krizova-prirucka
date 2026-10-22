// Energia a nevyhnutné potreby podľa scenárov.
import { store } from '../store.js';
import { t, tp, esc, bookHref } from '../core.js';
import { householdNeeds, energyPlan, DEVICE_WH } from '../../calc.js';
import { printDocs } from '../printdocs.js';

export const SCENARIOS = ['blackoutWinter', 'blackoutSummer', 'water', 'shelter', 'evac', 'quarantine', 'heat'];

export function energyLines(p, scen, days) {
  const P = Math.max(1, (p.members || []).length);
  const e = energyPlan(p, days);
  const n = householdNeeds(p, days);
  const u = p.utilities || {};
  const lines = [];
  const drink = Math.ceil(n.drinkTotal + n.petWaterTotal + (scen === 'heat' ? P * days : 0));
  if (scen === 'shelter') lines.push(['💧', t('en.waterShelter', { l: P * 6 * days })]);
  else {
    lines.push(['💧', t('en.water', { l: drink })]);
    if (['water', 'blackoutWinter', 'blackoutSummer', 'quarantine', 'heat'].includes(scen)) lines.push(['🚿', t('en.waterHyg', { l: n.hygieneTotal || P * days })]);
  }
  if (['blackoutWinter', 'blackoutSummer', 'shelter', 'evac', 'water'].includes(scen)) {
    lines.push(['🔦', t('en.light', { n: Math.max(1, (p.members || []).filter((m) => Number(m.age) >= 5).length) })]);
    lines.push(['🔋', t('en.batt', { aaa: e.aaa, aa: e.aa })]);
    lines.push(['📱', t('en.phones', { n: e.phones, wh: e.phoneWh, pb: e.powerbanks })]);
    lines.push(['📻', t('en.radio')]);
  }
  if (scen === 'shelter') lines.push(['🍽️', t('en.noCookOnly')], ['🪟', t('en.sealing')]);
  else if (['blackoutWinter', 'blackoutSummer', 'water'].includes(scen) && !u.altCooking && u.cooking !== 'gas') lines.push(['🔥', t('en.gas', { n: e.gasCartridges })]);
  if (scen.startsWith('blackout')) lines.push(['🧊', t('en.fridge')]);
  if (scen === 'blackoutWinter') {
    const dep = !(u.heating === 'wood' || u.altHeating);
    lines.push(['🧣', t('en.heatAdvice', { advice: dep ? t('heatadv.dep', { n: P }) : t('heatadv.wood') })]);
  }
  if (['water', 'shelter', 'blackoutWinter'].includes(scen)) lines.push(['🚽', t('en.toilet', { bags: Math.max(10, P * days), abs: Math.ceil(P * days * 0.5) })]);
  if (scen === 'heat') lines.push(['🌡️', t('en.cool')]);
  if (scen === 'quarantine') lines.push(['😷', t('en.ffp2', { n: P * 2 * days })]);
  if (scen === 'evac') lines.push(['🎒', t('en.bag')]);
  if (scen.startsWith('blackout') || scen === 'shelter') {
    for (const m of (p.members || []).filter((x) => x.powerDevice)) {
      const wh = (DEVICE_WH[m.powerDevice] || 300) * days;
      lines.push(['⚕️', t('en.device', { device: `${m.name || ''} – ${t('dev.' + m.powerDevice)}`, wh, d: days, cap: Math.ceil((wh * 1.25) / 100) * 100 })]);
    }
  }
  return lines;
}

export function render(el) {
  const p = store.profile;
  let scen = 'blackoutWinter', days = Math.min(Number(p.supplies.targetDays) || 7, 14);
  const draw = () => {
    const lines = energyLines(p, scen, days);
    el.innerHTML = `<div class="wrap narrow">
<h1>${esc(t('en.title'))}</h1><p class="lead">${esc(t('en.lead'))}</p>
<div class="chips" role="group">${SCENARIOS.map((s) => `<button type="button" class="chip" data-scen="${s}" aria-pressed="${s === scen}">${esc(t('scen.' + s))}</button>`).join('')}</div>
<div class="chips" role="group">${[1, 3, 7, 14].map((d) => `<button type="button" class="chip" data-d="${d}" aria-pressed="${d === days}">${esc(tp('c.days', d))}</button>`).join('')}</div>
<ul class="needs-list">${lines.map(([i, s]) => `<li><span class="ico">${i}</span><span>${esc(s)}</span></li>`).join('')}</ul>
<div class="btn-row"><a class="btn btn-ghost" href="${bookHref('energie-scenare')}">📖 ${esc(t('now.details'))}</a><a class="btn btn-ghost" href="${bookHref('sebestacnost')}">📖 ${esc(t('nav.book'))}: ${esc(t('nav.energy'))}</a><button class="btn" data-print>🖨️ ${esc(t('pr.energy'))}</button></div>
</div>`;
  };
  draw();
  el.addEventListener('click', (e) => {
    const s = e.target.closest('[data-scen]'); if (s) { scen = s.dataset.scen; draw(); }
    const d = e.target.closest('[data-d]'); if (d) { days = Number(d.dataset.d); draw(); }
    if (e.target.closest('[data-print]')) printDocs(['energy'], { days });
  });
}
