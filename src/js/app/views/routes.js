// Únikové trasy: viacero alternatív k cieľom evakuácie, analýza rizík, uloženie a tlač.
import { store, uid } from '../store.js';
import { t, esc, fmtDuration, toast, $, $$, num } from '../core.js';
import { route as osrm, overpass } from '../../map/geo.js';
import { distanceKm } from '../../calc.js';
import { NPP } from '../../../data/npp.js';
import { printDocs, riskText } from '../printdocs.js';

const COLORS = ['#c2410c', '#0b3d91', '#047857', '#7c3aed', '#b45309', '#be185d'];
const DASH = { car: null, foot: '8 6', bike: '2 6' };

// Zjednodušenie lomenej čiary (Douglas–Peucker) – body [lat, lon]
export function simplify(pts, tol) {
  if (pts.length < 3) return pts;
  const sq = (a, b) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2;
  const segDist = (p, a, b) => {
    const l = sq(a, b);
    if (!l) return sq(p, a);
    let tt = ((p[0] - a[0]) * (b[0] - a[0]) + (p[1] - a[1]) * (b[1] - a[1])) / l;
    tt = Math.max(0, Math.min(1, tt));
    return sq(p, [a[0] + tt * (b[0] - a[0]), a[1] + tt * (b[1] - a[1])]);
  };
  const keep = new Uint8Array(pts.length); keep[0] = keep[pts.length - 1] = 1;
  const stack = [[0, pts.length - 1]];
  const tol2 = tol * tol;
  while (stack.length) {
    const [s, e] = stack.pop();
    let max = 0, idx = -1;
    for (let i = s + 1; i < e; i++) { const d = segDist(pts[i], pts[s], pts[e]); if (d > max) { max = d; idx = i; } }
    if (max > tol2) { keep[idx] = 1; stack.push([s, idx], [idx, e]); }
  }
  return pts.filter((_, i) => keep[i]);
}
function simplifyTo(pts, maxN) {
  let tol = 0.00005, out = simplify(pts, tol);
  while (out.length > maxN) { tol *= 2; out = simplify(pts, tol); }
  return out;
}

// Text pokynov z krokov OSRM
function instruction(step) {
  const m = step.maneuver || {};
  const road = step.name || step.ref || '';
  const on = road ? ' ' + t('instr.on', { road }) : '';
  const dist = step.distance >= 1000 ? `${num(step.distance / 1000, 1)} km` : `${Math.round(step.distance / 10) * 10} m`;
  if (m.type === 'arrive') return t('instr.arrive');
  if (m.type === 'depart') return `${t('instr.depart')}${on} (${dist})`;
  if (m.type === 'roundabout' || m.type === 'rotary' || m.type === 'exit roundabout') return `${t('instr.roundabout', { n: m.exit || 1 })}${on} (${dist})`;
  const mod = m.modifier || 'straight';
  const key = 'instr.' + (['left', 'right', 'slight left', 'slight right', 'sharp left', 'sharp right', 'uturn'].includes(mod) ? mod : 'straight');
  return `${t(key)}${on} (${dist})`;
}
function routeSummary(r, mode, kind, destName) {
  const steps = r.legs.flatMap((l) => l.steps || []);
  const text = [];
  for (const s of steps) { if (s.distance < 25 && !['arrive', 'depart'].includes(s.maneuver?.type)) continue; text.push(instruction(s)); if (text.length > 70) break; }
  const byRoad = {};
  for (const s of steps) { const n = s.ref || s.name; if (n) byRoad[n] = (byRoad[n] || 0) + s.distance; }
  const via = Object.entries(byRoad).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([n]) => n).join(', ');
  const classes = new Set(steps.flatMap((s) => (s.intersections || []).flatMap((i) => i.classes || [])));
  const coords = r.geometry.coordinates.map(([lo, la]) => [la, lo]);
  return { id: uid(), dest: destName, mode, kind, distance: r.distance, duration: r.duration, via, steps: text, geometry: simplifyTo(coords, 350), full: coords, osrmClasses: [...classes] };
}
// Prekrytie trás (podiel bodov A vzdialených < 60 m od B)
function overlap(a, b) {
  const sample = a.full.filter((_, i) => i % Math.max(1, Math.floor(a.full.length / 60)) === 0);
  const bs = simplifyTo(b.full, 600);
  let near = 0;
  for (const p of sample) if (bs.some((q) => Math.abs(q[0] - p[0]) < 0.0006 && Math.abs(q[1] - p[1]) < 0.0009)) near++;
  return near / sample.length;
}
// Obchádzkový bod kolmo na spojnicu (offset ~ 18 % dĺžky)
function detourPoint(a, b, side) {
  const mid = { lat: (a.lat + b.lat) / 2, lon: (a.lon + b.lon) / 2 };
  const k = Math.cos((mid.lat * Math.PI) / 180);
  const dx = (b.lon - a.lon) * k, dy = b.lat - a.lat;
  const len = Math.hypot(dx, dy) || 1e-6;
  const off = 0.18 * len;
  return { lat: mid.lat + side * (dx / len) * off, lon: mid.lon - side * (dy / len) * off / k };
}

