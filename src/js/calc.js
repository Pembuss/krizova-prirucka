// Výpočty zásob, nákupného zoznamu, rozpočtu a rizikového profilu.
// Čisté funkcie bez DOM – používa ich aplikácia aj build knihy.
import { ITEMS, FOOD_GROUPS, itemById } from '../data/items.js';
import { NPP } from '../data/npp.js';

export const WATER_NORMS = {
  nordic: 3.0, // DK, SE, NO, FEMA: ~3 l na pitie a prípravu jedla
  bbk: 2.0, // DE BBK: 2 l (1,5 pitie + 0,5 varenie)
};

// Energetická potreba (kcal/deň) podľa veku – zjednodušené referenčné hodnoty (EFSA/BBK 2 200 kcal pre dospelého).
export function kcalForAge(age) {
  if (age < 1) return 700;
  if (age < 4) return 1100;
  if (age < 7) return 1400;
  if (age < 11) return 1800;
  if (age < 15) return 2200;
  if (age < 19) return 2500;
  if (age < 65) return 2200;
  return 1900;
}

// Koeficient vody (pitie + varenie) voči dospelému.
export function waterFactorForAge(age) {
  if (age < 1) return 0.3; // príprava dojčenského mlieka (dojčené dieťa nepotrebuje)
  if (age < 4) return 0.4;
  if (age < 13) return 0.5;
  return 1;
}

export function personNeeds(m, supplies = {}) {
  const age = Number(m.age ?? 30);
  let kcal = kcalForAge(age);
  if (m.pregnant) kcal += 300;
  if (m.breastfeeding) kcal += 500;
  if (m.heavyWork) kcal += 500;
  const base = WATER_NORMS[supplies.waterNorm || 'nordic'];
  let water = base * waterFactorForAge(age);
  if (age < 1 && m.breastfed) water = 0;
  if (m.pregnant) water += 0.3;
  if (m.breastfeeding) water += 0.7;
  if (supplies.heat) water += age < 13 ? 0.5 : 1;
  const hygiene = supplies.hygieneWater === false ? 0 : (age < 4 ? 0.5 : 1);
  return { kcal, water: round1(water), hygiene, total: round1(water + hygiene) };
}

export function petNeeds(p) {
  const kg = Number(p.weight || (p.type === 'cat' ? 4 : 15));
  if (p.type === 'cat') return { water: 0.25, food: 60, kind: 'catfood' };
  if (p.type === 'dog') return { water: round1(0.05 * kg), food: Math.round(30 * Math.pow(kg, 0.75)), kind: 'dogfood' };
  return { water: 0.2, food: 0, kind: null };
}

export function householdNeeds(profile, days) {
  const members = profile.members || [];
  const s = profile.supplies || {};
  let kcal = 0, water = 0, hygiene = 0;
  for (const m of members) {
    const n = personNeeds(m, s);
    kcal += n.kcal; water += n.water; hygiene += n.hygiene;
  }
  let petWater = 0;
  for (const p of profile.pets || []) petWater += petNeeds(p).water;
  return {
    persons: members.length,
    kcalPerDay: kcal,
    kcalTotal: kcal * days,
    waterPerDay: round1(water + hygiene + petWater),
    waterTotal: Math.ceil((water + hygiene + petWater) * days),
    drinkTotal: Math.ceil(water * days),
    hygieneTotal: Math.ceil(hygiene * days),
    petWaterTotal: Math.ceil(petWater * days),
  };
}

function dietKey(m) {
  const d = m.diet || {};
  if (Number(m.age) < 1) return 'infant';
  return [d.vegan ? 'vegan' : d.vegetarian ? 'veg' : '', d.glutenFree ? 'gf' : '', d.lactoseFree ? 'lf' : ''].join('|');
}

function allowed(item, key) {
  const t = item.tags || [];
  const [diet, gf, lf] = key.split('|');
  if (diet === 'vegan' && !t.includes('vegan')) return false;
  if (diet === 'veg' && !t.includes('veg') && !t.includes('vegan')) return false;
  if (gf && !t.includes('gf')) return false;
  if (lf && !t.includes('lf')) return false;
  return true;
}

