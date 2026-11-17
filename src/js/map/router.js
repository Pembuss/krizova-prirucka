// Offline výpočet trás (autom, pešo, na bicykli) po priloženej cestnej sieti (assets/map/route.js).
// Slovensko podrobne, susedné krajiny hlavné cesty. Výsledok má rovnaký tvar ako odpoveď OSRM,
// takže ho obrazovka trás spracuje rovnako ako trasy z internetu.
import { loadScript } from './offline.js';
import { distM } from './offdata.js';

const W = typeof window !== 'undefined' ? window : globalThis;
let RAW = null, G = null, loading = null;
// route.js je hlavička; ak má „parts“, zvyšok dát je v route-1.js, route-2.js… (súbory do 10 MB)
W.KPMAP_ROUTE = (d) => {
  if (!d.part) { RAW = d; return; }
  for (const [k, c] of d.add) RAW[k] = (RAW[k] || '') + c;
};

function b64(s) {
  const bin = atob(s);
  const a = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i);
  return a;
}
function reader(buf) {
  let p = 0;
  return {
    v() { let r = 0, s = 0, b; do { b = buf[p++]; r += (b & 0x7f) * 2 ** s; s += 7; } while (b & 0x80); return r; },
    z() { const v = this.v(); return v % 2 ? -(v + 1) / 2 : v / 2; },
    b() { return buf[p++]; },
  };
}

function decode(d) {
  const n = d.n, m = d.e;
  const lon = new Float64Array(n), lat = new Float64Array(n);
  let r = reader(b64(d.nodes)), x = 0, y = 0;
  for (let i = 0; i < n; i++) { x += r.z(); y += r.z(); lon[i] = x / 1e5; lat[i] = y / 1e5; }
  const eu = new Uint32Array(m), ev = new Uint32Array(m), len = new Uint32Array(m), cls = new Uint8Array(m), fl = new Uint8Array(m), sp = new Uint8Array(m);
  const name = new Uint32Array(m), ref = new Uint32Array(m), river = new Uint32Array(m), gs = new Uint32Array(m + 1);
  r = reader(b64(d.edges));
  let u = 0;
  for (let i = 0; i < m; i++) {
    u += r.v(); eu[i] = u; ev[i] = u + r.z(); len[i] = r.v(); cls[i] = r.b(); fl[i] = r.b(); sp[i] = r.b();
    name[i] = r.v(); ref[i] = r.v(); river[i] = r.v();
  }
  // geometria hrán (medziľahlé body) – súradnice ×1e5
  const gr = reader(b64(d.geom));
  const pts = [];
  for (let i = 0; i < m; i++) {
    gs[i] = pts.length / 2;
    const k = gr.v();
    let lx = Math.round(lon[eu[i]] * 1e5), ly = Math.round(lat[eu[i]] * 1e5);
    for (let j = 0; j < k; j++) { lx += gr.z(); ly += gr.z(); pts.push(lx, ly); }
  }
  gs[m] = pts.length / 2;
  const geom = Int32Array.from(pts);
  // susednosť (oba smery): hrana*2 + smer (0 = u→v, 1 = v→u)
  const deg = new Uint32Array(n + 1);
  for (let i = 0; i < m; i++) { deg[eu[i] + 1]++; deg[ev[i] + 1]++; }
  for (let i = 0; i < n; i++) deg[i + 1] += deg[i];
  const adj = new Uint32Array(2 * m), fill = deg.slice(0, n);
  for (let i = 0; i < m; i++) { adj[fill[eu[i]]++] = i * 2; adj[fill[ev[i]]++] = i * 2 + 1; }
  // mriežka uzlov na hľadanie najbližšej cesty (bunky 0,02°)
  // hrana sa zapíše do buniek svojich koncov aj medziľahlých bodov (dlhé cesty medzi obcami)
  const cells = new Map();
  const put = (k, i) => { let c = cells.get(k); if (!c) cells.set(k, (c = [])); if (c[c.length - 1] !== i) c.push(i); };
  for (let i = 0; i < m; i++) {
    const seen = new Set();
    const reg = (x, y) => { const k = `${Math.floor(x * 50)}:${Math.floor(y * 50)}`; if (!seen.has(k)) { seen.add(k); put(k, i); } };
    reg(lon[eu[i]], lat[eu[i]]);
    for (let k = gs[i]; k < gs[i + 1]; k++) reg(geom[2 * k] / 1e5, geom[2 * k + 1] / 1e5);
    reg(lon[ev[i]], lat[ev[i]]);
  }
  return { n, m, lon, lat, eu, ev, len, cls, fl, sp, name, ref, river, gs, geom, deg, adj, cells, str: d.str, clsNames: d.cls, date: d.date };
}

