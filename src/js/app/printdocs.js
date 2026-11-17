// Tlačové dokumenty aplikácie (A4, čiernobielo, políčka na odškrtnutie).
import { store } from './store.js';
import { t, tp, T, esc, money, fmtDate, fmtDuration, $, LANG, LOCALE } from './core.js';
import { riskProfile, purchaseSchedule } from '../calc.js';
import { crisisById, ACTIONS } from '../../data/crises.js';
import { itemById, CATEGORIES } from '../../data/items.js';
import { buildTasks } from './tasks.js';
import { computeList } from './views/supplies.js';
import { bagLists } from './views/bags.js';
import { energyLines, SCENARIOS } from './views/energy.js';

const box = '☐';
const line = (label, value) => `<div class="pfield"><span class="pl">${esc(label)}</span><span class="pv">${esc(value || '')}</span></div>`;
const memberName = (m, i) => m.name || t('mem.person', { n: i + 1 });

const DOCS = {
  plan() {
    const p = store.profile;
    const risk = riskProfile(p);
    const tasks = buildTasks(p);
    return `<h1>${esc(t('plan.title'))}</h1><h2>${esc(t('plan.risks'))}</h2>
<table class="data"><tbody>${risk.list.map((x) => { const c = crisisById(x.id); return `<tr><th>${c.icon} ${esc(T(c.name))}</th><td>${esc(t('risk.l' + x.score))}</td><td>${x.reasons.map((k) => esc(t('reason.' + k))).join(', ')}</td></tr>`; }).join('')}</tbody></table>
<h2>${esc(t('plan.tasks'))}</h2><ul class="checklist">${tasks.map((x) => `<li><span class="cb">${x.auto || store.state.tasksDone[x.id] ? '☑' : box}</span> ${esc(x.text)}</li>`).join('')}</ul>`;
  },
  family() {
    const p = store.profile, f = p.family;
    return `<h1>${esc(t('fam.title'))}</h1>
<h2>${esc(t('fam.meet'))}</h2>${line(t('fam.meet1'), f.meet1)}${line(t('fam.meet2'), [f.meet2, f.meet2time].filter(Boolean).join(' – '))}${line(t('fam.meet3'), f.meet3)}
${line(t('fam.out'), [f.outName, f.outPhone].filter(Boolean).join(', '))}
${line(t('map.myShelter'), [p.shelter.address, f.homeShelter].filter(Boolean).join(' / '))}${line(t('fam.assembly'), f.assembly)}${line(t('fam.valves'), f.valves)}
${line(t('mob.dest'), (p.mobility.destinations || []).map((d) => d.name).join('; '))}
<h2>${esc(t('wiz.s2'))}</h2><table class="data"><thead><tr><th>${esc(t('fam.name'))}</th><th>${esc(t('mem.age'))}</th><th>${esc(t('mem.conditions'))} / ${esc(t('mem.allergies'))}</th><th>${esc(t('mem.meds'))}</th></tr></thead><tbody>
${p.members.map((m, i) => `<tr><td>${esc(memberName(m, i))}</td><td>${esc(m.age)}</td><td>${esc([m.conditions, m.allergies, m.powerDevice ? t('dev.' + m.powerDevice) : ''].filter(Boolean).join('; '))}</td><td>${esc((m.meds || []).join('; '))}</td></tr>`).join('')}</tbody></table>
<h2>${esc(t('fam.contacts'))}</h2><table class="data"><thead><tr><th>${esc(t('fam.role'))}</th><th>${esc(t('fam.name'))}</th><th>${esc(t('fam.phone'))}</th></tr></thead><tbody>
<tr><td>112 · 150 · 155 · 158</td><td colspan="2"></td></tr>
${(f.contacts || []).map((c) => `<tr><td>${esc(c.role)}</td><td>${esc(c.name)}</td><td>${esc(c.phone)}</td></tr>`).join('')}${'<tr><td>&nbsp;</td><td></td><td></td></tr>'.repeat(4)}</tbody></table>
<h2>${esc(t('fam.comms'))}</h2>${line(t('fam.radio'), f.radio)}${line(t('fam.pmr'), f.pmr)}${line(t('fam.checkin'), f.checkin)}
<h2>${esc(t('fam.kids'))}</h2>${line(t('fam.school'), f.school)}${line(t('fam.pickup'), f.pickup)}
${f.notes ? `<h2>${esc(t('fam.notes'))}</h2><p>${esc(f.notes)}</p>` : ''}`;
  },
  wallet() {
    const p = store.profile, f = p.family;
    const card = (m, i) => `<div class="wallet"><div class="wallet-side"><p class="wallet-title">${esc(t('pr.walletTitle'))}</p>
${line(t('fam.name'), memberName(m, i))}${line(t('mem.conditions'), [m.conditions, m.allergies].filter(Boolean).join('; '))}${line(t('mem.meds'), (m.meds || []).join('; '))}${line(t('fam.out'), [f.outName, f.outPhone].filter(Boolean).join(' '))}</div>
<div class="wallet-side">${line(t('fam.meet2'), [f.meet2, f.meet2time].filter(Boolean).join(' '))}${line(t('fam.meet3'), f.meet3)}${line(t('map.myShelter'), p.shelter.address || f.homeShelter)}<p class="wallet-nums">112 · 150 · 155 · 158</p></div></div>`;
    return `<h1>${esc(t('pr.wallet'))}</h1><div class="wallet-sheet">${p.members.map(card).join('')}</div>`;
  },
  help() {
    const p = store.profile, f = p.family;
    const who = p.members.filter((m) => m.conditions || m.powerDevice || (m.meds || []).length || ['limited', 'wheelchair', 'bedridden'].includes(m.mobility) || Number(m.age) < 12 || Number(m.age) >= 70);
    const list = who.length ? who : p.members;
    return `<h1>${esc(t('pr.help'))}</h1>${list.map((m) => `<div class="helpcard avoid-break"><p class="helpcard-title">${esc(t('pr.helpTitle'))}</p>
${line(t('fam.name'), memberName(m, p.members.indexOf(m)))}${line(t('mem.conditions'), m.conditions)}${line(t('mem.allergies'), m.allergies)}${line(t('mem.meds'), (m.meds || []).join('; '))}
${line(t('mem.mobility'), t('mob.' + (m.mobility || 'full')))}${m.powerDevice ? line(t('mem.device'), t('dev.' + m.powerDevice)) : ''}${line(t('fam.out'), [f.outName, f.outPhone].filter(Boolean).join(' '))}</div>`).join('')}`;
  },
  cards() {
    const risk = riskProfile(store.profile);
    const ids = [...risk.list.filter((x) => x.score >= 3).map((x) => x.id), ...ACTIONS.map((a) => a.id)];
    return ids.map((id, i) => (i ? '<div class="page-break"></div>' : '') + cardHtml(id)).join('');
  },
  shopping(opts) {
    const days = opts.days || store.profile.supplies.targetDays || 7;
    const list = computeList(store.profile, days);
    const cats = CATEGORIES.filter((c) => list.rows.some((r) => r.cat === c.id));
    return `<h1>${esc(t('pr.shopping'))} – ${esc(tp('c.days', days))}</h1>
<p>${esc(t('sup.water', { l: list.need.waterTotal, d: list.need.waterPerDay }))} · ${esc(t('sup.cash', { eur: money(list.cashSuggested) }))}</p>
${cats.map((c) => `<h3>${c.icon} ${esc(T(c.name))}</h3><table class="data"><tbody>${list.rows.filter((r) => r.cat === c.id).map((r) => `<tr><td class="cbcell">${r.buy === 0 ? '☑' : box}</td><th>${esc(T(itemById(r.id).name))}</th><td class="num">${r.buy} / ${r.qty}</td><td class="num">${r.price ? money(r.buyCost) : ''}</td></tr>`).join('')}</tbody></table>`).join('')}
<p><strong>${esc(t('sup.toBuy'))}: ${money(list.rows.reduce((s, r) => s + r.buyCost, 0))}</strong></p>`;
  },
  purchase(opts) {
    const days = opts.days || store.profile.supplies.targetDays || 7;
    const list = computeList(store.profile, days);
    const s = purchaseSchedule(list.rows.map((r) => ({ ...r, qty: r.buy, cost: r.buyCost })).filter((r) => r.qty > 0), store.profile.supplies.budgetMonthly || 60);
    return `<h1>${esc(t('pr.purchase'))}</h1><p>${esc(t('sup.weekly', { eur: money(s.weekly), n: s.weeks.length }))}</p>
<table class="data"><tbody>${s.weeks.map((w, i) => `<tr><td class="cbcell">${box}</td><th>${esc(t('sup.week', { n: i + 1 }))}</th><td>${w.items.map((x) => `${x.qty}× ${esc(T(itemById(x.id).name))}`).join('; ')}</td><td class="num">${money(w.cost)}</td></tr>`).join('')}</tbody></table>`;
  },
  rotation() {
    const inv = [...store.state.inventory].sort((a, b) => (a.expiry || '9').localeCompare(b.expiry || '9'));
    return `<h1>${esc(t('pr.rotation'))}</h1><table class="data form-table"><thead><tr><th>${esc(t('rot.item'))}</th><th>${esc(t('rot.qty'))}</th><th>${esc(t('rot.bought'))}</th><th>${esc(t('rot.expiry'))}</th><th>${esc(t('rot.where'))}</th></tr></thead><tbody>
${inv.map((x) => `<tr><td>${esc(x.name)}</td><td>${x.qty}</td><td>${fmtDate(x.bought)}</td><td>${fmtDate(x.expiry)}</td><td>${esc(x.where || '')}</td></tr>`).join('')}${'<tr><td>&nbsp;</td><td></td><td></td><td></td><td></td></tr>'.repeat(Math.max(8, 22 - inv.length))}</tbody></table>`;
  },
  bags() {
    return `<h1>${esc(t('pr.bags'))}</h1>` + bagLists(store.profile).map((l) => {
      const st = store.state.checks[l.key] || [];
      return `<div class="checklist-block avoid-break"><p class="checklist-title">${l.icon} ${esc(l.title)}</p><ul class="checklist">${l.items.map((x, i) => `<li><span class="cb">${st[i] ? '☑' : box}</span> ${esc(x)}</li>`).join('')}</ul></div>`;
    }).join('');
  },
  energy(opts) {
    const days = opts.days || 7;
    return `<h1>${esc(t('pr.energy'))} – ${esc(tp('c.days', days))}</h1>` + SCENARIOS.map((s) => `<div class="avoid-break"><h2>${esc(t('scen.' + s))}</h2><ul class="checklist">${energyLines(store.profile, s, days).map(([i, x]) => `<li><span class="cb">${box}</span> ${esc(x)}</li>`).join('')}</ul></div>`).join('');
  },
  routes() {
    const p = store.profile;
    const rs = p.routes || [];
    if (!rs.length) return `<h1>${esc(t('pr.routes'))}</h1><p>${esc(t('rt.needData'))}</p>`;
    const byDest = {};
    for (const r of rs) (byDest[r.dest] ||= []).push(r);
    return Object.entries(byDest).map(([dest, list], i) => `${i ? '<div class="page-break"></div>' : ''}<h1>${esc(t('pr.routes'))}: ${esc(dest)}</h1>
${routeSvg(p, list)}
<table class="data"><thead><tr><th>#</th><th>${esc(t('rt.modes'))}</th><th>km</th><th>⏱</th><th>${esc(t('rt.risks'))}</th></tr></thead><tbody>
${list.map((r, k) => `<tr><th>${String.fromCharCode(65 + k)}</th><td>${esc(t('mode.' + r.mode))} – ${esc(t('rt.' + r.kind))}${r.via ? `<br><small>${esc(t('rt.via', { roads: r.via }))}</small>` : ''}</td><td class="num">${(r.distance / 1000).toFixed(1)}</td><td class="num">${fmtDuration(r.duration)}</td><td>${esc(riskText(r))}</td></tr>`).join('')}</tbody></table>
${list.map((r, k) => `<div class="avoid-break"><h3>${String.fromCharCode(65 + k)} – ${esc(t('rt.steps'))}</h3><ol class="steps-small">${(r.steps || []).map((s) => `<li>${esc(s)}</li>`).join('')}</ol></div>`).join('')}
<p class="small">${esc(t('rt.note'))}</p>`).join('');
  },
};

