// Vyhľadanie miest, adries a trás. Najprv offline údaje priložené k aplikácii (offdata.js, router.js),
// verejné služby OpenStreetMap (Photon, Nominatim, Overpass, OSRM) iba ako doplnok, keď je internet.
import { searchOffline, reverseOffline } from './offdata.js';
const NOMINATIM = 'https://nominatim.openstreetmap.org';
const OVERPASS = ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter', 'https://maps.mail.ru/osm/tools/overpass/api/interpreter', 'https://overpass.private.coffee/api/interpreter'];
const ROUTERS = {
  car: ['https://routing.openstreetmap.de/routed-car/route/v1/driving', 'https://router.project-osrm.org/route/v1/driving'],
  foot: ['https://routing.openstreetmap.de/routed-foot/route/v1/driving'],
  bike: ['https://routing.openstreetmap.de/routed-bike/route/v1/driving'],
};

async function fetchJson(url, opts = {}, timeout = 25000) {
  const ctl = new AbortController();
  const tm = setTimeout(() => ctl.abort(), timeout);
  try {
    const res = await fetch(url, { ...opts, signal: ctl.signal });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return await res.json();
  } finally { clearTimeout(tm); }
}

// Z disku (file://) prehliadač neposiela Referer a Nominatim takéto žiadosti odmieta – vtedy ide prvý Photon.
const LOCAL = typeof location !== 'undefined' && location.protocol === 'file:';
const PHOTON = 'https://photon.komoot.io';
const photonLang = (lang) => (['de', 'en', 'fr'].includes(lang) ? lang : 'default');

function photonLabel(pr) {
  const street = pr.street ? `${pr.street}${pr.housenumber ? ' ' + pr.housenumber : ''}` : '';
  const place = pr.city || pr.town || pr.village || pr.locality || pr.district || '';
  const parts = [pr.name, street, place, pr.county, pr.state, pr.country].filter(Boolean);
  return [...new Set(parts)].join(', ');
}
function fromPhoton(f) {
  const [lon, lat] = f.geometry.coordinates;
  return { lat, lon, label: photonLabel(f.properties || {}), country: (f.properties?.countrycode || '').toUpperCase(), kind: f.properties?.osm_value || '' };
}
async function photonSearch(q, lang, near, limit = 7) {
  const bias = near ? `&lat=${near.lat.toFixed(4)}&lon=${near.lon.toFixed(4)}` : '';
  const r = await fetchJson(`${PHOTON}/api/?q=${encodeURIComponent(q)}&limit=${limit}&lang=${photonLang(lang)}${bias}`, {}, 12000);
  // rovnaký názov (napr. obec a jej katastrálne územie) ukáž len raz
  const seen = new Set();
  return (r.features || []).map(fromPhoton).filter((x) => x.label && !seen.has(x.label) && seen.add(x.label));
}
async function nominatimSearch(q, lang) {
  const r = await fetchJson(`${NOMINATIM}/search?format=jsonv2&limit=7&addressdetails=1&accept-language=${lang}&q=${encodeURIComponent(q)}`, {}, 12000);
  return r.map((x) => ({ lat: Number(x.lat), lon: Number(x.lon), label: x.display_name, country: (x.address?.country_code || '').toUpperCase(), kind: x.type || '' }));
}

