// Mapa: domov, kryty a dôležité miesta z OpenStreetMap, vlastné miesta, oficiálne zdroje, offline mapa.
import { store, uid } from '../store.js';
import { t, T, esc, LANG, toast, $, $$, num } from '../core.js';
import { LAYERS, layerQuery, overpass, classify, reverse } from '../../map/geo.js';
import { addBasemap } from '../../map/tiles.js';
import { poisNear, inDetailArea, poiData } from '../../map/offdata.js';
import { searchBox, emojiIcon } from '../../map/picker.js';
import { distanceKm } from '../../calc.js';
import { NPP } from '../../../data/npp.js';
import { countryByCode } from '../../../data/countries.js';

const DEFAULT_LAYERS = ['shelter', 'assembly', 'hospital', 'pharmacy', 'water', 'emergency', 'townhall', 'aed'];
const PLACE_TYPES = ['shelter', 'meet', 'family', 'water', 'help', 'other'];
const PLACE_ICON = { shelter: '🛡️', meet: '📍', family: '🏡', water: '💧', help: 'ℹ️', other: '⭐' };

export function cacheKey(lat, lon, r) { return `${lat.toFixed(2)},${lon.toFixed(2)},${r}`; }

export function render(el, params, opts = {}) {
  const p = store.profile;
  const L = window.L;
  const prefs = store.prefs;
  let layersOn = new Set(prefs.mapLayers || DEFAULT_LAYERS);
  let radius = prefs.mapRadius || 3000;
  let map, groups = {}, homeMarker, addMode = false, elements = [], loadedAt = null;

  const home = () => (p.location.lat != null ? { lat: p.location.lat, lon: p.location.lon } : null);
  const routesHref = opts.standalone ? '#trasy' : '#/trasy';

  el.innerHTML = `<div class="wrap map-view">
<h1>${opts.standalone ? '' : esc(t('nav.map'))}</h1>
<div class="map-toolbar">
  <div id="m-search"></div>
  <div class="inline"><label>${esc(t('map.radius'))} <select data-radius>${[1000, 3000, 5000, 10000].map((r) => `<option value="${r}"${r === radius ? ' selected' : ''}>${r / 1000} km</option>`).join('')}</select></label>
  <button class="btn" data-load>🔎 ${esc(t('map.load'))}</button></div>
</div>
<details class="layers" open><summary>${esc(t('map.layers'))}</summary><div class="chips">${Object.keys(LAYERS).concat('mine').map((id) => `<button type="button" class="chip" data-layer="${id}" aria-pressed="${id === 'mine' || layersOn.has(id)}">${id === 'mine' ? '⭐' : LAYERS[id].icon} ${esc(t('layer.' + id))}</button>`).join('')}</div></details>
<p id="m-status" class="muted small" aria-live="polite"></p>
<div class="mapwrap"><div id="map" class="bigmap" role="application" aria-label="${esc(t('nav.map'))}"></div></div>
<div class="btn-row"><button class="btn btn-ghost" data-addplace>⭐ ${esc(t('map.addPlace'))}</button><button class="btn btn-ghost" data-printmap>🖨️ ${esc(t('map.printMap'))}</button><a class="btn btn-ghost" href="${routesHref}">🧭 ${esc(t('nav.routes'))}</a></div>
<p class="muted small">⚠️ ${esc(t('map.osmNote'))}</p>
<div class="grid two-col"><section class="nearest" id="m-nearest"></section><section id="m-official"></section></div>
<dialog id="place-dlg"><form method="dialog" class="form-grid"><h2>${esc(t('map.addPlace'))}</h2>
<label class="field-row"><span class="lbl">${esc(t('map.placeName'))}</span><input name="name" required></label>
<label class="field-row"><span class="lbl">${esc(t('map.placeType'))}</span><select name="type">${PLACE_TYPES.map((x) => `<option value="${x}">${PLACE_ICON[x]} ${esc(t('ptype.' + x))}</option>`).join('')}</select></label>
<label class="field-row"><span class="lbl">${esc(t('map.placeNote'))}</span><input name="note"></label>
<div class="btn-row"><button class="btn" value="ok">${esc(t('c.save'))}</button><button class="btn btn-ghost" value="cancel" formnovalidate>${esc(t('c.cancel'))}</button></div></form></dialog>
</div>`;

  const status = (s) => { $('#m-status', el).textContent = s; };
  if (!L) { status('Leaflet?'); return; }

  const h0 = home();
  map = L.map($('#map', el), { zoomControl: true }).setView(h0 ? [h0.lat, h0.lon] : [48.7, 19.5], h0 ? 14 : 7);
  addBasemap(map);
  window.__kpMap = map; // pre automatické testy
  for (const id of [...Object.keys(LAYERS), 'mine', 'npp']) groups[id] = L.layerGroup().addTo(map);

  const icon = (emoji, color, cls = '') => L.divIcon({ className: 'mk ' + cls, html: `<span style="--c:${color}">${emoji}</span>`, iconSize: [30, 30], iconAnchor: [15, 15], popupAnchor: [0, -14] });
  let hereMarker = null;
  // Miesto z vyhľadávania alebo GPS: ukáž ho a ponúkni, čo s ním
  function showFound(lat, lon, title, zoom = 16) {
    map.setView([lat, lon], zoom);
    if (hereMarker) hereMarker.remove();
    hereMarker = L.marker([lat, lon], { icon: emojiIcon('📍', '#be185d') }).addTo(map);
    hereMarker.bindPopup(`<strong>${esc(title)}</strong><div class="popup-actions"><button data-sethome="${lat},${lon}" data-label="${esc(title)}">🏠 ${esc(t('map.setHome'))}</button><button data-newplace="${lat},${lon}">⭐ ${esc(t('map.addPlace'))}</button><button data-odest="${lat},${lon}" data-name="${esc(title.split(',')[0])}">🧭 ${esc(t('map.routeHere'))}</button></div>`).openPopup();
  }

  function drawHome() {
    if (homeMarker) homeMarker.remove();
    const h = home();
    if (!h) { status(t('map.noHome')); return; }
    homeMarker = L.marker([h.lat, h.lon], { icon: icon('🏠', '#0b3d91', 'home'), zIndexOffset: 1000, draggable: true, title: t('loc.drag') }).addTo(map)
      .bindPopup(`<strong>${esc(t('map.home'))}</strong><br>${esc(p.location.label || '')}<br><small class="muted">${esc(t('map.homeDrag'))}</small>`);
    homeMarker.on('dragend', () => { const ll = homeMarker.getLatLng(); setHome(ll.lat, ll.lng, null, null, false); toast(t('map.homeMoved')); });
  }
  function drawNpp() {
    groups.npp.clearLayers();
    const c = home() || { lat: map.getCenter().lat, lon: map.getCenter().lng };
    for (const n of NPP) {
      const d = distanceKm(c, n);
      if (d > 200) continue;
      L.circle([n.lat, n.lon], { radius: 20000, color: '#b91c1c', weight: 1, fillOpacity: 0.04, dashArray: '4 4' }).addTo(groups.npp);
      L.marker([n.lat, n.lon], { icon: icon('☢️', '#b91c1c') }).addTo(groups.npp).bindPopup(`<strong>${esc(t('map.npp'))}: ${esc(n.name)}</strong><br>${num(d)} km`);
    }
  }
  function drawMine() {
    groups.mine.clearLayers();
    for (const pl of p.places || []) {
      L.marker([pl.lat, pl.lon], { icon: icon(PLACE_ICON[pl.type] || '⭐', '#7c3aed', 'mine') }).addTo(groups.mine)
        .bindPopup(`<strong>${esc(pl.name)}</strong><br>${esc(t('ptype.' + pl.type))}${pl.note ? '<br>' + esc(pl.note) : ''}<div class="popup-actions"><button data-pdest="${pl.id}">🧭 ${esc(t('map.routeHere'))}</button><button data-pdel="${pl.id}">✕ ${esc(t('c.delete'))}</button></div>`);
    }
    for (const d of p.mobility.destinations || []) {
      L.marker([d.lat, d.lon], { icon: icon('🏁', '#0f766e', 'mine') }).addTo(groups.mine).bindPopup(`<strong>${esc(d.name)}</strong><br>${esc(d.label || '')}`);
    }
  }
  function popupFor(e, layer) {
    const tg = e.tags || {};
    const h = home();
    const dist = h ? `${num(distanceKm(h, e), 1)} km` : '';
    if (tg.kp_official) {
      // úkryt zo zverejneného zoznamu mesta alebo okresného úradu
      const cls = tg.shelter_class;
      return `<strong>🛡️ ${esc(tg.name || t('layer.shelter'))}</strong>${dist ? ` · ${dist}` : ''}
<div>${esc(t('sh.type.' + cls) || cls)}</div><div><small>${esc(tg.city || '')}</small></div>
${tg.capacity ? `<div><small>${esc(t('sh.capacity'))}:</small> ${esc(tg.capacity)}</div>` : ''}${tg.operator ? `<div><small>operator:</small> ${esc(tg.operator)}</div>` : ''}${tg.description ? `<div><small>${esc(tg.description)}</small></div>` : ''}
${tg.approx ? `<div><small>⚠️ ${esc(t('sh.approx'))}</small></div>` : ''}<div><small>${esc(t('sh.source'))}: <a href="${esc(tg.url)}" target="_blank" rel="noopener">${esc(tg.source)}</a></small></div>
<p class="small">${esc(t('sh.check'))}</p>
<div class="popup-actions"><button data-odest="${e.lat},${e.lon}" data-name="${esc(tg.name || t('layer.shelter'))}">🧭 ${esc(t('map.routeHere'))}</button><button data-osave="${e.lat},${e.lon}" data-name="${esc(tg.name || t('layer.shelter'))}" data-type="shelter">⭐ ${esc(t('map.saveMine'))}</button></div>`;
    }
    const rows = [['addr:street', tg['addr:street'] ? `${tg['addr:street']} ${tg['addr:housenumber'] || ''}` : ''], ['opening_hours', tg.opening_hours], ['capacity', tg.capacity], ['access', tg.access], ['operator', tg.operator], ['phone', tg.phone || tg['contact:phone']], ['wheelchair', tg.wheelchair], ['description', tg.description]]
      .filter(([, v]) => v).map(([k, v]) => `<div><small>${esc(k)}:</small> ${esc(v)}</div>`).join('');
    return `<strong>${LAYERS[layer].icon} ${esc(tg.name || t('layer.' + layer))}</strong>${dist ? ` · ${dist}` : ''}${rows}${layer === 'bunker' ? `<p class="small">⚠️ ${esc(t('sh.bunker'))}</p>` : ''}
<div class="popup-actions"><button data-odest="${e.lat},${e.lon}" data-name="${esc(tg.name || t('layer.' + layer))}">🧭 ${esc(t('map.routeHere'))}</button><button data-osave="${e.lat},${e.lon}" data-name="${esc(tg.name || t('layer.' + layer))}" data-type="${layer === 'shelter' || layer === 'underground' ? 'shelter' : layer === 'water' ? 'water' : 'help'}">⭐ ${esc(t('map.saveMine'))}</button></div>
${['node', 'way', 'relation'].includes(e.type) ? `<div><small><a href="https://www.openstreetmap.org/${e.type}/${e.id}" target="_blank" rel="noopener">OSM</a></small></div>` : ''}`;
  }
  function drawElements() {
    for (const id of Object.keys(LAYERS)) groups[id].clearLayers();
    for (const e of elements) {
      const layer = classify(e.tags || {});
      if (!layer || !layersOn.has(layer)) continue;
      // jednoduché úkryty (JÚBS) menšou značkou – v mestách ich sú stovky
      const small = e.tags?.shelter_class === 'JUBS';
      L.marker([e.lat, e.lon], { icon: small ? L.divIcon({ className: 'mk mk-sm', html: `<span style="--c:${LAYERS[layer].color}"></span>`, iconSize: [14, 14], iconAnchor: [7, 7], popupAnchor: [0, -6] }) : icon(LAYERS[layer].icon, LAYERS[layer].color), zIndexOffset: small ? -100 : 0 }).addTo(groups[layer]).bindPopup(() => popupFor(e, layer));
    }
    drawNearest();
  }
  function drawNearest() {
    const h = home() || { lat: map.getCenter().lat, lon: map.getCenter().lng };
    const by = {};
    for (const e of elements) { const l = classify(e.tags || {}); if (l && l !== 'bunker') (by[l] ||= []).push({ e, d: distanceKm(h, e) }); }
    const parts = Object.keys(LAYERS).filter((l) => by[l]?.length).map((l) => `<h3>${LAYERS[l].icon} ${esc(t('layer.' + l))}</h3><ol>${by[l].sort((a, b) => a.d - b.d).slice(0, 3).map(({ e, d }) => `<li><a href="#" data-goto="${e.lat},${e.lon}">${esc(e.tags?.name || t('layer.' + l))}</a> – ${num(d, 1)} km</li>`).join('')}</ol>`);
    $('#m-nearest', el).innerHTML = parts.length ? `<h2>${esc(t('map.nearest'))}</h2>${parts.join('')}` : '';
  }
  function drawOfficial() {
    const c = countryByCode(p.location.country || 'SK');
    if (!c) { $('#m-official', el).innerHTML = ''; return; }
    const links = [...(c.cc === 'SK' ? [{ label: t('map.skOverview'), url: '#/kryty', local: true }] : []), ...(c.maps || []).filter((m) => m.url), c.guide ? { label: c.guide.title, url: c.guide.url } : null, { label: c.authority.name, url: c.authority.url }].filter(Boolean);
    $('#m-official', el).innerHTML = `<h2>${esc(t('map.official', { country: `${c.flag} ${T(c.name)}` }))}</h2><p class="small">${esc(T(c.shelters))}</p><ul>${links.map((m) => `<li><a href="${esc(m.url)}"${m.local ? '' : ' target="_blank" rel="noopener"'}>${esc(T(m.label))}</a></li>`).join('')}</ul><p class="small"><strong>112</strong>${c.numbers.police ? ` · ${esc(c.numbers.police)}` : ''}${c.numbers.fire ? ` · ${esc(c.numbers.fire)}` : ''}${c.numbers.ambulance ? ` · ${esc(c.numbers.ambulance)}` : ''}</p>`;
  }

  function loadCached() {
    const h = home() || { lat: map.getCenter().lat, lon: map.getCenter().lng };
    const k = cacheKey(h.lat, h.lon, radius);
    const c = store.state.overpass[k];
    if (c) { elements = c.elements; loadedAt = c.ts; drawElements(); status(t('map.loaded', { n: elements.length, date: new Date(c.ts).toLocaleDateString(LANG) })); }
  }
  async function load(force = false) {
    const h = home() || { lat: map.getCenter().lat, lon: map.getCenter().lng };
    status(t('c.loading'));
    // Slovensko: offline údaje priložené k aplikácii (okamžite, bez internetu)
    if (inDetailArea(h.lat, h.lon) && !force) {
      try {
        elements = await poisNear(h.lat, h.lon, radius);
        const d = await poiData();
        loadedAt = Date.parse(d.date) || Date.now();
        drawElements();
        status(t('map.loadedOffline', { n: elements.length, date: new Date(loadedAt).toLocaleDateString(LANG) }));
        return;
      } catch { /* offline údaje chýbajú – skús internet */ }
    }
    if (navigator.onLine === false) { status(t('map.offlineOutside')); loadCached(); return; }
    try {
      const all = Object.keys(LAYERS);
      const r = await overpass(layerQuery(all, h.lat, h.lon, radius));
      elements = r.elements.map((e) => ({ type: e.type, id: e.id, lat: e.lat ?? e.center?.lat, lon: e.lon ?? e.center?.lon, tags: pickTags(e.tags) })).filter((e) => e.lat != null);
      loadedAt = Date.now();
      const keys = Object.keys(store.state.overpass);
      if (keys.length >= 5) delete store.state.overpass[keys[0]];
      store.state.overpass[cacheKey(h.lat, h.lon, radius)] = { ts: loadedAt, elements };
      store.saveState();
      drawElements();
      status(t('map.loaded', { n: elements.length, date: new Date(loadedAt).toLocaleDateString(LANG) }));
    } catch (e) {
      status(navigator.onLine === false ? t('c.offline') : t('map.error'));
      loadCached();
    }
  }
  function setHome(lat, lon, label, country, recenter = true) {
    p.location.lat = lat; p.location.lon = lon;
    p.location.label = label || '';
    if (country && countryByCode(country)) p.location.country = country;
    store.saveProfile();
    if (hereMarker) { hereMarker.remove(); hereMarker = null; }
    drawHome(); drawNpp(); drawOfficial();
    if (recenter) map.setView([lat, lon], 14);
    if (inDetailArea(lat, lon)) load();
    if (!label) reverse(lat, lon, LANG).then((r) => { p.location.label = r.label; if (countryByCode(r.country)) p.location.country = r.country; store.saveProfile(); drawHome(); drawOfficial(); }).catch(() => {});
  }
  function addDestination(lat, lon, name) {
    p.mobility.destinations.push({ id: uid(), name, label: name, lat, lon });
    store.saveProfile(); drawMine();
    toast(`🏁 ${name}`);
  }

  map.on('click', (e) => {
    const { lat, lng } = e.latlng;
    if (addMode) { addMode = false; openPlaceDialog(lat, lng); return; }
    L.popup().setLatLng(e.latlng).setContent(`<strong>${esc(t('map.clickMenu'))}</strong><div class="popup-actions"><button data-sethome="${lat},${lng}">🏠 ${esc(t('map.setHome'))}</button><button data-newplace="${lat},${lng}">⭐ ${esc(t('map.addPlace'))}</button><button data-odest="${lat},${lng}" data-name="${lat.toFixed(4)}, ${lng.toFixed(4)}">🧭 ${esc(t('map.routeHere'))}</button></div>`).openOn(map);
  });
  function openPlaceDialog(lat, lon) {
    const dlg = $('#place-dlg', el);
    dlg.querySelector('form').reset();
    dlg.showModal();
    dlg.onclose = () => {
      if (dlg.returnValue !== 'ok') return;
      const f = new FormData(dlg.querySelector('form'));
      (p.places ||= []).push({ id: uid(), lat, lon, name: f.get('name') || t('ptype.' + f.get('type')), type: f.get('type'), note: f.get('note') });
      store.saveProfile(); drawMine();
    };
  }

  // Delegované akcie (aj v popupoch)
  const onClick = async (e) => {
    const tg = e.target;
    const sh = tg.closest('[data-sethome]');
    if (sh) { const [a, b] = sh.dataset.sethome.split(',').map(Number); map.closePopup(); setHome(a, b, sh.dataset.label || null); }
    const np = tg.closest('[data-newplace]');
    if (np) { const [a, b] = np.dataset.newplace.split(',').map(Number); map.closePopup(); openPlaceDialog(a, b); }
    const od = tg.closest('[data-odest]');
    if (od) { const [a, b] = od.dataset.odest.split(',').map(Number); map.closePopup(); addDestination(a, b, od.dataset.name); }
    const os = tg.closest('[data-osave]');
    if (os) { const [a, b] = os.dataset.osave.split(',').map(Number); (p.places ||= []).push({ id: uid(), lat: a, lon: b, name: os.dataset.name, type: os.dataset.type }); store.saveProfile(); drawMine(); map.closePopup(); toast('⭐ ' + os.dataset.name); }
    const pd = tg.closest('[data-pdest]');
    if (pd) { const pl = p.places.find((x) => x.id === pd.dataset.pdest); if (pl) addDestination(pl.lat, pl.lon, pl.name); map.closePopup(); }
    const pdel = tg.closest('[data-pdel]');
    if (pdel) { p.places = p.places.filter((x) => x.id !== pdel.dataset.pdel); store.saveProfile(); drawMine(); map.closePopup(); }
    const go = tg.closest('[data-goto]');
    if (go) { e.preventDefault(); const [a, b] = go.dataset.goto.split(',').map(Number); map.setView([a, b], 17); }
    const ly = tg.closest('[data-layer]');
    if (ly) {
      const id = ly.dataset.layer;
      if (id === 'mine') { const on = map.hasLayer(groups.mine); on ? map.removeLayer(groups.mine) : map.addLayer(groups.mine); ly.setAttribute('aria-pressed', String(!on)); return; }
      layersOn.has(id) ? layersOn.delete(id) : layersOn.add(id);
      ly.setAttribute('aria-pressed', String(layersOn.has(id)));
      prefs.mapLayers = [...layersOn]; store.savePrefs();
      drawElements();
    }
    if (tg.closest('[data-load]')) load();
    if (tg.closest('[data-addplace]')) { addMode = true; toast(t('map.clickToAdd')); }
    if (tg.closest('[data-printmap]')) printMap();
  };
  el.addEventListener('click', onClick);
  el.addEventListener('change', (e) => {
    if (e.target.matches('[data-radius]')) {
      radius = Number(e.target.value); prefs.mapRadius = radius; store.savePrefs();
      const h = home() || { lat: map.getCenter().lat, lon: map.getCenter().lng };
      if (inDetailArea(h.lat, h.lon)) load(); else loadCached();
    }
  });
  searchBox($('#m-search', el), {
    onPick: (r) => showFound(r.lat, r.lon, r.label, r.zoom || 16),
    onGps: (pos) => showFound(pos.lat, pos.lon, t('map.youAreHere')),
    near: () => home() || { lat: map.getCenter().lat, lon: map.getCenter().lng },
  });
  function printMap() {
    document.body.classList.add('print-map');
    map.invalidateSize();
    const h = home();
    if (h) map.setView([h.lat, h.lon], map.getZoom());
    setTimeout(() => { window.print(); }, 1200);
    const done = () => { document.body.classList.remove('print-map'); map.invalidateSize(); window.removeEventListener('afterprint', done); };
    window.addEventListener('afterprint', done);
  }

  drawHome(); drawNpp(); drawMine(); drawOfficial(); loadCached();
  { const h = home(); if (h && (inDetailArea(h.lat, h.lon) || (!elements.length && navigator.onLine !== false))) load(); }
  setTimeout(() => map.invalidateSize(), 200);
  return () => { el.removeEventListener('click', onClick); map.remove(); };
}

// Zachovaj len užitočné značky (šetrí úložisko)
function pickTags(tags = {}) {
  const keep = ['name', 'amenity', 'emergency', 'shelter_type', 'bunker_type', 'building', 'military', 'parking', 'station', 'subway', 'man_made', 'natural', 'drinking_water', 'addr:street', 'addr:housenumber', 'opening_hours', 'capacity', 'access', 'operator', 'phone', 'contact:phone', 'wheelchair', 'description'];
  const o = {};
  for (const k of keep) if (tags[k]) o[k] = tags[k];
  return o;
}