// Podiel jedla bez varenia: ak domácnosť varí na elektrine a nemá náhradu, väčšina zásob má byť „bez varenia“.
export function noCookShare(profile) {
  const u = profile.utilities || {};
  const electric = ['electric', 'induction'].includes(u.cooking);
  if (electric && !u.altCooking) return 0.8;
  return 0.45;
}

function effectiveWeight(item, f, key) {
  const t = item.tags || [];
  let w = item.w ?? 1;
  // rastlinný nápoj nahrádza mlieko pri vegánskej alebo bezlaktózovej strave
  if (item.id === 'plantmilk' && (key.startsWith('vegan') || key.endsWith('|lf'))) w = 3;
  if (item.id === 'soy' && key.startsWith('veg')) w = 2;
  if (t.includes('noCook')) return w * (0.35 + f);
  if (t.includes('quick')) return w * (0.35 + 0.5);
  return w * (0.35 + (1 - f));
}

// Rozdelenie kalórií do potravinových skupín a konkrétnych balení.
export function foodPlan(profile, days) {
  const f = noCookShare(profile);
  const groups = new Map();
  for (const m of profile.members || []) {
    const key = dietKey(m);
    if (key === 'infant') continue;
    const n = personNeeds(m, profile.supplies);
    groups.set(key, (groups.get(key) || 0) + n.kcal * days);
  }
  const qty = new Map();
  let kcalPlanned = 0;
  const hasKids = (profile.members || []).some((m) => Number(m.age) >= 1 && Number(m.age) < 10);
  for (const [key, kcal] of groups) {
    for (const [g, meta] of Object.entries(FOOD_GROUPS)) {
      const groupKcal = kcal * meta.share;
      let cands = ITEMS.filter((i) => i.group === g && allowed(i, key) && (hasKids || !(i.tags || []).includes('kids')))
        .map((i) => ({ it: i, w: effectiveWeight(i, f, key) }))
        .filter((c) => c.w > 0)
        .sort((a, b) => b.w - a.w);
      if (!cands.length) continue;
      // počet rôznych položiek podľa veľkosti potreby (pestrosť vs. zbytočné zaokrúhľovanie)
      const k = Math.max(1, Math.min(cands.length, Math.round(groupKcal / 5000)));
      cands = cands.slice(0, k);
      const sum = cands.reduce((a, c) => a + c.w, 0);
      cands.forEach(({ it, w }) => {
        const grams = (groupKcal * (w / sum)) / (it.kcal / 100);
        const packs = Math.round(grams / it.size);
        if (packs > 0) qty.set(it.id, (qty.get(it.id) || 0) + packs);
      });
    }
  }
  for (const [id, n] of qty) {
    const it = itemById(id);
    kcalPlanned += (it.size * it.kcal / 100) * n;
  }
  // doplnenie, ak zaokrúhlenie spôsobilo deficit
  const needed = [...groups.values()].reduce((a, b) => a + b, 0);
  const filler = ['crispbread', 'ricecakes', 'beans', 'peanutbutter', 'rice'].map(itemById).find((it) => [...groups.keys()].every((k) => allowed(it, k)));
  let guard = 0;
  while (filler && kcalPlanned < needed * 0.98 && guard++ < 200) {
    qty.set(filler.id, (qty.get(filler.id) || 0) + 1);
    kcalPlanned += filler.size * filler.kcal / 100;
  }
  return { qty, kcalPlanned: Math.round(kcalPlanned), kcalNeeded: Math.round(needed), noCookShare: f };
}

const adultsOf = (p) => (p.members || []).filter((m) => Number(m.age) >= 18).length;
const phonesOf = (p) => Math.max(1, (p.members || []).filter((m) => Number(m.age) >= 10).length);