export async function loadGraph() {
  if (G) return G;
  if (!loading) {
    loading = loadScript('route.js')
      .then(async () => { for (let i = 1; i <= (RAW.parts || 0); i++) await loadScript(`route-${i}.js`); })
      .then(() => { G = decode(RAW); RAW = null; return G; })
      .catch((e) => { loading = null; throw e; });
  }
  return loading;
}

const F = { FWD: 1, BWD: 2, CAR: 4, FOOT: 8, BIKE: 16, BRIDGE: 32, TUNNEL: 64, ROUND: 128 };
const MODE_BIT = { car: F.CAR, foot: F.FOOT, bike: F.BIKE };
const MAXV = { car: 33, foot: 1.3, bike: 5 };

function allowed(g, e, dir, mode) {
  const f = g.fl[e];
  if (!(f & MODE_BIT[mode])) return false;
  if (mode === 'foot') return true;
  if (dir === 0 && f & F.BWD) return false;
  if (dir === 1 && f & F.FWD) return false;
  return true;
}
function cost(g, e, mode) {
  const L = g.len[e];
  if (mode === 'car') return L / (g.sp[e] / 3.6);
  const c = g.clsNames[g.cls[e]];
  if (mode === 'foot') return (L / 1.25) * (c === 'primary' || c === 'secondary' ? 1.15 : 1);
  // bicykel: cyklotrasy a poľné cesty mierne výhodnejšie, rušné cesty nevýhodné
  const k = c === 'cycleway' ? 0.85 : c === 'track' ? 0.95 : c === 'primary' ? 1.35 : c === 'secondary' ? 1.15 : 1;
  return (L / 4.2) * k;
}

// body hrany v smere u→v ako [lat, lon]
function edgePoints(g, e) {
  const out = [[g.lat[g.eu[e]], g.lon[g.eu[e]]]];
  for (let k = g.gs[e]; k < g.gs[e + 1]; k++) out.push([g.geom[2 * k + 1] / 1e5, g.geom[2 * k] / 1e5]);
  out.push([g.lat[g.ev[e]], g.lon[g.ev[e]]]);
  return out;
}