export function riskText(r) {
  const k = r.risks;
  if (!k) return t('rt.riskUnknown');
  const parts = [];
  if (k.bridges) parts.push(t('rt.bridges', { n: k.bridges }));
  if (k.rivers?.length) parts.push(t('rt.rivers', { names: k.rivers.join(', ') }));
  if (k.tunnels) parts.push(t('rt.tunnels', { n: k.tunnels }));
  if (k.ferry) parts.push(t('rt.ferry'));
  if (k.npp) parts.push(t('rt.npp', { name: k.npp }));
  if (k.error) parts.push(t('rt.riskUnknown'));
  return parts.join(' · ') || t('rt.noRisk');
}

// Schematická mapa trás v SVG (tlačiteľná bez dlaždíc a internetu)
export function routeSvg(p, list, w = 680, h = 420) {
  const pts = list.flatMap((r) => r.geometry || []);
  const home = p.location;
  if (home?.lat != null) pts.push([home.lat, home.lon]);
  if (!pts.length) return '';
  let minLat = Infinity, maxLat = -Infinity, minLon = Infinity, maxLon = -Infinity;
  for (const [la, lo] of pts) { minLat = Math.min(minLat, la); maxLat = Math.max(maxLat, la); minLon = Math.min(minLon, lo); maxLon = Math.max(maxLon, lo); }
  const k = Math.cos(((minLat + maxLat) / 2) * Math.PI / 180);
  const spanX = Math.max((maxLon - minLon) * k, 1e-4), spanY = Math.max(maxLat - minLat, 1e-4);
  const s = Math.min((w - 40) / spanX, (h - 40) / spanY);
  const X = (lo) => 20 + (lo - minLon) * k * s + ((w - 40) - spanX * s) / 2;
  const Y = (la) => h - 20 - (la - minLat) * s - ((h - 40) - spanY * s) / 2;
  const dashes = ['', '10 6', '3 5', '14 4 3 4'];
  const lines = list.map((r, i) => `<polyline points="${(r.geometry || []).map(([la, lo]) => `${X(lo).toFixed(1)},${Y(la).toFixed(1)}`).join(' ')}" fill="none" stroke="#000" stroke-width="${i ? 2.5 : 4}" stroke-dasharray="${dashes[i % 4]}" stroke-linejoin="round"/>`).join('');
  const labels = list.map((r, i) => { const g = r.geometry || []; const m = g[Math.floor(g.length * (0.3 + i * 0.15))] || g[0]; return m ? `<g><circle cx="${X(m[1])}" cy="${Y(m[0])}" r="10" fill="#fff" stroke="#000"/><text x="${X(m[1])}" y="${Y(m[0]) + 4}" text-anchor="middle" font-size="12" font-weight="700">${String.fromCharCode(65 + i)}</text></g>` : ''; }).join('');
  const end = list[0]?.geometry?.at(-1);
  return `<svg class="route-svg" viewBox="0 0 ${w} ${h}" width="100%" role="img" aria-label="${esc(t('pr.routes'))}"><rect x="0" y="0" width="${w}" height="${h}" fill="#fff" stroke="#999"/>${lines}${labels}
${home?.lat != null ? `<g><rect x="${X(home.lon) - 7}" y="${Y(home.lat) - 7}" width="14" height="14" fill="#000"/><text x="${X(home.lon) + 10}" y="${Y(home.lat) - 8}" font-size="13" font-weight="700">${esc(t('rt.home'))}</text></g>` : ''}
${end ? `<g><circle cx="${X(end[1])}" cy="${Y(end[0])}" r="8" fill="#000"/><text x="${X(end[1]) + 10}" y="${Y(end[0]) - 8}" font-size="13" font-weight="700">🏁</text></g>` : ''}
<text x="${w - 10}" y="${h - 8}" text-anchor="end" font-size="10">N ↑ · © OpenStreetMap</text></svg>`;
}