// Hlavná funkcia: nákupný zoznam pre daný počet dní.
export function shoppingList(profile, days, prices = {}) {
  const P = Math.max(1, (profile.members || []).length);
  const D = days;
  const u = profile.utilities || {};
  const concerns = new Set(profile.concerns || []);
  const add = new Map();
  const put = (id, n, prio) => {
    if (!n || n <= 0) return;
    const prev = add.get(id);
    add.set(id, { n: (prev?.n || 0) + Math.ceil(n), prio: prio ?? prev?.prio });
  };

  // voda
  const need = householdNeeds(profile, D);
  put('water-pack', need.waterTotal / 9);
  put('jerrycan', Math.max(1, Math.ceil(P / 2)));
  if (D >= 7 || u.water === 'well' || concerns.has('water')) put('water-tabs', 1);
  if (D >= 14 || u.water === 'well') put('water-filter', 1);

  // potraviny
  const plan = foodPlan(profile, D);
  for (const [id, n] of plan.qty) put(id, n);
  if (D >= 7) put('salt', 1);
  put('tea', Math.ceil((adultsOf(profile) * D) / 20));
  if (D >= 7) put('coffee', 1, 5);
  put('soup', Math.min(Math.ceil((P * D) / 3), 30), 4);
  if (D >= 14) put('vitamins', Math.ceil((P * D) / 30));

  // deti
  for (const m of profile.members || []) {
    const age = Number(m.age);
    if (age < 1 && !m.breastfed) put('formula', (130 * D) / 800);
    if (age >= 0.5 && age < 2) put('babyjar', 2 * D);
    if (age < 3 && m.diapers !== false) {
      put('diapers', ((age < 1 ? 6 : 5) * D) / 50);
      put('babywipes', Math.ceil(D / 7));
    }
  }

  // zvieratá
  for (const p of profile.pets || []) {
    const n = petNeeds(p);
    if (n.kind === 'dogfood') put('dogfood', (n.food * D) / 3000);
    if (n.kind === 'catfood') { put('catfood', (n.food * D) / 2000); put('litter', Math.ceil(D / 14)); }
  }

  // hygiena
  put('toiletpaper', (P * D * 0.2) / 8);
  put('wetwipes', (P * D * 4) / 72);
  put('sanitizer', (P * D * 10) / 500);
  put('soap', Math.ceil(P / 2));
  put('toothpaste', P, 4);
  const menstruating = (profile.members || []).filter((m) => m.sex === 'f' && Number(m.age) >= 12 && Number(m.age) <= 52).length;
  put('pads', menstruating * Math.ceil(D / 30));
  put('garbagebags', Math.ceil(D / 30));
  if (D >= 3) { put('bucket', 1); put('absorbent', (P * D * 0.5) / 10); }
  put('bleach', 1);

  // zdravie
  put('firstaid', profile.mobility?.car && profile.mobility.car !== 'none' ? 2 : 1);
  put('meds30', (profile.members || []).filter((m) => (m.meds || []).length).length);
  put('painkillers', P > 3 ? 2 : 1);
  put('thermometer', 1);
  put('gloves', 1);
  put('ffp2', (concerns.has('pandemic') || concerns.has('chemical') || concerns.has('nuclear')) ? (P * Math.max(D, 7)) / 10 : (P * 5) / 10);
  if (D >= 7 || (profile.members || []).some((m) => Number(m.age) < 6)) put('ors', 1);
  if (concerns.has('war') || concerns.has('terror')) put('tourniquet', 1);

  // svetlo a energia
  put('headlamp', (profile.members || []).filter((m) => Number(m.age) >= 5).length || 1);
  put('torch', 1);
  if (D >= 3) put('lantern', 1);
  put('battAAA', (P * D * 0.3) / 8);
  put('battAA', Math.max(1, (D * 0.5) / 8));
  const phones = phonesOf(profile);
  put('powerbank', Math.min(phones * 2, Math.ceil((phones * Math.min(D, 7) * 9) / 48)));
  const powerDep = (profile.members || []).some((m) => m.powerDevice);
  if (powerDep) put('powerstation', 1, 1);
  else if (D >= 14) put('powerstation', 1, 5);
  if (D >= 14 || (D >= 7 && !(u.backupPower || []).length)) put('solar', 1);
  put('candles', 1);

  // informácie
  put('radio', 1);
  put('notebook', 1);
  put('whistle', P);

  // varenie
  const electricCooking = ['electric', 'induction'].includes(u.cooking);
  if (!u.altCooking && (electricCooking || D >= 3)) {
    put('stove', 1, electricCooking ? 2 : 3);
    put('gas', Math.max(2, (D * (15 + 8 * P)) / 120), electricCooking ? 2 : 3);
  }
  put('lighter', 1);
  put('canopener', 1);

  // teplo
  put('blanket', P);
  if (u.heating !== 'wood' && D >= 7) put('sleepingbag', P);
  if (D >= 7) put('hotwaterbottle', Math.ceil(P / 2));
  const combustion = ['gas', 'wood', 'oil'].includes(u.heating) || u.cooking === 'gas' || u.altHeating;
  put('codetector', 1, combustion ? 1 : 2);
  put('smokedetector', profile.housing?.type === 'house' ? 2 : 1);
  put('extinguisher', 1);

  // náradie
  put('tape', 2);
  put('sheeting', 1);
  put('multitool', 1);
  put('workgloves', Math.max(1, adultsOf(profile)));
  if (profile.risks?.river && profile.housing?.type !== 'flat') put('sandbags', 2, 2);

  // doklady
  put('docbag', 1);
  put('usb', 1);
  put('cash', 1);

  const rows = [];
  for (const [id, { n, prio }] of add) {
    const it = itemById(id);
    if (!it) continue;
    const price = prices[id] ?? it.price;
    rows.push({
      id, cat: it.cat, qty: n, price, cost: round2(price * n),
      prio: prio ?? it.prio ?? (it.cat === 'food' ? (it.tags?.includes('noCook') ? 1 : 2) : 3),
      shelf: it.shelf, group: it.group, equip: !!it.equip,
    });
  }
  const order = ['water', 'food', 'infant', 'pet', 'hygiene', 'medical', 'light', 'comms', 'cooking', 'warmth', 'tools', 'docs'];
  rows.sort((a, b) => order.indexOf(a.cat) - order.indexOf(b.cat) || a.prio - b.prio);
  const total = round2(rows.reduce((s, r) => s + r.cost, 0));
  const equipTotal = round2(rows.filter((r) => r.equip).reduce((s, r) => s + r.cost, 0));
  return {
    days: D, rows, total, equipTotal, consumablesTotal: round2(total - equipTotal), need, food: plan,
    cashSuggested: Math.round((P * Math.min(D, 14) / 7) * 70 / 10) * 10,
  };
}

