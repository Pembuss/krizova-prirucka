// Mapové podklady: viac poskytovateľov, výber podľa spôsobu otvorenia a prepnutie, keď podklad nefunguje.
import { store } from '../app/store.js';
import { t, toast } from '../app/core.js';

const OSM = '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';
export const BASEMAPS = {
  // Hlavný server OSM vyžaduje hlavičku Referer – pri otvorení z disku (file://) vracia „Access blocked“.
  osm: { url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png', maxZoom: 19, attribution: OSM, needsReferer: true },
  hot: { url: 'https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', subdomains: 'abc', maxZoom: 19, attribution: `${OSM} · <a href="https://www.hotosm.org/">HOT</a> · OSM France` },
  de: { url: 'https://tile.openstreetmap.de/{z}/{x}/{y}.png', maxZoom: 18, attribution: `${OSM} · openstreetmap.de` },
  topo: { url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', subdomains: 'abc', maxZoom: 17, attribution: `${OSM} · SRTM · <a href="https://opentopomap.org">OpenTopoMap</a> (CC-BY-SA)` },
};
export const LOCAL = location.protocol === 'file:';

export function basemapOrder() {
  const ids = Object.keys(BASEMAPS).filter((id) => !(LOCAL && BASEMAPS[id].needsReferer));
  const pref = store.prefs.basemap;
  return ids.includes(pref) ? [pref, ...ids.filter((x) => x !== pref)] : ids;
}

// Pridá podklad do mapy a prepínač štýlu; vráti funkciu, ktorá dá aktuálnu šablónu URL (pre offline uloženie).
export function addBasemap(map, { control = true } = {}) {
  const L = window.L;
  const order = basemapOrder();
  const layers = {};
  for (const id of order) layers[id] = L.tileLayer(BASEMAPS[id].url, { maxZoom: BASEMAPS[id].maxZoom, subdomains: BASEMAPS[id].subdomains || 'abc', attribution: BASEMAPS[id].attribution });
  let current = order[0];
  let errors = 0, loaded = 0;
  const watch = (id) => {
    errors = 0; loaded = 0;
    layers[id].off('tileerror').off('tileload');
    layers[id].on('tileload', () => { loaded++; });
    layers[id].on('tileerror', () => {
      errors++;
      // Keď sa nenačíta žiadna dlaždica, skús ďalšieho poskytovateľa.
      if (errors >= 4 && loaded === 0 && navigator.onLine !== false) {
        const next = order[order.indexOf(id) + 1];
        if (next && map.hasLayer(layers[id])) { map.removeLayer(layers[id]); layers[next].addTo(map); current = next; watch(next); toast(t('map.baseSwitched', { name: t('base.' + next) }), 4000); }
      }
    });
  };
  layers[current].addTo(map);
  watch(current);
  if (control) {
    const named = {};
    for (const id of order) named[t('base.' + id)] = layers[id];
    L.control.layers(named, null, { position: 'topright', collapsed: true }).addTo(map);
    map.on('baselayerchange', (e) => {
      const id = order.find((x) => layers[x] === e.layer);
      if (!id) return;
      current = id; watch(id);
      store.prefs.basemap = id; store.savePrefs();
    });
  }
  return () => BASEMAPS[current];
}
