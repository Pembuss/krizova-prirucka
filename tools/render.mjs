// Vykresľovanie zástupných blokov {{...}} v kapitolách do HTML.
import { CRISES, ACTIONS, crisisById } from '../src/data/crises.js';
import { CHECKLISTS, checklistById } from '../src/data/checklists.js';
import { CHAPTERS, PATHS, SITUATIONS, chapterById } from '../src/data/book.js';
import { COUNTRIES } from '../src/data/countries.js';
import { SOURCES, CRITERIA, avgScore } from '../src/data/sources.js';
import { CATEGORIES, FOOD_GROUPS, itemById } from '../src/data/items.js';
import { shoppingList, purchaseSchedule, energyPlan, householdNeeds } from '../src/js/calc.js';
import { UI, t } from '../src/data/ui.js';
import { SCENARIOS, scenarioForCrisis } from '../src/data/scenarios.js';
import { READER_TAGS } from '../src/data/reader.js';
import { CURRENCY } from '../src/data/currency.js';

const L = (sk, cs, en) => ({ sk, cs, en });
export const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
// ceny v eurách; PL a HU v miestnej mene prepočtom (src/data/currency.js)
const money = (x, lang) => {
  const c = CURRENCY[lang] || CURRENCY.sk;
  return new Intl.NumberFormat({ en: 'en-IE', cs: 'cs-CZ', pl: 'pl-PL', hu: 'hu-HU' }[lang] || 'sk-SK', { style: 'currency', currency: c.code, maximumFractionDigits: c.code === 'HUF' ? 0 : 2 }).format(x * c.rate);
};

export const PRESETS = {
  single: { members: [{ age: 35 }], utilities: { cooking: 'gas', heating: 'gas' }, supplies: { waterNorm: 'nordic' } },
  family4: { members: [{ age: 38, sex: 'm' }, { age: 36, sex: 'f' }, { age: 9 }, { age: 4 }], utilities: { cooking: 'gas', heating: 'gas' }, housing: { type: 'flat' }, supplies: { waterNorm: 'nordic' } },
  seniors: { members: [{ age: 72, sex: 'm' }, { age: 70, sex: 'f' }], utilities: { cooking: 'gas', heating: 'gas' }, supplies: { waterNorm: 'nordic' } },
};
const PRESET_NAMES = {
  single: L('1 dospelý', '1 dospělý', '1 adult'),
  family4: L('rodina 2 + 2', 'rodina 2 + 2', 'family 2 + 2'),
  seniors: L('2 seniori', '2 senioři', '2 older adults'),
};

// Číslovanie kapitol: rozcestník bez čísla, časti I–IV 1…n, prílohy A, B, C.
export function chapterLabel(id, lang) {
  const ch = chapterById(id);
  if (!ch || ch.part === 'p0') return '';
  if (ch.part === 'p5') {
    const idx = CHAPTERS.filter((c) => c.part === 'p5').findIndex((c) => c.id === id);
    const letter = String.fromCharCode(65 + idx);
    return lang === 'hu' ? `${letter} ${t(UI.appendix, lang).toLowerCase()}` : `${t(UI.appendix, lang)} ${letter}`;
  }
  const n = CHAPTERS.filter((c) => !['p0', 'p5'].includes(c.part)).findIndex((c) => c.id === id) + 1;
  // maďarčina: radová číslovka pred podstatným menom („2. fejezet“)
  return lang === 'hu' ? `${n}. ${t(UI.chapter, lang).toLowerCase()}` : `${t(UI.chapter, lang)} ${n}`;
}
const chLink = (id, lang) => `<a href="#${id}">${esc(t(chapterById(id).title, lang))}</a>`;

function box(cls, title, inner) {
  return `<div class="box ${cls}"><p class="box-title">${esc(title)}</p>${inner}</div>`;
}
const ol = (arr, lang) => `<ol class="steps">${arr.map((s) => `<li>${esc(t(s, lang))}</li>`).join('')}</ol>`;
const checkUl = (arr, lang) => `<ul class="checklist">${arr.map((s) => `<li><span class="cb" aria-hidden="true">☐</span> ${esc(t(s.t || s, lang))}</li>`).join('')}</ul>`;