async function analyse(r, skipOverpass = false) {
  const risks = { bridges: 0, rivers: [], tunnels: 0, ferry: r.osrmClasses.includes('ferry'), npp: '' };
  for (const n of NPP) if (r.geometry.some(([la, lo]) => distanceKm({ lat: la, lon: lo }, n) < 30)) { risks.npp = n.name; break; }
  const pts = simplifyTo(r.full, 110).map(([la, lo]) => `${la.toFixed(5)},${lo.toFixed(5)}`).join(',');
  if (skipOverpass) { risks.error = true; risks.tunnels = r.osrmClasses.includes('tunnel') ? 1 : 0; r.risks = risks; return; }
  try {
    const q = `[out:json][timeout:25];(way["bridge"]["bridge"!="no"]["highway"](around:10,${pts});way["tunnel"]["tunnel"!="no"]["highway"](around:10,${pts});way["waterway"~"^(river|canal)$"](around:10,${pts}););out tags;`;
    const res = await overpass(q, 30000);
    const bridgeNames = new Set(); let unnamedBridges = 0; const tunnels = new Set();
    for (const e of res.elements) {
      const tg = e.tags || {};
      if (tg.waterway) { if (tg.name && !risks.rivers.includes(tg.name)) risks.rivers.push(tg.name); continue; }
      if (tg.bridge) { if (tg.name || tg.ref) bridgeNames.add(tg.name || tg.ref); else unnamedBridges++; }
      if (tg.tunnel) tunnels.add(tg.name || e.id);
    }
    risks.bridges = bridgeNames.size + Math.ceil(unnamedBridges / 2);
    risks.tunnels = tunnels.size || (r.osrmClasses.includes('tunnel') ? 1 : 0);
  } catch { risks.error = true; risks.tunnels = r.osrmClasses.includes('tunnel') ? 1 : 0; }
  r.risks = risks;
}