// Súradnice zadané priamo: „48.1486, 17.1077“, „48,1486; 17,1077“ alebo „48°08'55\"N 17°06'28\"E“
export function parseCoords(q) {
  const s = String(q).trim();
  const dms = [...s.matchAll(/(\d{1,3})[°\s]+(\d{1,2})['’′\s]+(\d{1,2}(?:[.,]\d+)?)?["”″]?\s*([NSEWnsewSJVZ])/g)];
  if (dms.length === 2) {
    const v = dms.map((m) => { const x = Number(m[1]) + Number(m[2]) / 60 + Number((m[3] || '0').replace(',', '.')) / 3600; return /[SWsw]|Z/.test(m[4]) ? -x : x; });
    const latFirst = /[NSns]|J/.test(dms[0][4]) || !/[NSns]|J/.test(dms[1][4]);
    const [lat, lon] = latFirst ? v : [v[1], v[0]];
    if (Math.abs(lat) <= 90 && Math.abs(lon) <= 180) return { lat, lon };
  }
  // obe čísla s desatinnou časťou, aby sa za súradnice nepovažovalo napr. číslo domu
  const m = s.match(/^(-?\d{1,2}[.,]\d+)\s*[;,\s]\s*(-?\d{1,3}[.,]\d+)$/);
  if (m) {
    const lat = Number(m[1].replace(',', '.')), lon = Number(m[2].replace(',', '.'));
    if (Math.abs(lat) <= 90 && Math.abs(lon) <= 180) return { lat, lon };
  }
  return null;
}

const online = () => typeof navigator === 'undefined' || navigator.onLine !== false;
async function offlineFirst(q, lang, near, limit) {
  try { return await searchOffline(q, { near, lang, limit }); } catch { return []; }
}

// Vyhľadanie adresy: offline zoznam obcí a ulíc; ak nič nenájde a je internet, verejné služby.
export async function geocode(q, lang = 'sk', { near } = {}) {
  const c = parseCoords(q);
  if (c) return [{ ...c, label: `${c.lat.toFixed(5)}, ${c.lon.toFixed(5)}`, country: '', kind: 'coords' }];
  const off = await offlineFirst(q, lang, near, 8);
  if (off.length || !online()) return off;
  return geocodeOnline(q, lang, { near });
}
export async function geocodeOnline(q, lang = 'sk', { near } = {}) {
  const order = LOCAL ? [() => photonSearch(q, lang, near), () => nominatimSearch(q, lang)] : [() => nominatimSearch(q, lang), () => photonSearch(q, lang, near)];
  let lastErr = null;
  for (const run of order) {
    try { const r = await run(); if (r.length) return r; } catch (e) { lastErr = e; }
  }
  if (lastErr) throw lastErr;
  return [];
}
// Návrhy počas písania – offline; Photon iba ak offline nič nenájde (Nominatim dopĺňanie nepovoľuje).
export async function suggest(q, lang = 'sk', near) {
  if (parseCoords(q)) return geocode(q, lang);
  const off = await offlineFirst(q, lang, near, 7);
  if (off.length || !online()) return off;
  return photonSearch(q, lang, near, 6);
}
// Spätné určenie adresy: offline (ulica, obec, štát); online iba ak offline nevie nič.
export async function reverse(lat, lon, lang = 'sk') {
  try {
    const r = await reverseOffline(lat, lon, lang);
    if (r && r.label && !/^-?\d+\.\d+, /.test(r.label)) return r;
    if (!online()) return r;
  } catch { /* offline údaje nie sú – skús internet */ }
  return reverseOnline(lat, lon, lang);
}
export async function reverseOnline(lat, lon, lang = 'sk') {
  const fallback = { label: `${lat.toFixed(5)}, ${lon.toFixed(5)}`, country: '' };
  const viaNominatim = async () => {
    const x = await fetchJson(`${NOMINATIM}/reverse?format=jsonv2&zoom=17&addressdetails=1&accept-language=${lang}&lat=${lat}&lon=${lon}`, {}, 12000);
    return { label: x.display_name || fallback.label, country: (x.address?.country_code || '').toUpperCase() };
  };
  const viaPhoton = async () => {
    const r = await fetchJson(`${PHOTON}/reverse?lat=${lat}&lon=${lon}&limit=1&lang=${photonLang(lang)}`, {}, 12000);
    const f = r.features?.[0];
    return f ? { label: photonLabel(f.properties || {}), country: (f.properties?.countrycode || '').toUpperCase() } : fallback;
  };
  for (const run of LOCAL ? [viaPhoton, viaNominatim] : [viaNominatim, viaPhoton]) {
    try { return await run(); } catch { /* skús ďalšiu službu */ }
  }
  return fallback;
}

export async function overpass(query, timeout = 40000) {
  let lastErr;
  for (const ep of OVERPASS) {
    try {
      return await fetchJson(ep, { method: 'POST', body: 'data=' + encodeURIComponent(query), headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }, timeout);
    } catch (e) { lastErr = e; }
  }
  throw lastErr || new Error('overpass');
}

export async function route(mode, points, { alternatives = true, steps = true } = {}) {
  const coords = points.map((p) => `${p.lon.toFixed(6)},${p.lat.toFixed(6)}`).join('%3B'); // zakódovaná bodkočiarka – niektoré proxy ju v ceste odmietajú
  const q = `overview=full&geometries=geojson&steps=${steps}&alternatives=${alternatives ? 3 : 'false'}&annotations=false`;
  let lastErr;
  for (const base of ROUTERS[mode]) {
    try {
      const r = await fetchJson(`${base}/${coords}?${q}`);
      if (r.code !== 'Ok') throw new Error(r.code);
      return r.routes;
    } catch (e) { lastErr = e; }
  }
  throw lastErr || new Error('route');
}

// Vrstvy miest pre mapu (Overpass QL filtre)
export const LAYERS = {
  shelter: { color: '#c2410c', icon: '🛡️', q: ['nwr["shelter_type"="bomb_shelter"]', 'nwr["bunker_type"~"bomb_shelter|air_raid_shelter|civil_defence|civil_protection|personnel_shelter"]', 'nwr["emergency"="shelter"]'] },
  bunker: { color: '#57534e', icon: '🪖', q: ['nwr["military"="bunker"]', 'nwr["building"="bunker"]'] },
  assembly: { color: '#15803d', icon: '🟩', q: ['nwr["emergency"="assembly_point"]'] },
  underground: { color: '#6b21a8', icon: 'Ⓜ️', q: ['nwr["amenity"="parking"]["parking"="underground"]', 'nwr["station"="subway"]', 'nwr["railway"="station"]["subway"="yes"]'] },
  hospital: { color: '#dc2626', icon: '🏥', q: ['nwr["amenity"="hospital"]'] },
  pharmacy: { color: '#16a34a', icon: '💊', q: ['nwr["amenity"="pharmacy"]'] },
  emergency: { color: '#1d4ed8', icon: '🚒', q: ['nwr["amenity"="fire_station"]', 'nwr["amenity"="police"]'] },
  townhall: { color: '#0b3d91', icon: '🏛️', q: ['nwr["amenity"="townhall"]'] },
  water: { color: '#0284c7', icon: '🚰', q: ['nwr["amenity"="drinking_water"]', 'nwr["man_made"="water_well"]["drinking_water"="yes"]', 'nwr["natural"="spring"]["drinking_water"="yes"]', 'nwr["amenity"="water_point"]'] },
  fuel: { color: '#a16207', icon: '⛽', q: ['nwr["amenity"="fuel"]'] },
  aed: { color: '#15803d', icon: '❤️', q: ['nwr["emergency"="defibrillator"]'] },
};

export function layerQuery(layers, lat, lon, radius) {
  const parts = [];
  for (const id of layers) for (const f of LAYERS[id].q) parts.push(`${f}(around:${radius},${lat},${lon});`);
  return `[out:json][timeout:35];(${parts.join('')});out center tags 1500;`;
}

// Vrstva pre prvok podľa značiek (null = do žiadnej vrstvy nepatrí)
const SHELTER_BUNKER = /bomb_shelter|air_raid_shelter|civil_defence|civil_protection|personnel_shelter/;
export function classify(tags) {
  if (tags.shelter_type === 'bomb_shelter' || SHELTER_BUNKER.test(tags.bunker_type || '') || tags.emergency === 'shelter') return 'shelter';
  if (tags.military === 'bunker' || tags.building === 'bunker' || tags.bunker_type) return 'bunker';
  if (tags.emergency === 'defibrillator') return 'aed';
  if (tags.emergency === 'assembly_point') return 'assembly';
  if (tags.parking === 'underground' || tags.station === 'subway' || tags.subway === 'yes') return 'underground';
  if (tags.amenity === 'hospital') return 'hospital';
  if (tags.amenity === 'pharmacy') return 'pharmacy';
  if (tags.amenity === 'fire_station' || tags.amenity === 'police') return 'emergency';
  if (tags.amenity === 'townhall') return 'townhall';
  if (tags.amenity === 'fuel') return 'fuel';
  if (tags.amenity === 'drinking_water' || tags.amenity === 'water_point' || tags.man_made === 'water_well' || tags.natural === 'spring') return 'water';
  if (tags.emergency === 'ambulance_station' || tags.emergency === 'mountain_rescue') return 'emergency';
  return null;
}