// Ďalšie voľby podľa domácnosti na konci kapitol o krízach
const NEXT_TAGS = { all: ['kids', 'seniors', 'pets'], power: ['device'], move: ['car', 'nocar', 'care'] };
const CRISIS_GROUP = { flood: 'move', fire: 'move', chemical: 'move', nuclear: 'move', war: 'move', quake: 'move', blackout: 'power', cold: 'power', storm: 'power', heat: 'power', water: 'power' };
const TAG_TARGET = { kids: 'zranitelni-deti', seniors: 'zranitelni-seniori', pets: 'zranitelni-zvierata', device: 'vypadok-elektriny-pristroje', car: 'evakuacia-auto', nocar: 'evakuacia-pesi', care: 'evakuacia-pomoc' };

// Poradie odsekov scenára: začiatok prvý, koniec posledný, ostatné premiešané (pevne), aby ďalší odsek neprezradil výsledok.
export function scenarioOrder(s) {
  const start = s.nodes.find((n) => n.id === 'start');
  const end = s.nodes.filter((n) => n.end);
  const rest = s.nodes.filter((n) => n !== start && !n.end);
  let seed = [...s.id].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
  const rnd = () => { seed = (seed * 1103515245 + 12345) >>> 0; return seed / 2 ** 32; };
  for (let i = rest.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [rest[i], rest[j]] = [rest[j], rest[i]]; }
  return [start, ...rest, ...end];
}
// Čísla odsekov § naprieč všetkými scenármi
export function scenarioNumbers() {
  const m = new Map();
  let n = 0;
  for (const s of SCENARIOS) for (const node of scenarioOrder(s)) m.set(`${s.id}/${node.id}`, ++n);
  return m;
}

