// Prístup k verejným službám OpenStreetMap: geokódovanie (Nominatim), Overpass, smerovanie (OSRM).
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

export async function geocode(q, lang = 'sk') {
  const url = `${NOMINATIM}/search?format=jsonv2&limit=6&addressdetails=1&accept-language=${lang}&q=${encodeURIComponent(q)}`;
  const r = await fetchJson(url);
  return r.map((x) => ({ lat: Number(x.lat), lon: Number(x.lon), label: x.display_name, country: (x.address?.country_code || '').toUpperCase() }));
}
export async function reverse(lat, lon, lang = 'sk') {
  const url = `${NOMINATIM}/reverse?format=jsonv2&zoom=16&addressdetails=1&accept-language=${lang}&lat=${lat}&lon=${lon}`;
  const x = await fetchJson(url);
  return { label: x.display_name || `${lat.toFixed(5)}, ${lon.toFixed(5)}`, country: (x.address?.country_code || '').toUpperCase() };
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
  shelter: { color: '#c2410c', icon: '🛡️', q: ['nwr["shelter_type"="bomb_shelter"]', 'nwr["bunker_type"~"bomb_shelter|air_raid_shelter|civil_defence|civil_protection"]', 'nwr["building"="bunker"]["military"!~"."]', 'nwr["emergency"="shelter"]'] },
  assembly: { color: '#15803d', icon: '🟩', q: ['nwr["emergency"="assembly_point"]'] },
  underground: { color: '#6b21a8', icon: 'Ⓜ️', q: ['nwr["amenity"="parking"]["parking"="underground"]', 'nwr["station"="subway"]', 'nwr["railway"="station"]["subway"="yes"]'] },
  hospital: { color: '#dc2626', icon: '🏥', q: ['nwr["amenity"="hospital"]'] },
  pharmacy: { color: '#16a34a', icon: '💊', q: ['nwr["amenity"="pharmacy"]'] },
  emergency: { color: '#1d4ed8', icon: '🚒', q: ['nwr["amenity"="fire_station"]', 'nwr["amenity"="police"]'] },
  townhall: { color: '#0b3d91', icon: '🏛️', q: ['nwr["amenity"="townhall"]'] },
  water: { color: '#0284c7', icon: '🚰', q: ['nwr["amenity"="drinking_water"]', 'nwr["man_made"="water_well"]["drinking_water"="yes"]', 'nwr["natural"="spring"]["drinking_water"="yes"]', 'nwr["amenity"="water_point"]'] },
  fuel: { color: '#a16207', icon: '⛽', q: ['nwr["amenity"="fuel"]'] },
};

export function layerQuery(layers, lat, lon, radius) {
  const parts = [];
  for (const id of layers) for (const f of LAYERS[id].q) parts.push(`${f}(around:${radius},${lat},${lon});`);
  return `[out:json][timeout:35];(${parts.join('')});out center tags 1500;`;
}

export function classify(tags) {
  if (tags.shelter_type === 'bomb_shelter' || tags.bunker_type || tags.building === 'bunker' || tags.emergency === 'shelter') return 'shelter';
  if (tags.emergency === 'assembly_point') return 'assembly';
  if (tags.parking === 'underground' || tags.station === 'subway' || tags.subway === 'yes') return 'underground';
  if (tags.amenity === 'hospital') return 'hospital';
  if (tags.amenity === 'pharmacy') return 'pharmacy';
  if (tags.amenity === 'fire_station' || tags.amenity === 'police') return 'emergency';
  if (tags.amenity === 'townhall') return 'townhall';
  if (tags.amenity === 'fuel') return 'fuel';
  return 'water';
}

// Rozdelenie mapy na dlaždice v okruhu (na offline uloženie)
export function tileUrls(lat, lon, km, zmin = 12, zmax = 16) {
  const urls = [];
  const toTile = (la, lo, z) => {
    const n = 2 ** z;
    const x = Math.floor(((lo + 180) / 360) * n);
    const r = (la * Math.PI) / 180;
    const y = Math.floor(((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * n);
    return [x, y];
  };
  const dLat = km / 111, dLon = km / (111 * Math.cos((lat * Math.PI) / 180));
  for (let z = zmin; z <= zmax; z++) {
    const [x1, y1] = toTile(lat + dLat, lon - dLon, z);
    const [x2, y2] = toTile(lat - dLat, lon + dLon, z);
    for (let x = x1; x <= x2; x++) for (let y = y1; y <= y2; y++) urls.push(`https://tile.openstreetmap.org/${z}/${x}/${y}.png`);
  }
  return urls;
}