// najbližší bod na povolenej ceste (do maxM metrov)
function snap(g, p, mode, maxM = 3000, skip = null) {
  const kx = 111320 * Math.cos((p.lat * Math.PI) / 180), ky = 110540;
  let best = null, foundAt = 99;
  const cx = Math.floor(p.lon * 50), cy = Math.floor(p.lat * 50);
  for (let ring = 0; ring <= 4 && ring <= foundAt + 1; ring++) {
    for (let i = cx - ring; i <= cx + ring; i++) for (let j = cy - ring; j <= cy + ring; j++) {
      if (Math.max(Math.abs(i - cx), Math.abs(j - cy)) !== ring) continue;
      const c = g.cells.get(`${i}:${j}`); if (!c) continue;
      for (const e of c) {
        if (!(g.fl[e] & MODE_BIT[mode]) || skip?.has(e)) continue;
        const pts = edgePoints(g, e);
        let along = 0;
        for (let k = 1; k < pts.length; k++) {
          const ax = (pts[k - 1][1] - p.lon) * kx, ay = (pts[k - 1][0] - p.lat) * ky;
          const bx = (pts[k][1] - p.lon) * kx, by = (pts[k][0] - p.lat) * ky;
          const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy, sl = Math.sqrt(l2);
          const t = l2 ? Math.max(0, Math.min(1, -(ax * dx + ay * dy) / l2)) : 0;
          const d = Math.hypot(ax + t * dx, ay + t * dy);
          if (!best || d < best.d) best = { e, d, seg: k, t, at: along + t * sl, pt: [pts[k - 1][0] + t * (pts[k][0] - pts[k - 1][0]), pts[k - 1][1] + t * (pts[k][1] - pts[k - 1][1])], pts };
          along += sl;
        }
      }
    }
    if (best && foundAt === 99) foundAt = ring; // ešte jeden prstenec – bližšia cesta môže byť v susednej bunke
  }
  if (!best || best.d > maxM) return null;
  // podiel dĺžky hrany (geometria je zjednodušená, preto pomer)
  const geoLen = best.pts.reduce((s, q, i, a) => (i ? s + distM({ lat: a[i - 1][0], lon: a[i - 1][1] }, { lat: q[0], lon: q[1] }) : 0), 0) || 1;
  best.frac = Math.max(0, Math.min(1, best.at / geoLen));
  return best;
}

// binárna halda
class Heap {
  constructor() { this.k = []; this.v = []; }
  push(key, val) {
    const k = this.k, v = this.v; let i = k.length; k.push(key); v.push(val);
    while (i > 0) { const p = (i - 1) >> 1; if (k[p] <= key) break; k[i] = k[p]; v[i] = v[p]; i = p; }
    k[i] = key; v[i] = val;
  }
  pop() {
    const k = this.k, v = this.v; const top = v[0]; const lk = k.pop(), lv = v.pop();
    if (k.length) {
      let i = 0; const n = k.length;
      for (;;) { let c = 2 * i + 1; if (c >= n) break; if (c + 1 < n && k[c + 1] < k[c]) c++; if (k[c] >= lk) break; k[i] = k[c]; v[i] = v[c]; i = c; }
      k[i] = lk; v[i] = lv;
    }
    return top;
  }
  get size() { return this.k.length; }
}

function astar(g, mode, s, t, penalty) {
  const n = g.n;
  const dist = new Float64Array(n).fill(Infinity);
  const prev = new Int32Array(n).fill(-1);
  const done = new Uint8Array(n);
  const h = new Heap();
  const tl = { lat: t.pt[0], lon: t.pt[1] };
  const H = (i) => distM({ lat: g.lat[i], lon: g.lon[i] }, tl) / MAXV[mode];
  const ec = (e) => cost(g, e, mode) * (penalty?.get(e) || 1);
  // štart: oba konce hrany, na ktorej leží bod
  const se = s.e, te = t.e;
  const seed = (node, c, code) => { if (c < dist[node]) { dist[node] = c; prev[node] = code; h.push(c + H(node), node); } };
  if (allowed(g, se, 1, mode)) seed(g.eu[se], ec(se) * s.frac, -2);
  if (allowed(g, se, 0, mode)) seed(g.ev[se], ec(se) * (1 - s.frac), -3);
  // cieľ: dôjsť do u alebo v hrany cieľa
  let best = Infinity, bestEnd = -1;
  const tCostU = allowed(g, te, 0, mode) ? ec(te) * t.frac : Infinity;
  const tCostV = allowed(g, te, 1, mode) ? ec(te) * (1 - t.frac) : Infinity;
  // tá istá hrana: priamo
  if (se === te) {
    const fwd = t.frac >= s.frac;
    if ((fwd && allowed(g, se, 0, mode)) || (!fwd && allowed(g, se, 1, mode))) { best = ec(se) * Math.abs(t.frac - s.frac); bestEnd = -9; }
  }
  let visited = 0;
  while (h.size) {
    const u = h.pop();
    if (done[u]) continue;
    done[u] = 1; visited++;
    if (dist[u] + H(u) >= best) break;
    if (u === g.eu[te] && dist[u] + tCostU < best) { best = dist[u] + tCostU; bestEnd = u; }
    if (u === g.ev[te] && dist[u] + tCostV < best) { best = dist[u] + tCostV; bestEnd = u; }
    for (let k = g.deg[u]; k < g.deg[u + 1]; k++) {
      const a = g.adj[k], e = a >> 1, dir = a & 1;
      if (!allowed(g, e, dir, mode)) continue;
      const v = dir ? g.eu[e] : g.ev[e];
      if (done[v]) continue;
      const c = dist[u] + ec(e);
      if (c < dist[v]) { dist[v] = c; prev[v] = a; h.push(c + H(v), v); }
    }
    if (visited > 2_500_000) break;
  }
  if (bestEnd === -1) return null;
  return { prev, bestEnd, cost: best };
}

