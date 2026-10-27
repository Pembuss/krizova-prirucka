// Offline mapa: vektorové dlaždice priložené k aplikácii (assets/map/*.js), kreslené na plátno v Leaflete.
// Funguje bez internetu aj pri otvorení z disku (file://) – dáta sa načítajú cez <script>, nie cez fetch.
// Zdroje: Natural Earth (Európa) a OpenStreetMap (Slovensko podrobne, susedné krajiny hlavné cesty).

const SCRIPT_URL = typeof document !== 'undefined' && document.currentScript ? document.currentScript.src : '';
// Bundle je v assets/js/, mapové dáta v assets/map/
export const MAP_BASE = SCRIPT_URL ? new URL('../map/', SCRIPT_URL).href : 'assets/map/';

const W = typeof window !== 'undefined' ? window : globalThis;
const state = W.__kpmap || (W.__kpmap = { index: null, labels: null, packs: {}, waiting: {}, scripts: {}, decoded: new Map() });

// ---------- načítanie skriptov ----------
export function loadScript(file) {
  if (state.scripts[file]) return state.scripts[file];
  state.scripts[file] = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = MAP_BASE + file;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => { delete state.scripts[file]; reject(new Error('map data ' + file)); };
    document.head.appendChild(s);
  });
  return state.scripts[file];
}
W.KPMAP_INDEX = (d) => { state.index = d; };
W.KPMAP_LABELS = (d) => { state.labels = d; };
W.KPMAP_ADD = (key, tiles) => { state.packs[key] = tiles; };

let ready = null;
// Načíta index dlaždíc a popisy. Vráti false, ak mapové dáta v balíku nie sú.
export function offlineReady() {
  if (!ready) {
    ready = Promise.all([loadScript('index.js'), loadScript('labels.js')])
      .then(() => !!state.index)
      .catch(() => false);
  }
  return ready;
}
export const mapIndex = () => state.index;
export const mapLabels = () => state.labels;

async function pack(key) {
  if (!state.packs[key]) await loadScript(key + '.js');
  return state.packs[key];
}

// ---------- výber dátových dlaždíc ----------
const DZ = [3, 6, 9, 12];
function dataZoomFor(z) {
  let dz = 3;
  for (const d of DZ) if (d <= z) dz = d;
  return dz;
}
// dátové dlaždice, ktoré pokrývajú dlaždicu mapy (z, x, y); pri chýbajúcich dátach sa použije nižšia úroveň
function dataTilesFor(z, x, y) {
  const idx = state.index.tiles;
  for (let dz = dataZoomFor(z); dz >= 3; dz -= 3) {
    let list = [];
    if (z >= dz) {
      const k = `${dz}/${x >> (z - dz)}/${y >> (z - dz)}`;
      if (idx[k]) list = [k];
      else if (dz > 3) continue;
    } else {
      const f = 2 ** (dz - z);
      for (let i = 0; i < f; i++) for (let j = 0; j < f; j++) {
        const k = `${dz}/${x * f + i}/${y * f + j}`;
        if (idx[k]) list.push(k);
      }
    }
    return list;
  }
  return [];
}

// Dekódovanie delta-kódovaných súradníc (raz na dlaždicu)
function decodeLine(a) {
  const out = new Int32Array(a.length);
  let x = 0, y = 0;
  for (let i = 0; i < a.length; i += 2) { x += a[i]; y += a[i + 1]; out[i] = x; out[i + 1] = y; }
  return out;
}
function decoded(key, raw) {
  let d = state.decoded.get(key);
  if (d) return d;
  const classes = state.index.classes;
  const groups = (raw.g || raw).map(([cid, feats]) => {
    const cls = classes[cid];
    const poly = POLY.has(cls);
    return { cls, poly, feats: feats.map((f) => (poly ? f.map(decodeLine) : decodeLine(f))) };
  });
  d = { groups, text: raw.t || [] };
  state.decoded.set(key, d);
  if (state.decoded.size > 400) state.decoded.delete(state.decoded.keys().next().value);
  return d;
}
export async function getTile(key) {
  const p = await pack(state.index.tiles[key]);
  const raw = p && p[key];
  return raw ? decoded(key, raw) : null;
}