export function render(el, params, opts = {}) {
  const p = store.profile;
  const L = window.L;
  let modes = new Set(store.prefs.routeModes || ['car', 'foot']);
  let selected = new Set((p.mobility.destinations || []).map((d) => d.id));
  let results = (p.routes || []).map((r) => ({ ...r, full: r.geometry }));
  let map, layer;

  const destinations = () => [...(p.mobility.destinations || []), ...(p.places || []).filter((x) => ['family', 'shelter', 'meet'].includes(x.type)).map((x) => ({ ...x, label: x.name }))];
  const home = () => (p.location.lat != null ? { lat: p.location.lat, lon: p.location.lon } : null);

  el.innerHTML = `<div class="wrap routes-view">
${opts.standalone ? `<h2 id="trasy">${esc(t('rt.title'))}</h2>` : `<h1>${esc(t('rt.title'))}</h1>`}
<p class="lead">${esc(t('rt.lead'))}</p>
<div class="grid two-col">
<section><h3>${esc(t('rt.origin'))}</h3><p id="rt-origin"></p>
<h3>${esc(t('rt.dest'))}</h3><ul class="destpick" id="rt-dests"></ul>
<h3>${esc(t('rt.modes'))}</h3><div class="chips">${['car', 'foot', 'bike'].map((m) => `<button type="button" class="chip" data-mode="${m}" aria-pressed="${modes.has(m)}">${m === 'car' ? '🚗' : m === 'foot' ? '🚶' : '🚲'} ${esc(t('mode.' + m))}</button>`).join('')}</div>
<div class="btn-row"><button class="btn" data-compute>🧭 ${esc(t('rt.compute'))}</button><button class="btn btn-ghost" data-print>🖨️ ${esc(t('rt.print'))}</button></div>
<p id="rt-status" class="muted" aria-live="polite"></p></section>
<section><div class="mapwrap"><div id="rt-map" class="bigmap"></div></div></section></div>
<div id="rt-list"></div>
<p class="muted small">⚠️ ${esc(t('rt.note'))}</p>
</div>`;

  const status = (s) => { $('#rt-status', el).textContent = s; };
  function drawPickers() {
    const h = home();
    $('#rt-origin', el).innerHTML = h ? `🏠 ${esc(p.location.label || `${h.lat.toFixed(4)}, ${h.lon.toFixed(4)}`)}` : `<span class="muted">${esc(t('map.noHome'))}</span> <a href="${opts.standalone ? '#map-tool' : '#/mapa'}">${esc(t('nav.map'))}</a>`;
    const ds = destinations();
    $('#rt-dests', el).innerHTML = ds.length ? ds.map((d) => `<li><label class="check-row"><input type="checkbox" data-dest="${d.id}" ${selected.has(d.id) ? 'checked' : ''}><span>🏁 ${esc(d.name || d.label)}${h ? ` <small class="muted">(${num(distanceKm(h, d))} km)</small>` : ''}</span></label></li>`).join('') : `<li class="muted">${esc(t('dest.none'))} <a href="${opts.standalone ? '#map-tool' : '#/profil/6'}">${esc(t('dest.add'))}</a></li>`;
  }
  function drawResults() {
    if (layer) layer.clearLayers();
    const byDest = {};
    results.forEach((r) => (byDest[r.dest] ||= []).push(r));
    const h = home();
    if (L && map) {
      if (h) L.marker([h.lat, h.lon]).addTo(layer).bindTooltip(t('rt.home'));
      results.forEach((r, i) => {
        const line = L.polyline(r.geometry, { color: COLORS[i % COLORS.length], weight: r.kind === 'fastest' ? 6 : 4, opacity: 0.85, dashArray: DASH[r.mode] }).addTo(layer);
        line.bindTooltip(`${r.dest} – ${t('mode.' + r.mode)} – ${t('rt.' + r.kind)}`);
      });
      for (const d of destinations()) L.marker([d.lat, d.lon], { title: d.name }).addTo(layer).bindTooltip('🏁 ' + (d.name || ''));
      const all = results.flatMap((r) => r.geometry);
      if (all.length) map.fitBounds(L.latLngBounds(all).pad(0.1));
    }
    const walkKm = Number(p.mobility.walkKm) || 0;
    $('#rt-list', el).innerHTML = Object.entries(byDest).map(([dest, list]) => `<section class="route-group"><h3>🏁 ${esc(dest)}</h3>
${list.map((r) => { const i = results.indexOf(r); const long = r.mode === 'foot' && walkKm && r.distance / 1000 > walkKm; return `<article class="route-card" style="--rc:${COLORS[i % COLORS.length]}">
<header><span class="swatch"></span><strong>${String.fromCharCode(65 + list.indexOf(r))} · ${r.mode === 'car' ? '🚗' : r.mode === 'foot' ? '🚶' : '🚲'} ${esc(t('mode.' + r.mode))} – ${esc(t('rt.' + r.kind))}</strong>
<span>${num(r.distance / 1000, 1)} km · ${fmtDuration(r.duration)}</span></header>
${r.via ? `<p class="small muted">${esc(t('rt.via', { roads: r.via }))}</p>` : ''}
<p class="risks ${r.risks && (r.risks.bridges || r.risks.rivers?.length || r.risks.npp || r.risks.tunnels) ? 'has' : ''}">⚠️ ${esc(r.risks ? riskText(r) : t('c.loading'))}${long ? ` · ${esc(t('rt.walkWarn', { km: walkKm }))}` : ''}</p>
<details><summary>${esc(t('rt.steps'))}</summary><ol class="steps-small">${(r.steps || []).map((s) => `<li>${esc(s)}</li>`).join('')}</ol></details>
<button class="btn btn-ghost btn-sm" data-show="${i}">🗺️ ${esc(t('rt.show'))}</button></article>`; }).join('')}</section>`).join('');
  }

  async function compute() {
    const h = home();
    const ds = destinations().filter((d) => selected.has(d.id));
    if (!h || !ds.length || !modes.size) { status(t('rt.needData')); return; }
    const jobs = [];
    for (const d of ds) for (const m of modes) jobs.push([d, m]);
    const out = [];
    let done = 0;
    for (const [d, m] of jobs) {
      status(t('rt.computing', { done, total: jobs.length }));
      try {
        const rs = await osrm(m, [h, d], { alternatives: true });
        const found = rs.slice(0, 3).map((r, i) => routeSummary(r, m, i === 0 ? 'fastest' : 'alt', d.name || d.label));
        // Doplnenie obchádzky, ak je málo rozdielnych alternatív
        for (const side of [1, -1]) {
          if (found.length >= 3) break;
          try {
            const via = detourPoint(h, d, side);
            const [r2] = await osrm(m, [h, via, d], { alternatives: false });
            const cand = routeSummary(r2, m, 'detour', d.name || d.label);
            if (cand.distance < found[0].distance * 1.8 && found.every((f) => overlap(cand, f) < 0.8)) found.push(cand);
          } catch { /* obchádzka nie je dostupná */ }
        }
        out.push(...found);
      } catch { toast(`${t('rt.error')} (${d.name} – ${t('mode.' + m)})`, 3500); }
      done++;
    }
    results = out;
    const persist = () => { p.routes = results.map(({ full, ...rest }) => rest); store.saveProfile(); };
    persist();
    drawResults();
    status(t('c.loading'));
    // Analýza rizík postupne; ak Overpass nefunguje, ďalšie trasy už nečakajú
    let overpassDown = false;
    for (const r of results) {
      await analyse(r, overpassDown);
      if (r.risks?.error) overpassDown = true;
      drawResults();
    }
    persist();
    status(`${t('c.saved')} – ${results.length}`);
  }

  el.addEventListener('click', (e) => {
    const m = e.target.closest('[data-mode]');
    if (m) { const k = m.dataset.mode; modes.has(k) ? modes.delete(k) : modes.add(k); m.setAttribute('aria-pressed', String(modes.has(k))); store.prefs.routeModes = [...modes]; store.savePrefs(); }
    if (e.target.closest('[data-compute]')) compute();
    if (e.target.closest('[data-print]')) printDocs(['routes']);
    const s = e.target.closest('[data-show]');
    if (s && map) { const r = results[Number(s.dataset.show)]; map.fitBounds(L.latLngBounds(r.geometry).pad(0.1)); $('#rt-map', el).scrollIntoView({ behavior: 'smooth', block: 'center' }); }
  });
  el.addEventListener('change', (e) => {
    const d = e.target.closest('[data-dest]');
    if (d) { d.checked ? selected.add(d.dataset.dest) : selected.delete(d.dataset.dest); }
  });
  const unsub = store.on(() => { if (!el.isConnected) return; drawPickers(); });

  if (L) {
    const h = home();
    map = L.map($('#rt-map', el)).setView(h ? [h.lat, h.lon] : [48.7, 19.5], h ? 11 : 7);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(map);
    layer = L.layerGroup().addTo(map);
    setTimeout(() => map.invalidateSize(), 200);
  }
  drawPickers();
  drawResults();
  return () => { unsub(); map?.remove(); };
}