// Postupný nákup podľa týždenného rozpočtu, od najvyššej priority.
export function purchaseSchedule(rows, monthlyBudget) {
  const weekly = Math.max(5, (Number(monthlyBudget) || 0) / 4.33);
  const sorted = [...rows].filter((r) => r.cost > 0).sort((a, b) => a.prio - b.prio || b.cost - a.cost);
  const weeks = [];
  let cur = { items: [], cost: 0 };
  for (const r of sorted) {
    let remaining = r.qty;
    const unit = r.price;
    while (remaining > 0) {
      const room = weekly - cur.cost;
      let n = Math.floor(room / unit);
      if (n <= 0) {
        if (cur.items.length) { weeks.push(cur); cur = { items: [], cost: 0 }; continue; }
        n = 1; // drahšia položka než týždenný rozpočet – samostatný týždeň
      }
      n = Math.min(n, remaining);
      cur.items.push({ id: r.id, qty: n, cost: round2(n * unit) });
      cur.cost = round2(cur.cost + n * unit);
      remaining -= n;
    }
  }
  if (cur.items.length) weeks.push(cur);
  return { weekly: round2(weekly), weeks };
}

// Vzdialenosť (km) – haversine.
export function distanceKm(a, b) {
  const R = 6371, toRad = (x) => (x * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat), dLon = toRad(b.lon - a.lon);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

export function nearestNpp(loc) {
  if (!loc || loc.lat == null) return null;
  let best = null;
  for (const n of NPP) {
    const d = distanceKm(loc, n);
    if (!best || d < best.km) best = { ...n, km: Math.round(d) };
  }
  return best;
}

// Rizikový profil: skóre 1–5 pre každý typ krízy + dôvody (kľúče prekladov).
export function riskProfile(profile) {
  const base = { flood: 3, storm: 3, heat: 3, cold: 2, fire: 2, quake: 1, blackout: 3, water: 2, comms: 3, pandemic: 3, nuclear: 1, chemical: 2, war: 2, terror: 1, economic: 2 };
  const reasons = Object.fromEntries(Object.keys(base).map((k) => [k, []]));
  const bump = (k, n, why) => { base[k] += n; reasons[k].push(why); };
  const r = profile.risks || {};
  const loc = profile.location || {};
  const h = profile.housing || {};
  const u = profile.utilities || {};
  const members = profile.members || [];
  if (r.river) bump('flood', 2, 'river');
  if (r.slope) bump('quake', 1, 'slope');
  if (r.forest) bump('fire', 1, 'forest');
  if (r.chemical) bump('chemical', 2, 'chemicalPlant');
  const npp = nearestNpp(loc);
  if (npp) {
    if (npp.km <= 30) bump('nuclear', 3, 'npp30');
    else if (npp.km <= 100) bump('nuclear', 1, 'npp100');
  }
  if (loc.setting === 'city') { bump('heat', 1, 'urbanHeat'); bump('terror', 1, 'city'); }
  if (loc.setting === 'rural') bump('cold', 1, 'rural');
  if (h.type === 'flat' && Number(h.floor) >= 4) bump('blackout', 1, 'highFloor');
  if (members.some((m) => m.powerDevice)) bump('blackout', 2, 'powerDevice');
  if (['electric', 'heatpump'].includes(u.heating)) bump('cold', 1, 'electricHeating');
  if (u.water === 'well') bump('water', -1, 'well');
  if (members.some((m) => Number(m.age) >= 70 || Number(m.age) < 4)) { bump('heat', 1, 'vulnerable'); bump('pandemic', 1, 'vulnerable'); }
  if (members.some((m) => (m.meds || []).length || m.conditions)) bump('pandemic', 1, 'chronic');
  for (const c of profile.concerns || []) if (base[c] != null) bump(c, 1, 'concern');
  const out = Object.entries(base).map(([id, s]) => ({ id, score: Math.max(1, Math.min(5, s)), reasons: reasons[id] }));
  out.sort((a, b) => b.score - a.score);
  return { list: out, npp };
}

// Energetický plán pre výpadok elektriny.
export function energyPlan(profile, days) {
  const phones = phonesOf(profile);
  const phoneWh = phones * days * 9;
  const powerbanks = Math.ceil(phoneWh / 48);
  const P = Math.max(1, (profile.members || []).length);
  const devices = (profile.members || []).filter((m) => m.powerDevice).map((m) => m.powerDevice);
  const deviceWh = devices.reduce((s, d) => s + (DEVICE_WH[d] || 300), 0) * days;
  const gas = Math.max(2, Math.ceil((days * (15 + 8 * P)) / 120));
  return { phones, phoneWh, powerbanks, deviceWh, devices, gasCartridges: gas, aaa: Math.ceil(P * days * 0.3), aa: Math.ceil(days * 0.5) };
}

export const DEVICE_WH = { oxygen: 6000, cpap: 450, dialysis: 3000, wheelchair: 400, pump: 100, other: 300 };

export function round1(x) { return Math.round(x * 10) / 10; }
export function round2(x) { return Math.round(x * 100) / 100; }