// poskladá trasu: zoznam [hrana, smer, od, do] (od/do = podiel hrany)
function pathEdges(g, s, t, res) {
  if (res.bestEnd === -9) return [[s.e, t.frac >= s.frac ? 0 : 1, s.frac, t.frac]];
  const list = [];
  const end = res.bestEnd;
  list.push([t.e, end === g.eu[t.e] ? 0 : 1, end === g.eu[t.e] ? 0 : 1, t.frac]);
  let u = end;
  for (;;) {
    const a = res.prev[u];
    if (a === -2) { list.push([s.e, 1, s.frac, 0]); break; }
    if (a === -3) { list.push([s.e, 0, s.frac, 1]); break; }
    if (a < 0) break;
    const e = a >> 1, dir = a & 1;
    list.push([e, dir, dir ? 1 : 0, dir ? 0 : 1]);
    u = dir ? g.ev[e] : g.eu[e];
  }
  return list.reverse();
}

// časť hrany medzi podielmi a, b (v smere jazdy)
function partPoints(g, e, a, b) {
  const pts = edgePoints(g, e);
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + distM({ lat: pts[i - 1][0], lon: pts[i - 1][1] }, { lat: pts[i][0], lon: pts[i][1] }));
  const L = cum[cum.length - 1] || 1;
  const at = (f) => {
    const d = f * L;
    for (let i = 1; i < pts.length; i++) if (cum[i] >= d) { const t = (d - cum[i - 1]) / ((cum[i] - cum[i - 1]) || 1); return [pts[i - 1][0] + t * (pts[i][0] - pts[i - 1][0]), pts[i - 1][1] + t * (pts[i][1] - pts[i - 1][1])]; }
    return pts[pts.length - 1];
  };
  const lo = Math.min(a, b), hi = Math.max(a, b);
  const out = [at(lo)];
  for (let i = 1; i < pts.length - 1; i++) if (cum[i] / L > lo && cum[i] / L < hi) out.push(pts[i]);
  out.push(at(hi));
  return a <= b ? out : out.reverse();
}

const bearing = (a, b) => (Math.atan2((b[1] - a[1]) * Math.cos((a[0] * Math.PI) / 180), b[0] - a[0]) * 180) / Math.PI;
function modifier(d) {
  const a = Math.abs(d);
  const side = d > 0 ? 'right' : 'left';
  if (a < 20) return 'straight';
  if (a < 55) return 'slight ' + side;
  if (a < 135) return side;
  if (a < 165) return 'sharp ' + side;
  return 'uturn';
}

