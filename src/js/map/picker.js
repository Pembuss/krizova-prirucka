// Výber miesta: návrhy počas písania, súradnice, „Moja poloha“, klik do mapy a presunutie značky.
import { t, esc, LANG } from '../app/core.js';
import { store } from '../app/store.js';
import { suggest, geocode, reverse } from './geo.js';
import { addBasemap } from './tiles.js';

// Poloha zo zariadenia; chyba nesie kľúč zrozumiteľnej správy.
export function locate() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) { reject(new Error('loc.gpsNo')); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude, acc: pos.coords.accuracy }),
      (err) => reject(new Error(err.code === 1 ? 'loc.gpsDenied' : err.code === 3 ? 'loc.gpsTimeout' : 'loc.gpsUnavailable')),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 },
    );
  });
}

export function emojiIcon(emoji, color = '#0b3d91') {
  return window.L.divIcon({ className: 'mk', html: `<span style="--c:${color}">${emoji}</span>`, iconSize: [30, 30], iconAnchor: [15, 15], popupAnchor: [0, -14] });
}

const homeNear = () => (store.profile.location?.lat != null ? store.profile.location : null);

// Vyhľadávacie pole s návrhmi. onPick({ lat, lon, label, country, kind }), onGps({ lat, lon })
export function searchBox(host, { onPick, onGps, near = homeNear, placeholder, gps = true } = {}) {
  const id = 'sb' + Math.random().toString(36).slice(2, 8);
  host.innerHTML = `<div class="sb">
<div class="sb-row"><input type="search" id="${id}" class="sb-q" placeholder="${esc(placeholder || t('loc.searchPh'))}" aria-label="${esc(t('loc.search'))}" autocomplete="off" spellcheck="false" role="combobox" aria-autocomplete="list" aria-controls="${id}-list" aria-expanded="false">
<button type="button" class="btn sb-go">🔎 ${esc(t('loc.searchBtn'))}</button>${gps ? `<button type="button" class="btn btn-ghost sb-gps">📍 ${esc(t('loc.gpsShort'))}</button>` : ''}
<ul class="sb-list" id="${id}-list" role="listbox" hidden></ul></div>
<p class="sb-msg small" aria-live="polite"></p></div>`;
  const q = host.querySelector('.sb-q');
  const list = host.querySelector('.sb-list');
  const msg = host.querySelector('.sb-msg');
  let items = [], active = -1, timer = null, seq = 0;

  const say = (text, kind = '') => { msg.textContent = text; msg.className = 'sb-msg small ' + kind; };
  const close = () => { list.hidden = true; q.setAttribute('aria-expanded', 'false'); active = -1; };
  const render = () => {
    if (!items.length) { close(); return; }
    list.innerHTML = items.map((r, i) => {
      const [head, ...rest] = r.label.split(', ');
      return `<li role="option" id="${id}-o${i}" data-i="${i}" aria-selected="${i === active}"><strong>${esc(head)}</strong>${rest.length ? `<small>${esc(rest.join(', '))}</small>` : ''}</li>`;
    }).join('');
    list.hidden = false;
    q.setAttribute('aria-expanded', 'true');
    q.setAttribute('aria-activedescendant', active >= 0 ? `${id}-o${active}` : '');
  };
  const pick = (r) => {
    close();
    q.value = r.kind === 'coords' ? r.label : r.label.split(', ')[0];
    say('');
    onPick?.(r);
  };
  async function run(full) {
    const text = q.value.trim();
    if (text.length < (full ? 1 : 3)) { items = []; close(); return; }
    const my = ++seq;
    if (full) say(t('loc.searching'));
    try {
      const n = typeof near === 'function' ? near() : near;
      const res = full ? await geocode(text, LANG, { near: n }) : await suggest(text, LANG, n);
      if (my !== seq) return;
      items = res; active = -1;
      if (full && res.length === 1) { pick(res[0]); return; }
      render();
      if (full) say(res.length ? t('loc.choose') : t('loc.notFoundHint'), res.length ? '' : 'warn');
    } catch {
      if (my !== seq) return;
      items = []; close();
      if (full) say(t('loc.searchErr'), 'warn');
    }
  }

  q.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(() => run(false), 350); });
  q.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown' && items.length) { e.preventDefault(); active = (active + 1) % items.length; render(); }
    else if (e.key === 'ArrowUp' && items.length) { e.preventDefault(); active = (active - 1 + items.length) % items.length; render(); }
    else if (e.key === 'Escape') close();
    else if (e.key === 'Enter') { e.preventDefault(); clearTimeout(timer); if (active >= 0 && !list.hidden) pick(items[active]); else run(true); }
  });
  q.addEventListener('blur', () => setTimeout(close, 200));
  // mousedown, aby výber prebehol pred stratou zamerania poľa
  list.addEventListener('mousedown', (e) => { const li = e.target.closest('[data-i]'); if (li) { e.preventDefault(); pick(items[Number(li.dataset.i)]); } });
  host.querySelector('.sb-go').addEventListener('click', () => { clearTimeout(timer); run(true); });
  host.querySelector('.sb-gps')?.addEventListener('click', async () => {
    say(t('loc.gpsWait'));
    try {
      const pos = await locate();
      say(t('loc.gpsOk', { acc: Math.round(pos.acc || 0) }), 'ok');
      (onGps || ((p) => onPick?.({ ...p, label: null })))(pos);
    } catch (err) { say(t(err.message), 'warn'); }
  });
  return { input: q, say };
}