// ---------- štýl ----------
const POLY = new Set(['ocean', 'urban', 'residential', 'commercial', 'industrial', 'military', 'cemetery', 'park', 'green', 'forest', 'wetland', 'water']);
const LAND = '#f2efe9';
const FILL = {
  ocean: ['#aad3df', 0], water: ['#aad3df', 0], urban: ['#e4ddd3', 4], residential: ['#e3e0dc', 10], commercial: ['#f2dad9', 11],
  industrial: ['#ebdbe8', 11], military: ['#f4e3df', 10], cemetery: ['#c9dfc6', 12], park: ['#c8f0c8', 12], green: ['#d8edc4', 13],
  forest: ['#b9dba7', 7], wetland: ['#d5e9df', 9],
};
// [minZoom, farba, šírky podľa priblíženia {z: px}, čiarkovanie]
const stops = (o) => o;
const LINE = {
  stream: [13, '#9fcbe0', stops({ 13: 0.8, 16: 2, 18: 4 })],
  canal: [10, '#9fcbe0', stops({ 10: 1, 14: 3, 18: 8 })],
  river: [6, '#8fc2dc', stops({ 6: 0.8, 9: 1.4, 12: 3, 15: 6, 18: 14 })],
  river_ne: [3, '#94c3d9', stops({ 3: 0.5, 6: 1, 9: 1.6 })],
  admin4: [7, '#a68aa6', stops({ 7: 0.8, 12: 1.5, 16: 2.5 }), [6, 4]],
  admin2: [0, '#8b5a95', stops({ 0: 0.6, 5: 1.2, 9: 2, 14: 3.5 }), [10, 5]],
  ferry: [6, '#5b7fc7', stops({ 6: 0.8, 12: 1.5 }), [6, 5]],
  tram: [13, '#7b7b85', stops({ 13: 1, 18: 2.5 })],
  rail: [8, '#80808a', stops({ 8: 0.8, 12: 1.6, 16: 3 })],
  road_ne_minor: [7, '#f0c27a', stops({ 7: 0.7, 9: 1.2 })],
  road_ne_major: [4, '#e3954b', stops({ 4: 0.7, 6: 1.1, 9: 2 })],
};
// cesty: [minZoom, výplň, obrys, šírky výplne]
const ROAD = {
  path: [15, '#f08070', null, stops({ 15: 1, 18: 2 }), [2, 3]],
  track: [13, '#a0732d', null, stops({ 13: 0.8, 16: 1.6, 18: 2.5 }), [5, 3]],
  service: [14, '#ffffff', '#c5c5c5', stops({ 14: 1.5, 16: 3, 18: 7 })],
  pedestrian: [13, '#e4e2ee', '#bcb9c9', stops({ 13: 1.5, 16: 4, 18: 10 })],
  living_street: [13, '#efefef', '#c2c2c2', stops({ 13: 1.5, 16: 5, 18: 12 })],
  residential_rd: [12, '#ffffff', '#c2c2c2', stops({ 12: 1, 14: 2.5, 16: 6, 18: 14 })],
  unclassified: [11, '#ffffff', '#b8b8b8', stops({ 11: 0.8, 13: 2, 16: 6, 18: 14 })],
  tertiary: [10, '#ffffff', '#a8a8a8', stops({ 10: 1, 12: 2.2, 14: 4, 16: 8, 18: 16 })],
  secondary: [8, '#f7f6b7', '#a6a35a', stops({ 8: 1, 10: 1.8, 12: 3, 14: 5, 16: 9, 18: 18 })],
  primary: [7, '#fcd6a4', '#b98d42', stops({ 7: 1, 9: 1.8, 12: 3.4, 14: 6, 16: 10, 18: 20 })],
  trunk: [6, '#f9b29c', '#c26a52', stops({ 6: 1.1, 9: 2, 12: 3.8, 14: 6.5, 16: 11, 18: 22 })],
  motorway: [5, '#e892a2', '#c2506a', stops({ 5: 1.1, 8: 2, 10: 2.6, 12: 4, 14: 7, 16: 12, 18: 24 })],
  link: [10, '#fcd6a4', '#b98d42', stops({ 10: 0.8, 13: 2, 16: 5, 18: 10 })],
};
for (const c of ['tertiary', 'secondary', 'primary', 'trunk', 'motorway']) ROAD[c + '_t'] = [ROAD[c][0], ROAD[c][1], ROAD[c][2], ROAD[c][3], [6, 4], true];
const ROAD_ORDER = ['path', 'track', 'service', 'pedestrian', 'living_street', 'residential_rd', 'unclassified', 'link', 'tertiary_t', 'secondary_t', 'primary_t', 'trunk_t', 'motorway_t', 'tertiary', 'secondary', 'primary', 'trunk', 'motorway'];
const UNDER = ['stream', 'canal', 'river', 'river_ne', 'admin4', 'admin2'];
const OVER = ['ferry', 'tram', 'rail', 'road_ne_minor', 'road_ne_major'];

