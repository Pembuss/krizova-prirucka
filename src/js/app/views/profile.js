// Sprievodca profilom domácnosti (8 krokov).
import { store, uid } from '../store.js';
import { t, tp, T, esc, input, textarea, select, check, chips, bindForm, toast, LANG, $, $$ } from '../core.js';
import { COUNTRIES } from '../../../data/countries.js';
import { CRISES } from '../../../data/crises.js';
import { geocode, reverse, overpass } from '../../map/geo.js';
import { nearestNpp } from '../../calc.js';

const STEPS = ['s1', 's2', 's3', 's4', 's5', 's6', 's7', 's8'];

export function render(el, [stepParam]) {
  let step = Math.min(Math.max(Number(stepParam) || 1, 1), STEPS.length);
  let map = null;
  const p = store.profile;

  const draw = () => {
    if (map) { map.remove(); map = null; }
    el.innerHTML = `<div class="wrap narrow wizard">
<h1>${esc(t('wiz.title'))}</h1>
<ol class="steps-nav">${STEPS.map((s, i) => `<li><a href="#/profil/${i + 1}" ${i + 1 === step ? 'aria-current="step"' : ''}>${i + 1}<span class="visually-hidden"> ${esc(t('wiz.' + s))}</span></a></li>`).join('')}</ol>
<p class="muted">${esc(t('wiz.step', { n: step, total: STEPS.length }))}</p>
<h2>${esc(t('wiz.' + STEPS[step - 1]))}</h2>
<form class="form-grid" onsubmit="return false">${stepHtml(step)}</form>
<div class="btn-row wiz-nav">
  ${step > 1 ? `<a class="btn btn-ghost" href="#/profil/${step - 1}">← ${esc(t('c.back'))}</a>` : ''}
  ${step < STEPS.length ? `<a class="btn" href="#/profil/${step + 1}">${esc(t('wiz.next'))} →</a>` : `<button class="btn" type="button" data-finish>✓ ${esc(t('wiz.finish'))}</button>`}
</div></div>`;
    if (step === 1) initLocation();
  };

  function stepHtml(s) {
    switch (s) {
      case 1: {
        const loc = p.location;
        const npp = nearestNpp(loc);
        return `<div class="field-row"><span class="lbl">${esc(t('loc.search'))}</span>
<div class="inline"><input type="search" id="loc-q" placeholder="${esc(t('loc.search'))}" value=""><button class="btn" type="button" data-geocode>${esc(t('loc.searchBtn'))}</button></div>
<button class="btn btn-ghost" type="button" data-gps>📍 ${esc(t('loc.gps'))}</button>
<ul class="results" id="loc-results"></ul></div>
<div id="loc-map" class="minimap"></div><p class="muted small">${esc(t('loc.pick'))}</p>
<p><strong>${esc(t('loc.current'))}:</strong> <span id="loc-label">${loc.lat != null ? esc(loc.label || `${loc.lat.toFixed(4)}, ${loc.lon.toFixed(4)}`) : esc(t('loc.none'))}</span></p>
${npp ? `<p class="muted">☢️ ${esc(t('home.npp', { name: npp.name, km: npp.km }))}</p>` : ''}
<div class="field-row"><span class="lbl">${esc(t('loc.setting'))}</span>${chips('location.setting', [['city', t('setting.city')], ['town', t('setting.town')], ['rural', t('setting.rural')]])}</div>
${select('location.country', t('loc.country'), COUNTRIES.map((c) => [c.cc, `${c.flag} ${T(c.name)}`]).sort((a, b) => a[1].localeCompare(b[1], LANG)))}
<fieldset><legend>${esc(t('loc.risks'))}</legend>
${check('risks.river', t('risk.river'))}
<p><button class="btn btn-ghost btn-sm" type="button" data-rivers ${loc.lat == null ? 'disabled' : ''}>🌊 ${esc(t('risk.checkRiver'))}</button> <span id="river-out" class="muted"></span></p>
${check('risks.slope', t('risk.slope'))}${check('risks.forest', t('risk.forest'))}${check('risks.chemical', t('risk.chemical'))}</fieldset>`;
      }
      case 2:
        return `${p.members.map((m, i) => memberCard(m, i)).join('')}<button class="btn btn-ghost" type="button" data-add-member>＋ ${esc(t('mem.add'))}</button>`;
      case 3:
        return `${p.pets.length ? p.pets.map((x, i) => `<fieldset class="person"><legend>🐾 ${esc(x.name || t('pet.' + x.type))}</legend>
${select(`pets.${i}.type`, t('pet.type'), [['dog', t('pet.dog')], ['cat', t('pet.cat')], ['other', t('pet.other')]])}
${input(`pets.${i}.name`, t('pet.name'))}${input(`pets.${i}.weight`, t('pet.weight'), { type: 'number', attrs: 'min="0" step="0.5" inputmode="decimal"' })}
<button class="btn btn-ghost btn-sm" type="button" data-del-pet="${i}">${esc(t('c.delete'))}</button></fieldset>`).join('') : `<p class="muted">${esc(t('pet.none'))}</p>`}
<button class="btn btn-ghost" type="button" data-add-pet>＋ ${esc(t('pet.add'))}</button>`;
      case 4:
        return `<div class="field-row"><span class="lbl">${esc(t('house.type'))}</span>${chips('housing.type', [['flat', t('house.flat')], ['house', t('house.house')], ['cottage', t('house.cottage')]])}</div>
${input('housing.floor', t('house.floor'), { type: 'number', attrs: 'min="-2" max="60" inputmode="numeric"' })}
${check('housing.elevatorDependent', t('house.elevator'))}
<div class="field-row"><span class="lbl">${esc(t('house.basement'))}</span>${chips('housing.basement', [['none', t('base.none')], ['cellar', t('base.cellar')], ['shelter', t('base.shelter')]])}</div>
${check('housing.garden', t('house.garden'))}
<div class="field-row"><span class="lbl">${esc(t('util.heating'))}</span>${chips('utilities.heating', ['gas', 'electric', 'district', 'wood', 'heatpump', 'oil'].map((x) => [x, t('heat.' + x)]))}</div>
<div class="field-row"><span class="lbl">${esc(t('util.cooking'))}</span>${chips('utilities.cooking', ['gas', 'electric', 'induction', 'wood'].map((x) => [x, t('cook.' + x)]))}</div>
<div class="field-row"><span class="lbl">${esc(t('util.water'))}</span>${chips('utilities.water', [['public', t('water.public')], ['well', t('water.well')]])}</div>
${check('utilities.altCooking', t('util.altCooking'))}${check('utilities.altHeating', t('util.altHeating'))}
<div class="field-row"><span class="lbl">${esc(t('util.backup'))}</span>${chips('utilities.backupPower', ['powerbank', 'solar', 'generator', 'powerstation', 'inverter'].map((x) => [x, t('bp.' + x)]), { multi: true })}</div>`;
      case 5:
        return `<p class="muted">${esc(t('shel.hint'))}</p>
<div class="field-row"><span class="lbl">${esc(t('shel.option'))}</span>${chips('shelter.option', ['public', 'building', 'basement', 'room', 'unknown'].map((x) => [x, t('shel.' + x)]))}</div>
${input('shelter.address', t('shel.address'))}
${input('shelter.minutes', t('shel.minutes'), { type: 'number', attrs: 'min="0" inputmode="numeric"' })}`;
      case 6:
        return `<div class="field-row"><span class="lbl">${esc(t('mob.car'))}</span>${chips('mobility.car', ['none', 'petrol', 'diesel', 'ev', 'hybrid'].map((x) => [x, t('car.' + x)]))}</div>
${check('mobility.bike', t('mob.bike'))}${check('mobility.publicTransport', t('mob.public'))}
${input('mobility.walkKm', t('mob.walkKm'), { type: 'number', attrs: 'min="0" inputmode="decimal"' })}
<fieldset><legend>${esc(t('mob.dest'))}</legend><p class="muted small">${esc(t('mob.destHint'))}</p>
<ul class="destlist">${(p.mobility.destinations || []).map((d, i) => `<li><span>🏁 ${esc(d.name || d.label)}</span><small class="muted">${esc(d.label || '')}</small><button class="btn btn-ghost btn-sm" type="button" data-del-dest="${i}">${esc(t('c.delete'))}</button></li>`).join('') || `<li class="muted">${esc(t('dest.none'))}</li>`}</ul>
<div class="field-row"><input type="text" id="dest-name" placeholder="${esc(t('dest.name'))}"><div class="inline"><input type="search" id="dest-q" placeholder="${esc(t('loc.search'))}"><button class="btn" type="button" data-dest-search>${esc(t('loc.searchBtn'))}</button></div><ul class="results" id="dest-results"></ul></div></fieldset>`;
      case 7:
        return `<div class="field-row"><span class="lbl">${esc(t('sup.current'))}</span>${chips('supplies.currentDays', [0, 1, 3, 7, 14, 30].map((d) => [d, String(d)]))}</div>
<div class="field-row"><span class="lbl">${esc(t('sup.target'))}</span>${chips('supplies.targetDays', [3, 7, 14, 30].map((d) => [d, tp('c.days', d)]))}</div>
${input('supplies.budgetMonthly', t('sup.budget'), { type: 'number', attrs: 'min="0" step="10" inputmode="numeric"' })}
<div class="field-row"><span class="lbl">${esc(t('sup.norm'))}</span>${chips('supplies.waterNorm', [['nordic', t('norm.nordic')], ['bbk', t('norm.bbk')]])}</div>
${check('supplies.hygieneWater', t('sup.hygiene'))}${check('supplies.heat', t('sup.heat'))}`;
      case 8:
        return `<p class="muted">${esc(t('conc.lead'))}</p>${chips('concerns', CRISES.map((c) => [c.id, `${c.icon} ${T(c.name)}`]), { multi: true })}`;
      default: return '';
    }
  }

  function memberCard(m, i) {
    const b = `members.${i}`;
    const age = Number(m.age);
    return `<fieldset class="person"><legend>${esc(m.name || t('mem.person', { n: i + 1 }))}</legend>
<div class="two">${input(`${b}.name`, t('mem.name'))}${input(`${b}.age`, t('mem.age'), { type: 'number', attrs: 'min="0" max="120" step="0.5" inputmode="decimal"' })}</div>
<div class="field-row"><span class="lbl">${esc(t('mem.sex'))}</span>${chips(`${b}.sex`, [['f', t('sex.f')], ['m', t('sex.m')], ['x', t('sex.x')]])}</div>
<div class="checks">${m.sex === 'f' && age >= 14 && age <= 50 ? check(`${b}.pregnant`, t('mem.pregnant')) + check(`${b}.breastfeeding`, t('mem.breastfeeding')) : ''}
${age < 1 ? check(`${b}.breastfed`, t('mem.breastfed')) : ''}${age < 3 ? check(`${b}.diapers`, t('mem.diapers'), { value: m.diapers !== false }) : ''}
${age >= 16 ? check(`${b}.heavyWork`, t('mem.heavyWork')) : ''}</div>
<div class="field-row"><span class="lbl">${esc(t('mem.diet'))}</span><div class="checks">${['vegetarian', 'vegan', 'glutenFree', 'lactoseFree'].map((d) => check(`${b}.diet.${d}`, t('diet.' + d))).join('')}</div></div>
${input(`${b}.allergies`, t('mem.allergies'))}
${textarea(`${b}.medsText`, t('mem.meds'), { value: m.medsText ?? (m.meds || []).join('\n'), rows: 2 })}
${input(`${b}.conditions`, t('mem.conditions'))}
${select(`${b}.mobility`, t('mem.mobility'), ['full', 'limited', 'wheelchair', 'bedridden'].map((x) => [x, t('mob.' + x)]))}
${select(`${b}.powerDevice`, t('mem.device'), [['', t('dev.none')], ...['oxygen', 'cpap', 'dialysis', 'wheelchair', 'pump', 'other'].map((x) => [x, t('dev.' + x)])])}
${p.members.length > 1 ? `<button class="btn btn-ghost btn-sm" type="button" data-del-member="${i}">${esc(t('c.delete'))}</button>` : ''}</fieldset>`;
  }

  function setLocation(lat, lon, label, country) {
    p.location.lat = lat; p.location.lon = lon;
    if (label) p.location.label = label;
    if (country && COUNTRIES.some((c) => c.cc === country)) p.location.country = country;
    store.saveProfile();
    draw();
    if (!label) reverse(lat, lon, LANG).then((r) => { p.location.label = r.label; if (COUNTRIES.some((c) => c.cc === r.country)) p.location.country = r.country; store.saveProfile(); const lab = $('#loc-label'); if (lab) lab.textContent = r.label; }).catch(() => {});
  }

  function initLocation() {
    const L = window.L;
    if (!L) return;
    const loc = p.location;
    const center = loc.lat != null ? [loc.lat, loc.lon] : [48.7, 19.5];
    map = L.map('loc-map', { zoomControl: true }).setView(center, loc.lat != null ? 14 : 7);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(map);
    if (loc.lat != null) L.marker(center).addTo(map);
    map.on('click', (e) => setLocation(e.latlng.lat, e.latlng.lng));
  }

  async function search(q, out, onPick) {
    if (!q.trim()) return;
    out.innerHTML = `<li class="muted">${esc(t('c.loading'))}</li>`;
    try {
      const res = await geocode(q, LANG);
      if (!res.length) { out.innerHTML = `<li class="muted">${esc(t('loc.notFound'))}</li>`; return; }
      out.innerHTML = res.map((r, i) => `<li><button type="button" data-pick="${i}">${esc(r.label)}</button></li>`).join('');
      out.onclick = (e) => { const b = e.target.closest('[data-pick]'); if (b) onPick(res[Number(b.dataset.pick)]); };
    } catch { out.innerHTML = `<li class="muted">${esc(t('map.error'))}</li>`; }
  }

  bindForm(el, (path, v) => {
    if (path.endsWith('.medsText')) {
      const i = Number(path.split('.')[1]);
      p.members[i].meds = String(v).split('\n').map((s) => s.trim()).filter(Boolean);
    }
    if (/members\.\d+\.(age|sex)$/.test(path) || /diet\.vegan$/.test(path)) {
      clearTimeout(el._redraw); el._redraw = setTimeout(() => { store.saveProfile(); draw(); }, 600);
    }
  });

  el.addEventListener('click', async (e) => {
    const tg = e.target;
    if (tg.closest('[data-geocode]')) search($('#loc-q').value, $('#loc-results'), (r) => setLocation(r.lat, r.lon, r.label, r.country));
    if (tg.closest('[data-gps]')) {
      navigator.geolocation?.getCurrentPosition((pos) => setLocation(pos.coords.latitude, pos.coords.longitude), () => toast(t('loc.gpsErr')), { enableHighAccuracy: true, timeout: 15000 });
    }
    if (tg.closest('[data-rivers]')) {
      const out = $('#river-out');
      out.textContent = t('c.loading');
      try {
        const r = await overpass(`[out:json][timeout:25];way["waterway"~"^(river|stream|canal)$"](around:500,${p.location.lat},${p.location.lon});out tags;`);
        const names = [...new Set(r.elements.map((x) => x.tags?.name).filter(Boolean))];
        if (r.elements.length) { p.risks.river = true; store.saveProfile(); $$('[data-bind="risks.river"]').forEach((c) => { c.checked = true; }); }
        out.textContent = r.elements.length ? t('risk.riverFound', { names: names.join(', ') || '—' }) : t('risk.riverNone');
      } catch { out.textContent = t('map.error'); }
    }
    if (tg.closest('[data-add-member]')) { p.members.push({ id: uid(), name: '', age: 30, sex: '', diet: {}, meds: [], mobility: 'full', powerDevice: '' }); store.saveProfile(); draw(); }
    const dm = tg.closest('[data-del-member]');
    if (dm) { p.members.splice(Number(dm.dataset.delMember), 1); store.saveProfile(); draw(); }
    if (tg.closest('[data-add-pet]')) { p.pets.push({ id: uid(), type: 'dog', name: '', weight: 15 }); store.saveProfile(); draw(); }
    const dp = tg.closest('[data-del-pet]');
    if (dp) { p.pets.splice(Number(dp.dataset.delPet), 1); store.saveProfile(); draw(); }
    if (tg.closest('[data-dest-search]')) {
      search($('#dest-q').value, $('#dest-results'), (r) => {
        p.mobility.destinations.push({ id: uid(), name: $('#dest-name').value.trim() || r.label.split(',')[0], label: r.label, lat: r.lat, lon: r.lon });
        store.saveProfile(); draw();
      });
    }
    const dd = tg.closest('[data-del-dest]');
    if (dd) { p.mobility.destinations.splice(Number(dd.dataset.delDest), 1); store.saveProfile(); draw(); }
    if (tg.closest('[data-finish]')) { store.state.wizardDone = true; store.saveState(); store.saveProfile(); location.hash = '#/plan'; }
  });

  draw();
  return () => { if (map) map.remove(); };
}