// Výber miesta s mapou. value { lat, lon, label, country }; onChange dostane rovnaký tvar.
export function locationPicker(host, { value, onChange, height = 300, markers = [], icon = '📍', color = '#0b3d91', label } = {}) {
  const L = window.L;
  host.innerHTML = `<div class="lp"><div class="lp-search"></div>
<div class="lp-map" style="height:${height}px" role="application" aria-label="${esc(t('nav.map'))}"></div>
<p class="lp-hint muted small">🖱️ ${esc(t('loc.hintMap'))}</p>
<p class="lp-current"><strong>${esc(label || t('loc.current'))}:</strong> <span class="lp-label"></span> <small class="lp-coords muted"></small></p></div>`;
  const labelEl = host.querySelector('.lp-label');
  const coordsEl = host.querySelector('.lp-coords');
  let cur = value && value.lat != null ? { lat: value.lat, lon: value.lon, label: value.label || '', country: value.country || '' } : null;
  let marker = null, seq = 0;

  const map = L.map(host.querySelector('.lp-map')).setView(cur ? [cur.lat, cur.lon] : [48.7, 19.5], cur ? 15 : 7);
  addBasemap(map);
  for (const m of markers) L.marker([m.lat, m.lon], { icon: emojiIcon(m.icon || '⭐', m.color), keyboard: false }).addTo(map).bindTooltip(m.title || '');

  const paint = () => {
    labelEl.textContent = cur ? cur.label || '…' : t('loc.none');
    coordsEl.textContent = cur ? `(${cur.lat.toFixed(5)}, ${cur.lon.toFixed(5)})` : '';
  };
  function place(lat, lon, lbl, country, { zoom, silent = false } = {}) {
    cur = { lat, lon, label: lbl || '', country: country || '' };
    if (!marker) {
      marker = L.marker([lat, lon], { draggable: true, autoPan: true, icon: emojiIcon(icon, color), title: t('loc.drag') }).addTo(map);
      marker.on('dragend', () => { const ll = marker.getLatLng(); place(ll.lat, ll.lng); });
    } else marker.setLatLng([lat, lon]);
    if (zoom) map.setView([lat, lon], zoom);
    else if (!map.getBounds().contains([lat, lon])) map.panTo([lat, lon]);
    if (!lbl) {
      const my = ++seq;
      labelEl.textContent = t('loc.resolving');
      reverse(lat, lon, LANG).then((r) => {
        if (my !== seq || !cur) return;
        cur.label = r.label; if (r.country) cur.country = r.country;
        paint(); onChange?.({ ...cur });
      });
    } else paint();
    if (!silent) onChange?.({ ...cur });
  }

  map.on('click', (e) => place(e.latlng.lat, e.latlng.lng));
  const box = searchBox(host.querySelector('.lp-search'), {
    onPick: (r) => place(r.lat, r.lon, r.kind === 'coords' ? null : r.label, r.country, { zoom: 16 }),
    onGps: (pos) => place(pos.lat, pos.lon, null, null, { zoom: 16 }),
    near: () => cur || homeNear() || { lat: map.getCenter().lat, lon: map.getCenter().lng },
  });
  if (cur) place(cur.lat, cur.lon, cur.label, cur.country, { silent: true });
  else paint();
  setTimeout(() => map.invalidateSize(), 150);
  return {
    map, box,
    get: () => (cur ? { ...cur } : null),
    clear: () => { cur = null; if (marker) { marker.remove(); marker = null; } box.input.value = ''; paint(); },
    refresh: () => map.invalidateSize(),
    destroy: () => map.remove(),
  };
}