function width(st, z) {
  const ks = Object.keys(st).map(Number);
  if (z <= ks[0]) return st[ks[0]] * (z < ks[0] ? 0.8 : 1);
  for (let i = 1; i < ks.length; i++) {
    if (z <= ks[i]) {
      const a = ks[i - 1], b = ks[i], t = (z - a) / (b - a);
      return st[a] * (1 - t) + st[b] * t;
    }
  }
  return st[ks[ks.length - 1]];
}

// ---------- kreslenie ----------
function drawTile(ctx, z, x, y, size, tiles) {
  ctx.fillStyle = LAND;
  ctx.fillRect(0, 0, size, size);
  const byCls = {};
  for (const { key, d } of tiles) {
    const [dz, tx, ty] = key.split('/').map(Number);
    const ext = state.index.extent;
    const k = 2 ** (z - dz);
    const sc = (size * k) / ext;
    const ox = (tx * k - x) * size, oy = (ty * k - y) * size;
    for (const g of d.groups) (byCls[g.cls] ||= []).push({ g, sc, ox, oy });
  }
  const pathOf = (list, poly) => {
    ctx.beginPath();
    for (const { g, sc, ox, oy } of list) {
      for (const f of g.feats) {
        const rings = poly ? f : [f];
        for (const r of rings) {
          ctx.moveTo(ox + r[0] * sc, oy + r[1] * sc);
          for (let i = 2; i < r.length; i += 2) ctx.lineTo(ox + r[i] * sc, oy + r[i + 1] * sc);
          if (poly) ctx.closePath();
        }
      }
    }
  };
  // plochy
  for (const cls of ['ocean', 'urban', 'residential', 'commercial', 'industrial', 'military', 'cemetery', 'park', 'green', 'forest', 'wetland', 'water']) {
    const list = byCls[cls];
    if (!list || z < FILL[cls][1]) continue;
    ctx.fillStyle = FILL[cls][0];
    pathOf(list, true);
    ctx.fill('evenodd');
  }
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const stroke = (cls, color, w, dash) => {
    const list = byCls[cls];
    if (!list || w <= 0) return;
    ctx.strokeStyle = color; ctx.lineWidth = w; ctx.setLineDash(dash || []);
    pathOf(list, false);
    ctx.stroke();
  };
  for (const cls of UNDER) { const s = LINE[cls]; if (z >= s[0]) stroke(cls, s[1], width(s[2], z), s[3]); }
  // obrysy ciest, potom výplne
  if (z >= 12) for (const cls of ROAD_ORDER) {
    const s = ROAD[cls];
    if (z < s[0] || !s[2]) continue;
    stroke(cls, s[2], width(s[3], z) + (z >= 15 ? 2.4 : 1.6), s[5] ? [6, 4] : null);
  }
  for (const cls of ROAD_ORDER) {
    const s = ROAD[cls];
    if (z < s[0]) continue;
    const w = width(s[3], z);
    // pri menšom priblížení bez obrysu – výplň v tmavšej farbe obrysu, aby bola cesta viditeľná
    const color = z < 12 && s[2] && (cls === 'tertiary' || cls === 'unclassified' || cls === 'residential_rd') ? '#c4c0b8' : s[1];
    stroke(cls, color, w, s[4] && !s[5] ? s[4] : null);
  }
  for (const cls of OVER) { const s = LINE[cls]; if (z >= s[0]) stroke(cls, s[1], width(s[2], z), s[3]); }
  ctx.setLineDash([]);
}