// Výsledok v tvare OSRM: { distance, duration, geometry: { coordinates: [[lon, lat]] }, legs: [{ steps }] }
function toRoute(g, mode, list, from, to, snapS, snapT) {
  const coords = [];
  const steps = [];
  let distance = 0, duration = 0;
  const risks = { bridges: new Set(), unnamedBridges: 0, rivers: new Set(), tunnels: 0 };
  const push = (p) => { const l = coords[coords.length - 1]; if (!l || l[0] !== p[1] || l[1] !== p[0]) coords.push([p[1], p[0]]); };
  // úsek k ceste (ak je bod ďalej od cesty)
  if (snapS.d > 15) { push([from.lat, from.lon]); }
  let cur = null, lastB = null, inRound = 0, lastTunnel = -1;
  for (const [e, dir, a, b] of list) {
    const frac = Math.abs(b - a);
    const d = g.len[e] * frac;
    const tm = cost(g, e, mode) * frac;
    const pts = partPoints(g, e, a, b);
    if (pts.length < 2) continue;
    const nm = g.str[g.name[e]] || '', rf = g.str[g.ref[e]] || '';
    const round = g.fl[e] & F.ROUND;
    const b0 = bearing(pts[0], pts[1]);
    if (g.fl[e] & F.BRIDGE) { const rv = g.str[g.river[e]]; if (rv) risks.rivers.add(rv); if (nm || rf) risks.bridges.add(nm || rf); else if (frac > 0.5) risks.unnamedBridges++; }
    if (g.fl[e] & F.TUNNEL && lastTunnel !== g.name[e]) { risks.tunnels++; lastTunnel = g.name[e]; }
    if (!cur) {
      cur = { distance: 0, duration: 0, name: nm, ref: rf, maneuver: { type: 'depart', modifier: 'straight' }, intersections: [{ classes: [] }] };
      steps.push(cur);
    } else if (round && !inRound) {
      cur = { distance: 0, duration: 0, name: nm, ref: rf, maneuver: { type: 'roundabout', exit: 0 }, intersections: [{ classes: [] }] };
      steps.push(cur);
    } else if (!round && inRound) {
      // výjazd z objazdu: krok pokračuje na ceste, na ktorú vychádzame („3. výjazd na …“)
      cur.name = nm; cur.ref = rf;
    } else if (!round && (rf ? rf !== cur.ref : nm !== cur.name || cur.ref)) {
      // na číslovanej ceste (D1, R1, I/61…) nový krok len pri zmene čísla – názvy mostov a ulíc ho nerozdeľujú
      let dd = b0 - lastB; while (dd > 180) dd -= 360; while (dd < -180) dd += 360;
      cur = { distance: 0, duration: 0, name: nm, ref: rf, maneuver: { type: 'turn', modifier: modifier(dd) }, intersections: [{ classes: [] }] };
      steps.push(cur);
    }
    if (round && (b >= 0.999 || b <= 0.001)) {
      // výjazd = križovatka na objazde, z ktorej sa dá (daným spôsobom) odbočiť na inú cestu
      const node = dir ? g.eu[e] : g.ev[e];
      let out = false;
      for (let k = g.deg[node]; k < g.deg[node + 1] && !out; k++) {
        const a = g.adj[k], e2 = a >> 1;
        if (!(g.fl[e2] & F.ROUND) && allowed(g, e2, a & 1, mode)) out = true;
      }
      if (out) cur.maneuver.exit = (cur.maneuver.exit || 0) + 1;
    }
    inRound = round;
    if (g.fl[e] & F.TUNNEL) cur.intersections[0].classes.push('tunnel');
    cur.distance += d; cur.duration += tm;
    distance += d; duration += tm;
    for (const p of pts) push(p);
    lastB = bearing(pts[pts.length - 2], pts[pts.length - 1]);
  }
  if (snapT.d > 15) push([to.lat, to.lon]);
  // pešia „posledná míľa“ mimo cesty
  const extra = (snapS.d > 15 ? snapS.d : 0) + (snapT.d > 15 ? snapT.d : 0);
  distance += extra; duration += extra / (mode === 'car' ? 1.25 : MAXV[mode] * 0.8);
  // krátke úseky s iným názvom (most, krátka ulica) pri jazde rovno pripoj k predchádzajúcemu kroku
  const merged = [];
  for (const st of steps) {
    const prev = merged[merged.length - 1];
    const straight = st.maneuver.type === 'turn' && st.maneuver.modifier === 'straight';
    if (prev && straight && (st.distance < 150 || (!st.name && !st.ref) || (st.name === prev.name && st.ref === prev.ref))) {
      prev.distance += st.distance; prev.duration += st.duration;
      prev.intersections[0].classes.push(...st.intersections[0].classes);
      continue;
    }
    if (st.maneuver.type === 'roundabout' && !st.maneuver.exit) st.maneuver.exit = 1;
    merged.push(st);
  }
  steps.length = 0; steps.push(...merged);
  steps.push({ distance: 0, duration: 0, name: '', ref: '', maneuver: { type: 'arrive' }, intersections: [{ classes: [] }] });
  return {
    distance, duration, geometry: { type: 'LineString', coordinates: coords }, legs: [{ steps }], offline: true,
    offlineRisks: { bridges: risks.bridges.size + Math.ceil(risks.unnamedBridges / 2), rivers: [...risks.rivers], tunnels: risks.tunnels },
    edges: list.map((x) => x[0]),
  };
}

