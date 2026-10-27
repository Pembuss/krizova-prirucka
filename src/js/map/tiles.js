// Mapové podklady: predvolene offline mapa priložená k aplikácii (bez internetu a bez služieb tretích strán),
// online podklady OpenStreetMap iba ako voliteľná možnosť v prepínači.
import { store } from '../app/store.js';
import { t, toast } from '../app/core.js';
import { offlineLayer, labelLayer, offlineReady } from './offline.js';

const OSM = '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';
const OFFLINE_ATTR = `${OSM} · <a href="https://www.naturalearthdata.com/">Natural Earth</a> · offline`;
export const BASEMAPS = {
  offline: { offline: true, maxZoom: 18, attribution: OFFLINE_ATTR },
  // Hlavný server OSM vyžaduje hlavičku Referer – pri otvorení z disku (file://) vracia „Access blocked“.
  osm: { url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png', maxZoom: 19, attribution: OSM, needsReferer: true },
  hot: { url: 'https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', subdomains: 'abc', maxZoom: 19, attribution: `${OSM} · <a href="https://www.hotosm.org/">HOT</a> · OSM France` },
  de: { url: 'https://tile.openstreetmap.de/{z}/{x}/{y}.png', maxZoom: 18, attribution: `${OSM} · openstreetmap.de` },
  topo: { url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', subdomains: 'abc', maxZoom: 17, attribution: `${OSM} · SRTM · <a href="https://opentopomap.org">OpenTopoMap</a> (CC-BY-SA)` },
};
export const LOCAL = location.protocol === 'file:';

export function basemapOrder() {
  // Verzia 2.0: predvolená je offline mapa – staršia voľba online podkladu sa raz vynuluje.
  if (store.prefs.mapV !== 2) { delete store.prefs.basemap; store.prefs.mapV = 2; store.savePrefs(); }
  const ids = Object.keys(BASEMAPS).filter((id) => !(LOCAL && BASEMAPS[id].needsReferer));
  const pref = store.prefs.basemap;
  return ids.includes(pref) ? [pref, ...ids.filter((x) => x !== pref)] : ids;
}

// Pridá podklad do mapy a prepínač; vráti funkciu, ktorá dá aktuálny podklad (pre offline uloženie dlaždíc).
export function addBasemap(map, { control = true } = {}) {
  const L = window.L;
  const order = basemapOrder();
  const layers = {};
  const labels = labelLayer(document.documentElement.lang || 'sk');
  for (const id of order) {
    layers[id] = BASEMAPS[id].offline
      ? offlineLayer({ attribution: BASEMAPS[id].attribution })
      : L.tileLayer(BASEMAPS[id].url, { maxZoom: BASEMAPS[id].maxZoom, subdomains: BASEMAPS[id].subdomains || 'abc', attribution: BASEMAPS[id].attribution });
  }
  let current = order[0];
  const show = (id) => {
    current = id;
    if (BASEMAPS[id].offline) { if (!map.hasLayer(labels)) labels.addTo(map); }
    else if (map.hasLayer(labels)) map.removeLayer(labels);
    map.setMaxZoom(BASEMAPS[id].maxZoom + (BASEMAPS[id].offline ? 1 : 0));
  };
  let errors = 0, loaded = 0;
  const watch = (id) => {
    errors = 0; loaded = 0;
    if (BASEMAPS[id].offline) return;
    layers[id].off('tileerror').off('tileload');
    layers[id].on('tileload', () => { loaded++; });
    layers[id].on('tileerror', () => {
      errors++;
      // Online podklad sa nenačítal (bez internetu, blokovaný server) → späť na offline mapu.
      if (errors >= 4 && loaded === 0 && map.hasLayer(layers[id])) {
        const next = layers.offline ? 'offline' : order[order.indexOf(id) + 1];
        if (next && next !== id) { map.removeLayer(layers[id]); layers[next].addTo(map); show(next); watch(next); toast(t('map.baseSwitched', { name: t('base.' + next) }), 4000); }
      }
    });
  };
  layers[current].addTo(map);
  show(current);
  watch(current);
  // Ak by offline dáta v balíku chýbali (napr. neúplné nasadenie), prepni na online podklad.
  if (BASEMAPS[current].offline) {
    offlineReady().then((ok) => {
      if (ok || !map.hasLayer(layers[current])) return;
      const next = order.find((x) => !BASEMAPS[x].offline);
      if (!next) return;
      map.removeLayer(layers[current]); layers[next].addTo(map); show(next); watch(next);
    });
  }
  if (control) {
    const named = {};
    for (const id of order) named[t('base.' + id)] = layers[id];
    L.control.layers(named, null, { position: 'topright', collapsed: true }).addTo(map);
    map.on('baselayerchange', (e) => {
      const id = order.find((x) => layers[x] === e.layer);
      if (!id) return;
      show(id); watch(id);
      store.prefs.basemap = id; store.savePrefs();
    });
  }
  return () => BASEMAPS[current];
}