export function cardHtml(id) {
  const c = crisisById(id);
  const steps = c.now || c.steps;
  return `<section class="stepcard"><div class="box urgent"><p class="box-title">${c.icon} ${esc(T(c.name))}</p><ol class="steps">${steps.map((s) => `<li>${esc(T(s))}</li>`).join('')}</ol></div>
${c.before ? `<h3>${esc(t('now.prepare'))}</h3><ul class="checklist">${c.before.map((s) => `<li><span class="cb">${box}</span> ${esc(T(s))}</li>`).join('')}</ul><h3>${esc(t('now.after'))}</h3><ul class="checklist">${c.after.map((s) => `<li><span class="cb">${box}</span> ${esc(T(s))}</li>`).join('')}</ul>` : ''}
<p><strong>112</strong> · 150 · 155 · 158</p></section>`;
}

function printRoot(html) {
  let root = $('#print-root');
  if (!root) { root = document.createElement('div'); root.id = 'print-root'; root.className = 'print-root'; }
  if (root.parentElement !== document.body) document.body.appendChild(root);
  document.body.classList.add('printing-docs');
  const done = () => { document.body.classList.remove('printing-docs'); root.innerHTML = ''; window.removeEventListener('afterprint', done); };
  window.addEventListener('afterprint', done);
  root.innerHTML = html;
  setTimeout(() => window.print(), 50);
}
const printDate = () => new Date().toLocaleDateString(LOCALE[LANG] || LANG);
export function printDocs(ids, opts = {}) {
  const date = printDate();
  printRoot(ids.map((id, i) => {
    const [name, arg] = id.split(':');
    const html = name === 'card' ? cardHtml(arg) : DOCS[name](opts);
    return `<section class="print-doc${i ? ' page-break' : ''}">${html}<p class="print-foot">${esc(t('pr.generated', { date }))}</p></section>`;
  }).join(''));
}
// Ľubovoľný obsah (kapitola knihy, prehľad) na tlač
export function printHtml(html) {
  printRoot(`<section class="print-doc">${html}<p class="print-foot">${esc(t('pr.generated', { date: printDate() }))}</p></section>`);
}
export const PRINTABLE = ['plan', 'family', 'wallet', 'help', 'cards', 'shopping', 'purchase', 'rotation', 'bags', 'energy', 'routes'];