// Leaflet vrstva (GridLayer) – vytvorí sa až po načítaní Leafletu
export function offlineLayer(opts = {}) {
  const L = W.L;
  const Layer = L.GridLayer.extend({
    createTile(coords, done) {
      const tile = document.createElement('canvas');
      const size = this.getTileSize().x;
      const r = W.devicePixelRatio > 1 ? 2 : 1;
      tile.width = size * r; tile.height = size * r;
      const ctx = tile.getContext('2d');
      ctx.scale(r, r);
      offlineReady().then(async (ok) => {
        if (!ok) throw new Error('offline map missing');
        const keys = dataTilesFor(coords.z, coords.x, coords.y);
        const tiles = (await Promise.all(keys.map(async (key) => ({ key, d: await getTile(key) })))).filter((t) => t.d);
        drawTile(ctx, coords.z, coords.x, coords.y, size, tiles);
        done(null, tile);
      }).catch((e) => { ctx.fillStyle = LAND; ctx.fillRect(0, 0, size, size); done(e, tile); });
      return tile;
    },
  });
  return new Layer({ maxZoom: 19, maxNativeZoom: 18, attribution: opts.attribution, className: 'kp-offline', updateWhenZooming: false, keepBuffer: 3 });
}

// ---------- popisy (obce, cesty, ulice) ----------
const FONT = '"Inter", "Segoe UI", system-ui, -apple-system, sans-serif';
const PLACE_STYLE = {
  // typ: [veľkosť písma, hrúbka, farba]
  0: [15, 700, '#222'], // hlavné mesto / veľkomesto
  1: [13, 700, '#222'], // mesto
  2: [12, 600, '#333'], // menšie mesto
  3: [11, 600, '#3a3a3a'], // obec
  4: [10, 500, '#555'], // osada, časť
  5: [10, 500, '#666'], // štvrť
  9: [13, 800, '#6b4b74'], // štát
};
function lonLatOf(a) { return [a[0] / 1e5, a[1] / 1e5]; }