function overlapShare(a, b) {
  const sb = new Set(b.edges);
  const n = a.edges.length || 1;
  return a.edges.filter((e) => sb.has(e)).length / n;
}

export class OutOfNetwork extends Error {}

// Hlavná funkcia: body [{lat, lon}, …], alternatívy podľa penalizácie už použitých úsekov.
export async function routeOffline(mode, points, { alternatives = true } = {}) {
  const g = await loadGraph();
  if (points.length > 2) {
    // cez medzibody: spoj úseky
    const legs = [];
    for (let i = 1; i < points.length; i++) legs.push((await routeOffline(mode, [points[i - 1], points[i]], { alternatives: false }))[0]);
    const r = legs.reduce((acc, x) => ({
      ...acc, distance: acc.distance + x.distance, duration: acc.duration + x.duration,
      geometry: { type: 'LineString', coordinates: acc.geometry.coordinates.concat(x.geometry.coordinates) },
      legs: [{ steps: acc.legs[0].steps.filter((s) => s.maneuver.type !== 'arrive').concat(x.legs[0].steps.slice(1)) }],
      offlineRisks: { bridges: acc.offlineRisks.bridges + x.offlineRisks.bridges, rivers: [...new Set([...acc.offlineRisks.rivers, ...x.offlineRisks.rivers])], tunnels: acc.offlineRisks.tunnels + x.offlineRisks.tunnels },
      edges: acc.edges.concat(x.edges),
    }));
    return [r];
  }
  const [from, to] = points;
  let s = snap(g, from, mode), t = snap(g, to, mode);
  if (!s || !t) throw new OutOfNetwork(!s ? 'from' : 'to');
  const out = [];
  const penalty = new Map();
  // Najbližší úsek môže byť odrezaný od siete (pešia zóna, dvor, súkromná cesta) – vtedy skús
  // striedavo ďalší najbližší úsek pri štarte a v cieli
  let first = astar(g, mode, s, t, penalty);
  const skipS = new Set(), skipT = new Set();
  for (let i = 0; !first && i < 6; i++) {
    if (i % 2 === 0) { skipS.add(s.e); s = snap(g, from, mode, 3000, skipS) || s; } else { skipT.add(t.e); t = snap(g, to, mode, 3000, skipT) || t; }
    first = astar(g, mode, s, t, penalty);
  }
  for (let k = 0; k < (alternatives ? 3 : 1); k++) {
    const res = k === 0 ? first : astar(g, mode, s, t, penalty);
    if (!res) break;
    const r = toRoute(g, mode, pathEdges(g, s, t, res), from, to, s, t);
    if (out.every((o) => overlapShare(r, o) < 0.8 && r.duration < out[0].duration * 1.6)) out.push(r);
    for (const e of r.edges) penalty.set(e, (penalty.get(e) || 1) * 1.7);
  }
  if (!out.length) throw new OutOfNetwork('none');
  return out;
}

if (typeof window !== 'undefined') window.__kpRoute = { routeOffline, loadGraph }; // pre automatické testy

export async function graphInfo() {
  const g = await loadGraph();
  return { nodes: g.n, edges: g.m, date: g.date };
}
