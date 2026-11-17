// Osobný plán: zoznam krokov podľa profilu domácnosti.
import { shoppingList, energyPlan, householdNeeds, nearestNpp, DEVICE_WH } from '../calc.js';
import { t, money } from './core.js';

export function buildTasks(p) {
  const members = p.members || [];
  const P = Math.max(1, members.length);
  const days = Number(p.supplies?.targetDays) || 7;
  const need = householdNeeds(p, days);
  const list = shoppingList(p, days);
  const en = energyPlan(p, Math.min(days, 7));
  const u = p.utilities || {};
  const fam = p.family || {};
  const npp = nearestNpp(p.location);
  const names = (arr) => arr.map((m, i) => m.name || t('mem.person', { n: i + 1 })).join(', ');
  const tasks = [];
  const add = (id, cat, text, link, prio = 2, auto) => tasks.push({ id, cat, text, link, prio, auto });

  // Základ
  add('numbers', 'basics', t('task.numbers'), 'book:varovanie#varovanie-112', 1);
  add('sirens', 'basics', t('task.sirens'), 'book:varovanie#varovanie-sireny', 1);
  add('alerts', 'basics', t('task.alerts'), 'book:varovanie#varovanie-kanaly', 2);
  add('meet', 'basics', t('task.meet'), '#/rodina', 1, !!(fam.meet1 && fam.meet2 && fam.meet3));
  add('outContact', 'basics', t('task.outContact'), '#/rodina', 1, !!(fam.outName && fam.outPhone));
  add('wallet', 'basics', t('task.wallet'), '#/tlac', 2);

  // Zásoby
  add('water', 'supplies', t('task.water', { l: need.waterTotal }), '#/zasoby', 1);
  add('food', 'supplies', t('task.food', { days }), '#/zasoby', 1);
  const withMeds = members.filter((m) => (m.meds || []).length);
  if (withMeds.length) add('meds', 'supplies', t('task.meds', { names: names(withMeds) }), '#/batohy', 1);
  add('firstaid', 'supplies', t('task.firstaid'), '#/batohy', 2);
  add('radio', 'supplies', t('task.radio'), 'book:varovanie#varovanie-bez-signalu', 1);
  add('light', 'supplies', t('task.light', { n: Math.max(1, members.filter((m) => Number(m.age) >= 5).length) }), '#/energia', 1);
  add('powerbank', 'supplies', t('task.powerbank', { n: en.powerbanks }), '#/energia', 2);
  add('cash', 'supplies', t('task.cash', { eur: money(list.cashSuggested) }), 'book:batozina#batozina-peniaze', 2);
  const electricCooking = ['electric', 'induction'].includes(u.cooking);
  if (!u.altCooking) add('stove', 'supplies', t('task.stove', { n: en.gasCartridges }), '#/energia', electricCooking ? 1 : 3);
  if (u.heating !== 'wood' && !u.altHeating) add('warmth', 'supplies', t('task.warmth'), 'book:mrazy#mrazy-vypadok', 2);
  if (p.housing?.type === 'flat' && Number(p.housing?.floor) >= 4) add('waterHigh', 'supplies', t('task.waterHigh'), 'book:vypadok-vody', 2);
  if (members.some((m) => Number(m.age) < 2)) add('infant', 'people', t('task.infant'), 'book:zranitelni#zranitelni-deti', 1);
  if ((p.pets || []).length) add('pets', 'people', t('task.pets', { n: p.pets.length }), '#/batohy', 2);

  // Domov a bezpečnosť
  const combustion = ['gas', 'wood', 'oil'].includes(u.heating) || u.cooking === 'gas' || u.altHeating || u.altCooking;
  add('co', 'home', t('task.co'), 'book:mrazy', combustion ? 1 : 3);
  add('smoke', 'home', t('task.smoke'), 'book:poziare#poziare-pred', 2);
  add('docs', 'home', t('task.docs'), 'book:batozina#batozina-dokumenty', 2);
  if (p.risks?.river) add('flood', 'home', t('task.flood'), 'book:povodne#povodne-pred', 1);
  if (npp && npp.km <= 30) add('iodine', 'home', t('task.iodine', { name: npp.name, km: npp.km }), 'book:jadrova#jadrova-jod', 1);
  if (p.risks?.chemical) add('chemical', 'home', t('task.chemical'), 'book:chemicka#chemicka-pred', 1);
  for (const m of members.filter((x) => x.powerDevice && x.powerDevice !== 'none')) {
    add('device-' + m.id, 'people', t('task.device', { device: t('dev.' + m.powerDevice), wh: DEVICE_WH[m.powerDevice] || 300 }), '#/energia', 1);
  }

  // Ľudia
  const vulnerable = members.filter((m) => Number(m.age) >= 70 || ['limited', 'wheelchair', 'bedridden'].includes(m.mobility));
  if (vulnerable.length) add('check', 'people', t('task.check', { names: names(vulnerable) }), 'book:zranitelni#zranitelni-seniori', 2);
  if (p.housing?.elevatorDependent) add('lift', 'people', t('task.lift'), 'book:zranitelni#zranitelni-postihnutie', 1);
  if (members.some((m) => Number(m.age) >= 3 && Number(m.age) < 15)) add('school', 'people', t('task.school'), 'book:plan#plan-ulohy', 2);
  add('bags', 'people', t('task.bags', { n: P }), '#/batohy', 1);
  add('neighbors', 'people', t('task.neighbors'), 'book:komunita#komunita-priprava', 3);

  // Ukrytie a evakuácia
  const sh = p.shelter?.option || 'unknown';
  if (sh === 'unknown' || sh === 'room') add('findShelter', 'shelter', t('task.findShelter'), 'book:ukrytie#ukrytie-kde', 1, sh === 'public' || sh === 'building');
  add('homeShelter', 'shelter', t('task.homeShelter'), 'book:ukrytie#ukrytie-domov', 2);
  add('dest', 'shelter', t('task.dest'), '#/profil/6', 2, (p.mobility?.destinations || []).length >= 2);
  add('routes', 'shelter', t('task.routes'), '#/trasy', 2, (p.routes || []).length > 0);
  if (p.mobility?.car && p.mobility.car !== 'none') add('car', 'shelter', t('task.car'), '#/batohy', 2);
  if (p.mobility?.car === 'ev') add('ev', 'shelter', t('task.ev'), 'book:evakuacia#evakuacia-auto', 3);

  // Zručnosti
  add('course', 'skills', t('task.course'), 'book:prva-pomoc', 2);
  add('drill', 'skills', t('task.drill'), 'book:principy#principy-trening', 3);
  add('review', 'skills', t('task.review'), 'book:kontrolne-zoznamy#kontrolne-zoznamy-kontrola', 3);

  // Zvýšenie priority podľa obáv
  const concerns = new Set(p.concerns || []);
  const boost = { flood: ['flood'], nuclear: ['iodine', 'homeShelter', 'findShelter'], chemical: ['chemical', 'homeShelter'], war: ['findShelter', 'homeShelter', 'dest', 'routes', 'cash'], blackout: ['light', 'powerbank', 'radio', 'stove'], cold: ['warmth', 'co'], pandemic: ['meds', 'firstaid'], water: ['water'], economic: ['food', 'cash'] };
  for (const [c, ids] of Object.entries(boost)) if (concerns.has(c)) for (const tk of tasks) if (ids.includes(tk.id)) tk.prio = Math.max(1, tk.prio - 1);
  tasks.sort((a, b) => a.prio - b.prio);
  return tasks;
}

export function readiness(tasks, state) {
  const done = tasks.filter((x) => x.auto || state.tasksDone[x.id]).length;
  return { done, total: tasks.length, pct: tasks.length ? Math.round((done / tasks.length) * 100) : 0 };
}

// Kalendárové pripomienky (.ics)
export function icsReminders(items, title) {
  const pad = (n) => String(n).padStart(2, '0');
  const dt = (d) => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Krizova prirucka//SK', 'CALSCALE:GREGORIAN'];
  items.forEach((it, i) => {
    const d = new Date(it.date);
    const end = new Date(d.getTime() + 86400000);
    lines.push('BEGIN:VEVENT', `UID:kp-${Date.now()}-${i}@krizova-prirucka`, `DTSTAMP:${dt(new Date())}T000000Z`, `DTSTART;VALUE=DATE:${dt(d)}`, `DTEND;VALUE=DATE:${dt(end)}`,
      `SUMMARY:${(title + ': ' + it.text).replace(/[,;]/g, ' ')}`, 'BEGIN:VALARM', 'TRIGGER:-P1D', 'ACTION:DISPLAY', 'DESCRIPTION:Reminder', 'END:VALARM', 'END:VEVENT');
  });
  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}