export function labelLayer(lang = 'sk') {
  const L = W.L;
  const Layer = L.Layer.extend({
    onAdd(map) {
      this._map = map;
      if (!map.getPane('kpLabels')) { const p = map.createPane('kpLabels'); p.style.zIndex = 450; p.style.pointerEvents = 'none'; }
      this._c = L.DomUtil.create('canvas', 'kp-labels', map.getPane('kpLabels'));
      this._hide = () => { this._c.style.display = 'none'; };
      map.on('moveend zoomend resize viewreset', this._redraw, this);
      map.on('zoomstart', this._hide, this);
      offlineReady().then(() => this._redraw());
    },
    onRemove(map) {
      map.off('moveend zoomend resize viewreset', this._redraw, this);
      map.off('zoomstart', this._hide, this);
      this._c.remove();
    },
    async _redraw() {
      const map = this._map;
      if (!map || !state.labels) return;
      const seq = (this._seq = (this._seq || 0) + 1);
      const z = Math.round(map.getZoom());
      const size = map.getSize();
      const b = map.getBounds().pad(0.05);
      const cand = [];
      const lab = state.labels;
      const inView = (lon, lat) => lat >= b.getSouth() && lat <= b.getNorth() && lon >= b.getWest() && lon <= b.getEast();
      for (const c of lab.c || []) { // štáty
        if (z < c[3] || z > c[4]) continue;
        const [lon, lat] = lonLatOf(c);
        if (inView(lon, lat)) cand.push({ lon, lat, text: c[2][lang] || c[2].en, type: 9, pri: -1 });
      }
      for (const p of lab.p || []) { // obce a mestá
        if (z < p[3]) continue;
        const [lon, lat] = lonLatOf(p);
        if (inView(lon, lat)) cand.push({ lon, lat, text: p[2], type: p[4], pri: p[3] * 10 + p[4] - (p[5] || 0) / 1e7 });
      }
      for (const s of lab.s || []) { // čísla ciest
        if (z < s[4]) continue;
        const [lon, lat] = lonLatOf(s);
        if (inView(lon, lat)) cand.push({ lon, lat, text: s[2], shield: s[3], pri: 40 + s[4] * 10 + s[3] });
      }
      // názvy ulíc z načítaných podrobných dlaždíc
      if (z >= 15) {
        const tb = map.getPixelBounds();
        const ts = 256;
        const keys = new Set();
        for (let tx = Math.floor(tb.min.x / ts); tx <= Math.floor(tb.max.x / ts); tx++) {
          for (let ty = Math.floor(tb.min.y / ts); ty <= Math.floor(tb.max.y / ts); ty++) {
            for (const k of dataTilesFor(z, tx, ty)) if (k.startsWith('12/')) keys.add(k);
          }
        }
        for (const key of keys) {
          const d = await getTile(key).catch(() => null);
          if (seq !== this._seq) return;
          if (!d) continue;
          const [dz, x, y] = key.split('/').map(Number);
          const ext = state.index.extent;
          for (const t of d.text) {
            if (z < t[4]) continue;
            // súradnice dlaždice → zemepisné
            const X = (x + t[0] / ext) / 2 ** dz, Y = (y + t[1] / ext) / 2 ** dz;
            const lon = X * 360 - 180;
            const lat = (Math.atan(Math.sinh(Math.PI * (1 - 2 * Y))) * 180) / Math.PI;
            cand.push({ lon, lat, text: t[3], angle: t[2] / 10, street: true, pri: 80 - t[5] });
          }
        }
      }
      if (seq !== this._seq) return;
      cand.sort((a, b2) => a.pri - b2.pri);
      const c = this._c;
      const r = W.devicePixelRatio > 1 ? 2 : 1;
      c.width = size.x * r; c.height = size.y * r;
      c.style.width = size.x + 'px'; c.style.height = size.y + 'px';
      L.DomUtil.setPosition(c, map.containerPointToLayerPoint([0, 0]));
      const ctx = c.getContext('2d');
      ctx.scale(r, r);
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const placed = [];
      const hit = (bx) => placed.some((p) => bx[0] < p[2] && bx[2] > p[0] && bx[1] < p[3] && bx[3] > p[1]);
      let n = 0;
      for (const l of cand) {
        if (n > 400) break;
        const pt = map.latLngToContainerPoint([l.lat, l.lon]);
        if (l.shield !== undefined) {
          ctx.font = `700 10px ${FONT}`;
          const w = ctx.measureText(l.text).width + 8, h = 14;
          const bx = [pt.x - w / 2 - 2, pt.y - h / 2 - 2, pt.x + w / 2 + 2, pt.y + h / 2 + 2];
          if (hit(bx)) continue;
          placed.push(bx); n++;
          ctx.fillStyle = l.shield <= 1 ? '#c2506a' : l.shield === 2 ? '#c26a52' : '#fff';
          ctx.strokeStyle = l.shield <= 2 ? '#fff' : '#9a7a3a';
          ctx.lineWidth = 1;
          ctx.beginPath(); ctx.roundRect ? ctx.roundRect(pt.x - w / 2, pt.y - h / 2, w, h, 3) : ctx.rect(pt.x - w / 2, pt.y - h / 2, w, h);
          ctx.fill(); ctx.stroke();
          ctx.fillStyle = l.shield <= 2 ? '#fff' : '#333';
          ctx.fillText(l.text, pt.x, pt.y + 0.5);
          continue;
        }
        if (l.street) {
          ctx.font = `500 11px ${FONT}`;
          const w = ctx.measureText(l.text).width;
          let a = (l.angle * Math.PI) / 180;
          if (a > Math.PI / 2) a -= Math.PI; else if (a < -Math.PI / 2) a += Math.PI;
          const cw = Math.abs(Math.cos(a)) * w + 12, ch = Math.abs(Math.sin(a)) * w + 12;
          const bx = [pt.x - cw / 2, pt.y - ch / 2, pt.x + cw / 2, pt.y + ch / 2];
          if (hit(bx)) continue;
          placed.push(bx); n++;
          ctx.save(); ctx.translate(pt.x, pt.y); ctx.rotate(a);
          ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.strokeText(l.text, 0, 0);
          ctx.fillStyle = '#444'; ctx.fillText(l.text, 0, 0);
          ctx.restore();
          continue;
        }
        const st = PLACE_STYLE[l.type] || PLACE_STYLE[3];
        const fs = l.type === 9 ? st[0] + (z >= 5 ? 2 : 0) : st[0] + (z >= 13 && l.type <= 3 ? 2 : 0);
        ctx.font = `${st[1]} ${fs}px ${FONT}`;
        const text = l.type === 9 ? l.text.toUpperCase() : l.text;
        const w = ctx.measureText(text).width;
        const bx = [pt.x - w / 2 - 3, pt.y - fs / 2 - 2, pt.x + w / 2 + 3, pt.y + fs / 2 + 2];
        if (hit(bx)) continue;
        placed.push(bx); n++;
        ctx.lineWidth = 3.2; ctx.strokeStyle = 'rgba(255,255,255,.92)'; ctx.strokeText(text, pt.x, pt.y);
        ctx.fillStyle = st[2]; ctx.fillText(text, pt.x, pt.y);
      }
      c.style.display = '';
    },
  });
  return new Layer();
}
