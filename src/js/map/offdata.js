// Offline údaje k mape: vyhľadávanie obcí a ulíc, spätné určenie adresy a štátu, dôležité miesta a úkryty.
// Všetko sa načíta z priložených súborov assets/map/*.js (bez internetu, aj z disku).
import { loadScript } from './offline.js';

const W = typeof window !== 'undefined' ? window : globalThis;
const S = W.__kpdata || (W.__kpdata = {});
W.KPMAP_GAZ = (d) => { S.gaz = d; };
W.KPMAP_POI = (d) => { S.poi = d; };
W.KPMAP_COUNTRIES = (d) => { S.countries = d; };
W.KPMAP_RIVERS = (d) => { S.rivers = d; };

const once = {};
function need(file, key) {
  if (S[key]) return Promise.resolve(S[key]);
  return (once[file] ||= loadScript(file).then(() => S[key]).catch((e) => { delete once[file]; throw e; }));
}

export const fold = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const R = 6371000;
export function distM(a, b) {
  const p1 = (a.lat * Math.PI) / 180, p2 = (b.lat * Math.PI) / 180;
  const dp = p2 - p1, dl = ((b.lon - a.lon) * Math.PI) / 180;
  const h = Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// ---------- štáty ----------
function inRing(x, y, r) {
  let inside = false;
  for (let i = 0, j = r.length - 2; i < r.length; j = i, i += 2) {
    const xi = r[i], yi = r[i + 1], xj = r[j], yj = r[j + 1];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
export async function countryAt(lat, lon) {
  const d = await need('countries.js', 'countries').catch(() => null);
  if (!d) return '';
  const x = Math.round(lon * 100), y = Math.round(lat * 100);
  for (const [cc, bbox, polys] of d.c) {
    if (x < bbox[0] || x > bbox[2] || y < bbox[1] || y > bbox[3]) continue;
    for (const rings of polys) {
      if (!inRing(x, y, rings[0])) continue;
      if (rings.slice(1).some((h) => inRing(x, y, h))) continue;
      return cc;
    }
  }
  return '';
}

// ---------- vyhľadávanie ----------
const KIND_RANK = { city: 0, town: 1, suburb: 2, village: 3, quarter: 4, hamlet: 5, street: 6, poi: 7 };
let idx = null;
function buildIndex(g) {
  const items = [];
  for (const p of g.p) {
    const [x, y, name, kind, parent, cc, pop] = p;
    items.push({ lat: y / 1e5, lon: x / 1e5, name, kind, ctx: parent || '', cc, pop: pop || 0, f: fold(name), fc: fold(parent) });
  }
  const undelta = (d) => { const a = new Int32Array(d.length); let x = 0, y = 0; for (let i = 0; i < d.length; i += 2) { x += d[i]; y += d[i + 1]; a[i] = x; a[i + 1] = y; } return a; };
  for (const s of g.s) {
    const [name, ci, raw] = s;
    const pts = undelta(raw);
    const ctx = ci >= 0 ? g.ctx[ci] : '';
    const mid = Math.floor(pts.length / 4) * 2;
    items.push({ lat: pts[mid + 1] / 1e5, lon: pts[mid] / 1e5, name, kind: 'street', ctx, cc: 'SK', pop: 0, f: fold(name), fc: fold(ctx), pts });
  }
  return items;
}
async function index() {
  if (idx) return idx;
  const g = await need('gaz.js', 'gaz');
  idx = buildIndex(g);
  return idx;
}

const KIND_LABEL = {
  sk: { city: 'mesto', town: 'mesto', village: 'obec', suburb: 'mestská časť', quarter: 'časť', hamlet: 'osada', street: 'ulica' },
  cs: { city: 'město', town: 'město', village: 'obec', suburb: 'městská část', quarter: 'část', hamlet: 'osada', street: 'ulice' },
  en: { city: 'city', town: 'town', village: 'village', suburb: 'district', quarter: 'quarter', hamlet: 'hamlet', street: 'street' },
};
export const CC_NAME = {
  SK: { sk: 'Slovensko', cs: 'Slovensko', en: 'Slovakia' }, CZ: { sk: 'Česko', cs: 'Česko', en: 'Czechia' }, AT: { sk: 'Rakúsko', cs: 'Rakousko', en: 'Austria' },
  HU: { sk: 'Maďarsko', cs: 'Maďarsko', en: 'Hungary' }, PL: { sk: 'Poľsko', cs: 'Polsko', en: 'Poland' }, UA: { sk: 'Ukrajina', cs: 'Ukrajina', en: 'Ukraine' },
  DE: { sk: 'Nemecko', cs: 'Německo', en: 'Germany' },
};
function labelOf(it, lang) {
  const kind = (KIND_LABEL[lang] || KIND_LABEL.sk)[it.kind] || '';
  const cc = CC_NAME[it.cc]?.[lang] || it.cc || '';
  const parts = [it.name, it.ctx && it.ctx !== it.name ? it.ctx : '', it.cc && it.cc !== 'SK' ? cc : ''].filter(Boolean);
  return { label: parts.join(', '), kindLabel: kind };
}

// „Hlavná 12, Košice“ → ulica „hlavna“, obec „kosice“ (číslo domu sa ignoruje – adresné body v balíku nie sú)
export async function searchOffline(q, { near, limit = 7, lang = 'sk' } = {}) {
  const items = await index();
  const raw = String(q).trim();
  if (raw.length < 2) return [];
  const [a, b] = raw.split(',').map((s) => fold(s.replace(/\b\d+[a-z]?(\/\d+[a-z]?)?\b/gi, '')));
  if (!a) return [];
  const words = a.split(' ').filter(Boolean);
  const out = [];
  for (const it of items) {
    let s = 0;
    if (it.f === a) s = 100;
    else if (it.f.startsWith(a)) s = 80;
    else if (words.every((w) => it.f.split(' ').some((x) => x.startsWith(w)))) s = 60;
    else if (it.f.includes(a)) s = 40;
    else continue;
    if (b) {
      if (it.fc.startsWith(b) || it.fc.split(' ').some((x) => x.startsWith(b))) s += 30;
      else if (it.kind === 'street') continue;
      else s -= 30;
    }
    s -= KIND_RANK[it.kind] * 3;
    s += Math.min(15, Math.log10(1 + it.pop) * 2.5);
    if (it.cc === 'SK') s += 4;
    if (near) s -= Math.min(25, distM(near, it) / 20000);
    out.push({ it, s });
  }
  out.sort((x, y) => y.s - x.s);
  const seen = new Set();
  const res = [];
  for (const { it } of out) {
    const { label, kindLabel } = labelOf(it, lang);
    if (seen.has(label)) continue;
    seen.add(label);
    res.push({ lat: it.lat, lon: it.lon, label, country: it.cc, kind: kindLabel, offline: true, zoom: it.kind === 'street' ? 17 : it.kind === 'city' ? 12 : it.kind === 'town' ? 13 : 14 });
    if (res.length >= limit) break;
  }
  return res;
}

// Spätné určenie: najbližšia ulica (do 250 m) a obec
let grid = null;
async function streetGrid() {
  if (grid) return grid;
  const items = await index();
  grid = { cells: new Map(), places: [] };
  for (const it of items) {
    if (it.kind === 'street') {
      for (let i = 0; i < it.pts.length; i += 2) {
        const k = `${Math.floor(it.pts[i] / 500)}:${Math.floor(it.pts[i + 1] / 500)}`;
        let c = grid.cells.get(k); if (!c) grid.cells.set(k, (c = []));
        c.push(it, it.pts[i] / 1e5, it.pts[i + 1] / 1e5);
      }
    } else grid.places.push(it);
  }
  return grid;
}
export async function reverseOffline(lat, lon, lang = 'sk') {
  const g = await streetGrid();
  const here = { lat, lon };
  let street = null, sd = 250;
  const cx = Math.floor((lon * 1e5) / 500), cy = Math.floor((lat * 1e5) / 500);
  for (let i = cx - 1; i <= cx + 1; i++) for (let j = cy - 1; j <= cy + 1; j++) {
    const c = g.cells.get(`${i}:${j}`); if (!c) continue;
    for (let k = 0; k < c.length; k += 3) { const d = distM(here, { lon: c[k + 1], lat: c[k + 2] }); if (d < sd) { sd = d; street = c[k]; } }
  }
  let place = null, pd = 15000;
  for (const p of g.places) {
    if (Math.abs(p.lat - lat) > 0.15 || Math.abs(p.lon - lon) > 0.2) continue;
    if (!['city', 'town', 'village', 'suburb'].includes(p.kind)) continue;
    const d = distM(here, p) * (p.kind === 'city' ? 0.6 : p.kind === 'town' ? 0.8 : 1);
    if (d < pd) { pd = d; place = p; }
  }
  const country = await countryAt(lat, lon);
  const parts = street ? [street.name, street.ctx || place?.name] : place ? [place.name, place.ctx] : [];
  if (country && country !== 'SK') parts.push(CC_NAME[country]?.[lang] || country);
  const label = [...new Set(parts.filter(Boolean))].join(', ');
  return { label: label || `${lat.toFixed(5)}, ${lon.toFixed(5)}`, country };
}

// ---------- dôležité miesta a úkryty ----------
// Vráti prvky v tvare ako z Overpass ({type, id, lat, lon, tags}), aby ich mapa kreslila rovnako.
const CAT_TAGS = {
  shelter: { amenity: 'shelter', shelter_type: 'bomb_shelter' },
  cdshelter: { emergency: 'shelter', kp_official: 'yes' },
  bunker: { military: 'bunker', kp_bunker: 'yes' },
  assembly: { emergency: 'assembly_point' },
  underground: { amenity: 'parking', parking: 'underground' },
  hospital: { amenity: 'hospital' },
  pharmacy: { amenity: 'pharmacy' },
  emergency: { amenity: 'fire_station' },
  townhall: { amenity: 'townhall' },
  water: { amenity: 'drinking_water' },
  fuel: { amenity: 'fuel' },
  aed: { emergency: 'defibrillator' },
  siren: { emergency: 'siren' },
};
export async function poiData() { return need('poi.js', 'poi'); }
export async function poisNear(lat, lon, radius, cats) {
  const d = await poiData();
  const here = { lat, lon };
  const out = [];
  const dLat = radius / 110540 + 0.01, dLon = radius / (111320 * Math.cos((lat * Math.PI) / 180)) + 0.01;
  for (const p of d.p) {
    const plat = p[1] / 1e5, plon = p[0] / 1e5;
    if (Math.abs(plat - lat) > dLat || Math.abs(plon - lon) > dLon) continue;
    const cat = d.cats[p[2]];
    if (cats && !cats.includes(cat)) continue;
    if (distM(here, { lat: plat, lon: plon }) > radius) continue;
    const osm = p[5] || '';
    const tags = { ...p[4], ...CAT_TAGS[cat] };
    if (p[4].amenity) tags.amenity = p[4].amenity; // napr. polícia v kategórii „emergency“
    if (p[3]) tags.name = p[3];
    out.push({ type: osm[0] === 'n' ? 'node' : osm[0] === 'w' ? 'way' : osm[0] === 'r' ? 'relation' : 'kp', id: osm.slice(1) || `${p[0]}_${p[1]}`, lat: plat, lon: plon, tags, offline: true });
  }
  return out;
}
// Je bod v oblasti s podrobnými offline údajmi (Slovensko)?
export const inDetailArea = (lat, lon) => lat > 47.7 && lat < 49.65 && lon > 16.8 && lon < 22.6;

// ---------- vodné toky pri dome ----------
export async function riversNear(lat, lon, radius = 500) {
  const d = await need('rivers.js', 'rivers');
  const here = { lat, lon };
  const names = new Set();
  let any = false;
  const kx = 111320 * Math.cos((lat * Math.PI) / 180), ky = 110540;
  if (!d.abs) { // súradnice sú uložené rozdielovo – raz prepočítaj
    for (const r of d.r) { let x = 0, y = 0; const p = r[2]; for (let i = 0; i < p.length; i += 2) { x += p[i]; y += p[i + 1]; p[i] = x; p[i + 1] = y; } }
    d.abs = true;
  }
  for (const [name, kind, pts] of d.r) {
    // rýchla kontrola obdĺžnika
    let near = false;
    for (let i = 0; i < pts.length; i += 2) {
      if (Math.abs(pts[i + 1] / 1e5 - lat) * ky < radius + 3000 && Math.abs(pts[i] / 1e5 - lon) * kx < radius + 3000) { near = true; break; }
    }
    if (!near) continue;
    for (let i = 2; i < pts.length; i += 2) {
      const ax = (pts[i - 2] / 1e5 - lon) * kx, ay = (pts[i - 1] / 1e5 - lat) * ky;
      const bx = (pts[i] / 1e5 - lon) * kx, by = (pts[i + 1] / 1e5 - lat) * ky;
      const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy;
      const t = l2 ? Math.max(0, Math.min(1, -(ax * dx + ay * dy) / l2)) : 0;
      if (Math.hypot(ax + t * dx, ay + t * dy) <= radius) { any = true; if (name) names.add(name); break; }
    }
  }
  return { found: any, names: [...names], here };
}