const R = {
  now(id, lang) {
    const c = crisisById(id);
    return box('urgent', `${t(UI.now, lang)} – ${t(c.name, lang)}`, ol(c.now, lang));
  },
  before(id, lang) { return checkUl(crisisById(id).before, lang); },
  after(id, lang) { return checkUl(crisisById(id).after, lang); },
  // Koniec kapitoly o kríze: voľby ďalšej cesty ako v knihe-hre (odkazy doplní build).
  next(id, lang) {
    const p = PATHS[id];
    const self = crisisById(id).chapter;
    const items = [];
    const add = (href, text, tag) => items.push(`<li><a href="#${href}"${tag ? ` class="if-${tag}"` : ''}>${esc(text)}</a></li>`);
    const pick = (k, n) => p[k].filter((x) => x !== self).slice(0, n);
    for (const x of pick('now', 2)) add(x, `⚡ ${t(UI.doNow, lang)}: ${t(chapterById(x).title, lang)}`);
    for (const x of pick('plan', 2)) add(x, `🗓️ ${t(UI.plan, lang)}: ${t(chapterById(x).title, lang)}`);
    for (const x of pick('know', 1)) add(x, `📘 ${t(UI.know, lang)}: ${t(chapterById(x).title, lang)}`);
    const sc = scenarioForCrisis(id);
    if (sc) add(`scenar-${sc.id}`, `🎲 ${t(UI.playStory, lang)}: ${t(sc.title, lang)}`);
    for (const tag of [...NEXT_TAGS.all, ...(NEXT_TAGS[CRISIS_GROUP[id]] || [])]) {
      const def = READER_TAGS.find((x) => x.id === tag);
      add(TAG_TARGET[tag], `${def.icon} ${t(def.name, lang)}`, tag);
    }
    return `<div class="choices next"><p><strong>${esc(t(UI.next, lang))}</strong> – ${esc(t(UI.nextQ, lang))}</p><ul>${items.join('')}</ul></div>`;
  },
  // Príbehové scenáre ako kniha-hra: číslované odseky, voľby „pokračuj na §N“.
  scenarios(_, lang) {
    const num = scenarioNumbers();
    return SCENARIOS.map((s) => {
      const sec = (id) => num.get(`${s.id}/${id}`);
      const nodes = scenarioOrder(s).map((node) => {
        const mark = node.verdict ? `<span class="gb-v ${node.verdict}">${node.verdict === 'good' ? '✔' : '✖'} ${esc(t(UI[node.verdict], lang))}.</span> ` : '';
        const tip = node.tip ? `<p class="gb-tip">💡 ${esc(t(node.tip.text, lang))} <a class="xref" href="#${node.tip.ref}"></a></p>` : '';
        const next = node.end
          ? `<p class="gb-end"><strong>${esc(t(UI.gbEnd, lang))}.</strong> ${esc(t(UI.gbScore, lang))}</p>`
          : `<ul class="gb-choices">${node.choices.map((c) => {
            const go = t(UI.gbGo, lang);
            const label = c.text ? `${esc(t(c.text, lang))} → ${esc(go)}` : esc(go.charAt(0).toUpperCase() + go.slice(1));
            return `<li><a href="#gb-${s.id}-${c.to}">${label} §${sec(c.to)}</a></li>`;
          }).join('')}</ul>`;
        return `<div class="gb-node${node.verdict ? ' ' + node.verdict : ''}${node.end ? ' end' : ''}" id="gb-${s.id}-${node.id}"><p class="gb-num">§${sec(node.id)}</p><p>${mark}${esc(t(node.text, lang))}</p>${tip}${next}</div>`;
      }).join('\n');
      return `<section class="scenario" data-scenario="${s.id}">
<h2 id="scenar-${s.id}">${s.icon} ${esc(t(s.title, lang))}</h2>
<p class="sc-setting">${esc(t(s.setting, lang))}</p>
<div class="sc-player no-print" data-player="${s.id}"></div>
<div class="gamebook" data-gamebook="${s.id}">
<p class="gb-start">📖 ${esc(t(UI.gbPaper, lang))}: ${esc(t(UI.gbStart, lang))} <a href="#gb-${s.id}-start">§${sec('start')}</a>.</p>
${nodes}
</div>
<div class="gb-prepare"><p><strong>${esc(t(UI.gbPrepare, lang))}</strong></p><ul class="checklist">${s.prepare.map((x) => `<li><span class="cb" aria-hidden="true">☐</span> ${esc(t(x, lang))}</li>`).join('')}</ul></div>
</section>`;
    }).join('\n');
  },
  action(id, lang) {
    const a = crisisById(id);
    return box('action', `${a.icon} ${t(a.name, lang)}`, ol(a.steps, lang));
  },
  actionsteps(id, lang) { return ol(crisisById(id).steps, lang); },
  checklist(id, lang) {
    const c = checklistById(id);
    if (!c) throw new Error('Unknown checklist ' + id);
    return `<div class="checklist-block" id="zoznam-${id}"><p class="checklist-title">${c.icon} ${esc(t(c.name, lang))}</p>${c.note ? `<p class="checklist-note">${esc(t(c.note, lang))}</p>` : ''}${checkUl(c.items, lang)}</div>`;
  },
  rozcestnik(_, lang) {
    const rows = CRISES.map((c) => {
      const p = PATHS[c.id];
      const cell = (ids) => ids.map((x) => chLink(x, lang)).join('<br>');
      return `<tr><th scope="row">${c.icon} ${esc(t(c.name, lang))}</th><td>${cell(p.now)}</td><td>${cell(p.plan)}</td><td>${cell(p.know)}</td></tr>`;
    }).join('');
    return `<table class="signpost"><thead><tr><th>${esc(t(UI.crisis, lang))}</th><th>${esc(t(UI.doNow, lang))}</th><th>${esc(t(UI.plan, lang))}</th><th>${esc(t(UI.know, lang))}</th></tr></thead><tbody>${rows}</tbody></table>`;
  },
  situations(_, lang) {
    return `<ul class="situations">${SITUATIONS.map((s) => `<li><strong>${s.icon} ${esc(t(s.name, lang))}</strong> → ${s.chapters.map((x) => chLink(x, lang)).join(', ')}</li>`).join('')}</ul>`;
  },
  waterTable(_, lang) {
    const head = L('Pitie a varenie (3 l/os./deň) + hygiena (1 l)', 'Pití a vaření (3 l/os./den) + hygiena (1 l)', 'Drinking and cooking (3 l/person/day) + hygiene (1 l)');
    const rows = [1, 2, 3, 4, 5, 6].map((n) => `<tr><th scope="row">${n} ${esc(t(n === 1 ? UI.person : UI.persons, lang))}</th>${[3, 7, 14, 30].map((d) => `<td>${n * 4 * d} l</td>`).join('')}</tr>`).join('');
    return `<table class="data"><caption>${esc(t(head, lang))}</caption><thead><tr><th></th>${[3, 7, 14, 30].map((d) => `<th>${d} ${esc(t(UI.days, lang))}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table>`;
  },
  foodTable(_, lang) {
    const perDay = { cereal: 0.33, legveg: 0.40, fruit: 0.25, dairy: 0.25, protein: 0.12, fat: 0.033, nuts: 0.05, sweet: 0.05 };
    const unit = (g) => (g === 'dairy' ? 'l/kg' : 'kg');
    const rows = Object.entries(perDay).map(([g, kg]) => `<tr><th scope="row">${esc(t(FOOD_GROUPS[g].name, lang))}</th>${[1, 3, 7, 14].map((d) => `<td>${(kg * d).toFixed(kg * d < 1 ? 2 : 1).replace('.', lang === 'en' ? '.' : ',')} ${unit(g)}</td>`).join('')}</tr>`).join('');
    const water = `<tr><th scope="row">${esc(t(UI.water, lang))}</th>${[1, 3, 7, 14].map((d) => `<td>${3 * d} l</td>`).join('')}</tr>`;
    const cap = L('Na 1 dospelého (približne 2 200 kcal/deň; podľa BBK/ernaehrungsvorsorge.de, upravené)', 'Na 1 dospělého (přibližně 2 200 kcal/den; podle BBK, upraveno)', 'Per adult (about 2,200 kcal/day; based on BBK, adapted)');
    return `<table class="data"><caption>${esc(t(cap, lang))}</caption><thead><tr><th></th>${[1, 3, 7, 14].map((d) => `<th>${d} ${esc(t(d === 1 ? UI.day : UI.days, lang))}</th>`).join('')}</tr></thead><tbody>${rows}${water}</tbody></table>`;
  },
  foodMatrix(preset, lang) {
    const prof = PRESETS[preset];
    const ds = [3, 7, 14, 30];
    const lists = ds.map((d) => shoppingList(prof, d));
    const ids = [];
    for (const l of lists) for (const r of l.rows) if ((r.cat === 'food' || r.id === 'water-pack') && !ids.includes(r.id)) ids.push(r.id);
    ids.sort((a, b) => (a === 'water-pack' ? -1 : b === 'water-pack' ? 1 : 0));
    const qtyOf = (l, id) => l.rows.find((r) => r.id === id)?.qty || '–';
    const rows = ids.map((id) => `<tr><th scope="row">${esc(t(itemById(id).name, lang))}</th>${lists.map((l) => `<td>${qtyOf(l, id)}</td>`).join('')}<td class="num">${money(itemById(id).price, lang)}</td></tr>`).join('');
    const totals = lists.map((l) => money(l.rows.filter((r) => r.cat === 'food' || r.id === 'water-pack').reduce((s, r) => s + r.cost, 0), lang));
    const kcal = lists.map((l) => l.food.kcalNeeded.toLocaleString(lang === 'en' ? 'en' : lang));
    const cap = `${t(PRESET_NAMES[preset], lang)} – ${t(L('počet balení', 'počet balení', 'number of packs'), lang)}`;
    return `<table class="data matrix"><caption>${esc(cap)}</caption><thead><tr><th>${esc(t(UI.item, lang))}</th>${ds.map((d) => `<th>${d} ${esc(t(UI.days, lang))}</th>`).join('')}<th>${esc(t(UI.price, lang))}</th></tr></thead><tbody>${rows}</tbody><tfoot><tr><th>kcal</th>${kcal.map((k) => `<td>${k}</td>`).join('')}<td></td></tr><tr><th>${esc(t(UI.total, lang))} (${esc(t(UI.orientation, lang))})</th>${totals.map((x) => `<td>${x}</td>`).join('')}<td></td></tr></tfoot></table>`;
  },
  equipment(arg, lang) {
    const [preset, days] = arg.split(':');
    const l = shoppingList(PRESETS[preset], Number(days));
    const rows = l.rows.filter((r) => r.cat !== 'food' && r.id !== 'water-pack');
    const part = (list, title) => {
      const body = list.map((r) => `<tr><td>${CATEGORIES.find((c) => c.id === r.cat).icon}</td><th scope="row">${esc(t(itemById(r.id).name, lang))}</th><td>${r.qty}</td><td class="num">${r.price ? money(r.cost, lang) : '–'}</td></tr>`).join('');
      const sum = list.reduce((s, r) => s + r.cost, 0);
      return `<tbody><tr class="group"><th colspan="4">${esc(t(title, lang))}</th></tr>${body}<tr class="subtotal"><th colspan="3">${esc(t(UI.total, lang))}</th><td class="num">${money(sum, lang)}</td></tr></tbody>`;
    };
    return `<table class="data"><thead><tr><th></th><th>${esc(t(UI.item, lang))}</th><th>${esc(t(UI.qty, lang))}</th><th>${esc(t(UI.price, lang))}</th></tr></thead>${part(rows.filter((r) => !r.equip), UI.consumables)}${part(rows.filter((r) => r.equip), UI.equipment)}</table>`;
  },
  budget(arg, lang) {
    const [preset, days, monthly] = arg.split(':');
    const l = shoppingList(PRESETS[preset], Number(days));
    const s = purchaseSchedule(l.rows, Number(monthly));
    const rows = s.weeks.map((w, i) => `<tr><th scope="row">${i + 1}.</th><td>${w.items.map((it) => `${it.qty}× ${esc(t(itemById(it.id).name, lang))}`).join('; ')}</td><td class="num">${money(w.cost, lang)}</td></tr>`).join('');
    return `<table class="data budget"><thead><tr><th>${esc(t(UI.week, lang))}</th><th>${esc(t(UI.item, lang))}</th><th>${esc(t(UI.price, lang))}</th></tr></thead><tbody>${rows}</tbody></table>`;
  },
  energyTable(_, lang) {
    const head = [L('Domácnosť', 'Domácnost', 'Household'), L('Dni', 'Dny', 'Days'), L('Mobily', 'Mobily', 'Phones'), L('Powerbanky 20 000 mAh', 'Powerbanky 20 000 mAh', 'Power banks 20,000 mAh'), L('Batérie AAA', 'Baterie AAA', 'AAA batteries'), L('Batérie AA', 'Baterie AA', 'AA batteries'), L('Kartuše 227 g', 'Kartuše 227 g', 'Gas cartridges 227 g')];
    const rows = [];
    for (const p of ['single', 'family4']) for (const d of [3, 7, 14]) {
      const e = energyPlan(PRESETS[p], d);
      rows.push(`<tr><th scope="row">${esc(t(PRESET_NAMES[p], lang))}</th><td>${d}</td><td>${e.phones}</td><td>${e.powerbanks}</td><td>${e.aaa}</td><td>${e.aa}</td><td>${e.gasCartridges}</td></tr>`);
    }
    return `<table class="data"><thead><tr>${head.map((h) => `<th>${esc(t(h, lang))}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table>`;
  },
  countries(_, lang) {
    return COUNTRIES.map((c) => {
      const n = c.numbers;
      const nums = [[UI.emergency, n.general], [UI.police, n.police], [UI.fire, n.fire], [UI.ambulance, n.ambulance]].filter(([, v]) => v).map(([k, v]) => `${esc(t(k, lang))}: <strong>${esc(v)}</strong>`).join(' · ');
      const maps = [...(c.maps || []).filter((m) => m.url), c.guide ? { label: c.guide.title, url: c.guide.url } : null, { label: c.authority.name, url: c.authority.url }]
        .filter(Boolean).filter((m, i, a) => a.findIndex((x) => x.url === m.url) === i)
        .map((m) => `<li><a href="${esc(m.url)}">${esc(t(m.label, lang))}</a></li>`).join('');
      return `<section class="country" id="krajina-${c.cc.toLowerCase()}"><h3>${c.flag} ${esc(t(c.name, lang))}</h3><dl>
<dt>${esc(t(UI.emergency, lang))}</dt><dd>${nums}${n.extra ? `<br>${esc(t(n.extra, lang))}` : ''}</dd>
${c.days ? `<dt>${esc(t(UI.selfSufficiency, lang))}</dt><dd>${esc(t(c.days, lang))}</dd>` : ''}
<dt>${esc(t(UI.warning, lang))}</dt><dd>${esc(t(c.warning, lang))}</dd>
<dt>${esc(t(UI.shelters, lang))}</dt><dd>${esc(t(c.shelters, lang))}</dd>
<dt>${esc(t(UI.officialMaps, lang))}</dt><dd><ul>${maps}</ul></dd></dl></section>`;
    }).join('\n');
  },
  numbers(_, lang) {
    const pick = ['SK', 'CZ', 'PL', 'HU', 'AT', 'DE', 'UA', 'SI', 'HR'];
    const rows = pick.map((cc) => COUNTRIES.find((c) => c.cc === cc)).map((c) => `<tr><th scope="row">${c.flag} ${esc(t(c.name, lang))}</th><td><strong>${esc(c.numbers.general)}</strong></td><td>${esc(c.numbers.police || '112')}</td><td>${esc(c.numbers.fire || '112')}</td><td>${esc(c.numbers.ambulance || '112')}</td><td>${c.numbers.extra ? esc(t(c.numbers.extra, lang)) : ''}</td></tr>`).join('');
    return `<table class="data"><thead><tr><th></th><th>${esc(t(UI.emergency, lang))}</th><th>${esc(t(UI.police, lang))}</th><th>${esc(t(UI.fire, lang))}</th><th>${esc(t(UI.ambulance, lang))}</th><th>${esc(t(UI.other, lang))}</th></tr></thead><tbody>${rows}</tbody></table>`;
  },
  sources(_, lang) {
    const head = `<tr><th>${esc(t(UI.guide, lang))}</th><th>${esc(t(UI.year, lang))}</th>${CRITERIA.map((c) => `<th>${esc(t(c.name, lang))}</th>`).join('')}<th>${esc(t(UI.average, lang))}</th></tr>`;
    const sorted = [...SOURCES].sort((a, b) => avgScore(b) - avgScore(a));
    const rows = sorted.map((s) => `<tr><th scope="row"><a href="#zdroj-${s.id}">${esc(s.title)}</a><br><small>${esc(s.org)}</small></th><td>${s.year}</td>${CRITERIA.map((c) => `<td class="score s${s.score[c.id]}">${s.score[c.id]}</td>`).join('')}<td class="score"><strong>${avgScore(s).toFixed(1)}</strong></td></tr>`).join('');
    const details = sorted.map((s) => `<section class="source" id="zdroj-${s.id}"><h3>${esc(s.title)}</h3><p class="meta">${esc(s.org)} · ${s.year} · ${esc(t(UI.languages, lang))}: ${esc(s.langs)}${s.days ? ` · ${esc(t(UI.selfSufficiency, lang))}: ${s.days} ${esc(t(UI.days, lang))}` : ''}</p><p>${esc(t(s.note, lang))}</p><p><strong>${esc(t(UI.whatWeUsed, lang))}:</strong> ${esc(t(s.used, lang))}</p><p><a href="${esc(s.url)}">${esc(s.url)}</a></p></section>`).join('\n');
    return `<table class="data sources"><thead>${head}</thead><tbody>${rows}</tbody></table>\n${details}`;
  },
  template(id, lang) { return TEMPLATES[id](lang); },
};

// Tlačové šablóny s prázdnymi riadkami na ručné vyplnenie.
const blankRows = (n, cols) => Array.from({ length: n }, () => `<tr>${'<td>&nbsp;</td>'.repeat(cols)}</tr>`).join('');
const field = (label) => `<div class="field"><span>${esc(label)}</span><span class="line"></span></div>`;
const TL = {
  household: L('Domácnosť (adresa)', 'Domácnost (adresa)', 'Household (address)'),
  members: L('Členovia domácnosti', 'Členové domácnosti', 'Household members'),
  birth: L('Dátum narodenia', 'Datum narození', 'Date of birth'),
  health: L('Zdravie, lieky, alergie', 'Zdraví, léky, alergie', 'Health, medicines, allergies'),
  meet1: L('Miesto stretnutia pri dome', 'Místo setkání u domu', 'Meeting point near home'),
  meet2: L('Miesto stretnutia v štvrti (a čas)', 'Místo setkání ve čtvrti (a čas)', 'Meeting point in the neighbourhood (and time)'),
  meet3: L('Miesto stretnutia mimo obce', 'Místo setkání mimo obec', 'Meeting point out of town'),
  outContact: L('Kontaktná osoba mimo oblasti', 'Kontaktní osoba mimo oblast', 'Out-of-area contact'),
  shelter: L('Náš úkryt (adresa)', 'Náš úkryt (adresa)', 'Our shelter (address)'),
  homeShelter: L('Improvizovaný úkryt doma (miestnosť)', 'Improvizovaný úkryt doma (místnost)', 'Improvised shelter at home (room)'),
  evac: L('Kam pri evakuácii (cieľ a trasy)', 'Kam při evakuaci (cíl a trasy)', 'Evacuation destination and routes'),
  assembly: L('Evakuačné zberné miesto obce', 'Evakuační místo obce', 'Municipal evacuation assembly point'),
  valves: L('Hlavný uzáver vody / plynu / istič – kde', 'Hlavní uzávěr vody / plynu / jistič – kde', 'Main water / gas valve / breaker – where'),
  roles: L('Úlohy: kto vyzdvihne deti, kto pomôže seniorom, kto vezme zvieratá', 'Úkoly: kdo vyzvedne děti, kdo pomůže seniorům, kdo vezme zvířata', 'Roles: who collects the children, helps older relatives, takes the pets'),
  radio: L('Frekvencia rádia / kanál PMR / časy zapnutia mobilu', 'Frekvence rádia / kanál PMR / časy zapnutí mobilu', 'Radio frequency / PMR channel / phone check-in times'),
  role: L('Vzťah / úloha', 'Vztah / úloha', 'Relation / role'),
  medicine: L('Liek a sila', 'Lék a síla', 'Medicine and strength'),
  dose: L('Dávkovanie', 'Dávkování', 'Dosage'),
  reason: L('Na čo', 'Na co', 'For'),
  doctor: L('Lekár / telefón', 'Lékař / telefon', 'Doctor / phone'),
  bought: L('Kúpené', 'Koupeno', 'Bought'),
  expiry: L('Spotrebovať do', 'Spotřebovat do', 'Use by'),
  where: L('Kde je uložené', 'Kde je uloženo', 'Stored where'),
  card: L('KRÍZOVÁ KARTIČKA', 'KRIZOVÁ KARTIČKA', 'EMERGENCY CARD'),
  help: L('POTREBUJEM POMOC', 'POTŘEBUJI POMOC', 'I NEED HELP'),
  communicate: L('Ako so mnou komunikovať', 'Jak se mnou komunikovat', 'How to communicate with me'),
  condition: L('Moje ochorenie / postihnutie', 'Moje onemocnění / postižení', 'My condition / disability'),
  contactsTitle: L('Dôležité kontakty', 'Důležité kontakty', 'Important contacts'),
};
const CONTACT_ROWS = [
  L('Kontaktná osoba mimo oblasti', 'Kontaktní osoba mimo oblast', 'Out-of-area contact'),
  L('Sused / susedka', 'Soused / sousedka', 'Neighbour'),
  L('Obvodný lekár / pediater', 'Praktický lékař / pediatr', 'GP / paediatrician'),
  L('Škola / škôlka', 'Škola / školka', 'School / nursery'),
  L('Zamestnávateľ', 'Zaměstnavatel', 'Employer'),
  L('Obecný úrad / krízový štáb', 'Obecní úřad / krizový štáb', 'Municipal office / crisis team'),
  L('Poruchová linka elektriny', 'Poruchová linka elektřiny', 'Electricity fault line'),
  L('Poruchová linka plynu', 'Poruchová linka plynu', 'Gas emergency line'),
  L('Vodárne', 'Vodárny', 'Water company'),
  L('Poisťovňa (č. zmluvy)', 'Pojišťovna (č. smlouvy)', 'Insurer (policy no.)'),
  L('Veterinár', 'Veterinář', 'Vet'),
];
export const TEMPLATES = {
  familyPlan: (lang) => `<div class="form">${[TL.household, TL.meet1, TL.meet2, TL.meet3, TL.outContact, TL.shelter, TL.homeShelter, TL.evac, TL.assembly, TL.valves, TL.radio].map((x) => field(t(x, lang))).join('')}
<table class="form-table"><caption>${esc(t(TL.members, lang))}</caption><thead><tr><th>${esc(t(UI.name, lang))}</th><th>${esc(t(TL.birth, lang))}</th><th>${esc(t(UI.phone, lang))}</th><th>${esc(t(TL.health, lang))}</th></tr></thead><tbody>${blankRows(6, 4)}</tbody></table>
${field(t(TL.roles, lang))}${field('')}${field('')}</div>`,
  contacts: (lang) => `<table class="form-table"><thead><tr><th>${esc(t(TL.role, lang))}</th><th>${esc(t(UI.name, lang))}</th><th>${esc(t(UI.phone, lang))}</th></tr></thead><tbody>
<tr><th>112 · 150 · 155 · 158</th><td colspan="2">${esc(t(UI.emergency, lang))}</td></tr>
${CONTACT_ROWS.map((r) => `<tr><th>${esc(t(r, lang))}</th><td>&nbsp;</td><td>&nbsp;</td></tr>`).join('')}${blankRows(4, 3)}</tbody></table>`,
  meds: (lang) => `<table class="form-table"><thead><tr><th>${esc(t(UI.name, lang))}</th><th>${esc(t(TL.medicine, lang))}</th><th>${esc(t(TL.dose, lang))}</th><th>${esc(t(TL.reason, lang))}</th><th>${esc(t(TL.doctor, lang))}</th></tr></thead><tbody>${blankRows(10, 5)}</tbody></table>`,
  rotation: (lang) => `<table class="form-table"><thead><tr><th>${esc(t(UI.item, lang))}</th><th>${esc(t(UI.qty, lang))}</th><th>${esc(t(TL.bought, lang))}</th><th>${esc(t(TL.expiry, lang))}</th><th>${esc(t(TL.where, lang))}</th></tr></thead><tbody>${blankRows(18, 5)}</tbody></table>`,
  walletCard: (lang) => {
    const one = `<div class="wallet"><div class="wallet-side"><p class="wallet-title">${esc(t(TL.card, lang))}</p>${field(t(UI.name, lang))}${field(t(TL.birth, lang))}${field(t(TL.health, lang))}${field(t(TL.outContact, lang))}</div><div class="wallet-side">${field(t(TL.meet2, lang))}${field(t(TL.meet3, lang))}${field(t(TL.shelter, lang))}<p class="wallet-nums">112 · 150 · 155 · 158</p></div></div>`;
    return `<div class="wallet-sheet">${one.repeat(3)}</div>`;
  },
  helpCard: (lang) => `<div class="helpcard"><p class="helpcard-title">${esc(t(TL.help, lang))}</p>${field(t(UI.name, lang))}${field(t(TL.condition, lang))}${field(t(TL.communicate, lang))}${field(t(TL.health, lang))}${field(t(TL.outContact, lang))}${field(t(TL.doctor, lang))}</div>`,
};

// Nahradí {{typ:arg}} v markdowne HTML blokmi (oddelenými prázdnymi riadkami pre pandoc).
export function expandPlaceholders(md, lang) {
  return md.replace(/\{\{(\w+)(?::([^}]+))?\}\}/g, (m, type, arg) => {
    const fn = R[type];
    if (!fn) throw new Error('Unknown placeholder ' + m);
    return '\n\n```{=html}\n' + fn(arg, lang) + '\n```\n\n';
  });
}
