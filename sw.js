// Service worker Krízovej príručky – offline režim.
const VERSION = '80443ab663';
const PRECACHE = [["assets/book/cs/batozina.js","37573777b6"],["assets/book/cs/burky.js","c53cf4e11f"],["assets/book/cs/chemicka.js","1a726d8fe5"],["assets/book/cs/ekonomicka.js","825ae4dd44"],["assets/book/cs/energie-scenare.js","51e4a3f41c"],["assets/book/cs/evakuacia.js","2c7757e334"],["assets/book/cs/horucavy.js","84618d4acb"],["assets/book/cs/hygiena-psychika.js","4e53d1ad16"],["assets/book/cs/index.js","20df576ffe"],["assets/book/cs/jadrova.js","488cec03ff"],["assets/book/cs/komunikacie.js","88b7e043a1"],["assets/book/cs/komunita.js","95806a8892"],["assets/book/cs/konflikt.js","89ebb4d7af"],["assets/book/cs/kontrolne-zoznamy.js","5ee9ba2673"],["assets/book/cs/kryty-europa.js","cbcc76cc1d"],["assets/book/cs/mrazy.js","7ffc754dcb"],["assets/book/cs/nakupne-zoznamy.js","2de5ee5ef0"],["assets/book/cs/pandemia.js","c14e8d90b9"],["assets/book/cs/plan.js","6543f8d06f"],["assets/book/cs/povodne.js","057591fd36"],["assets/book/cs/poziare.js","79b8b387e2"],["assets/book/cs/principy.js","16158a2ea5"],["assets/book/cs/prva-pomoc.js","b36e4c474d"],["assets/book/cs/rozcestnik.js","9b95407aef"],["assets/book/cs/sablony.js","73f2db5c51"],["assets/book/cs/scenare.js","95ac8b33db"],["assets/book/cs/sebestacnost.js","b152df0565"],["assets/book/cs/slovnik.js","ce6d42898f"],["assets/book/cs/terorizmus.js","45a8f43fd2"],["assets/book/cs/ukrytie.js","d5f78a83d1"],["assets/book/cs/varovanie.js","e4e81cfddc"],["assets/book/cs/vypadok-elektriny.js","c6b7c3a1ac"],["assets/book/cs/vypadok-vody.js","e913508cc6"],["assets/book/cs/zasoby.js","95a59dadc7"],["assets/book/cs/zdroje.js","65b7f518e2"],["assets/book/cs/zemetrasenie.js","27faa7b465"],["assets/book/cs/zranitelni.js","baeb4aa07b"],["assets/book/en/batozina.js","25738a5094"],["assets/book/en/burky.js","0e1c9904a1"],["assets/book/en/chemicka.js","c79e61fc13"],["assets/book/en/ekonomicka.js","a50b0450e7"],["assets/book/en/energie-scenare.js","b68eababd9"],["assets/book/en/evakuacia.js","ad2e70fd71"],["assets/book/en/horucavy.js","ea7b1c52ea"],["assets/book/en/hygiena-psychika.js","8bb368d579"],["assets/book/en/index.js","037d95b93f"],["assets/book/en/jadrova.js","5728815c49"],["assets/book/en/komunikacie.js","1312d9ef51"],["assets/book/en/komunita.js","0c6d0bc2ee"],["assets/book/en/konflikt.js","42926329bd"],["assets/book/en/kontrolne-zoznamy.js","f916233d32"],["assets/book/en/kryty-europa.js","48be72ff75"],["assets/book/en/mrazy.js","9ece93d8d8"],["assets/book/en/nakupne-zoznamy.js","f66e4addac"],["assets/book/en/pandemia.js","f1cbfd1a4e"],["assets/book/en/plan.js","52324aaa51"],["assets/book/en/povodne.js","ab0c6943b9"],["assets/book/en/poziare.js","8e6a0162c0"],["assets/book/en/principy.js","ee642d91b2"],["assets/book/en/prva-pomoc.js","e13de1544d"],["assets/book/en/rozcestnik.js","c1496acb60"],["assets/book/en/sablony.js","d61a4a115e"],["assets/book/en/scenare.js","ce4ba40f02"],["assets/book/en/sebestacnost.js","c1eba4ef6d"],["assets/book/en/slovnik.js","f46e47dc25"],["assets/book/en/terorizmus.js","e505f444df"],["assets/book/en/ukrytie.js","dcc27409bb"],["assets/book/en/varovanie.js","d45fcc2dd3"],["assets/book/en/vypadok-elektriny.js","a4c555fcab"],["assets/book/en/vypadok-vody.js","8e5a8de2b6"],["assets/book/en/zasoby.js","b622cf3451"],["assets/book/en/zdroje.js","2ff40b0b77"],["assets/book/en/zemetrasenie.js","917f2f7f53"],["assets/book/en/zranitelni.js","bbb441becd"],["assets/book/hu/batozina.js","c354e0103b"],["assets/book/hu/burky.js","2ce887400a"],["assets/book/hu/chemicka.js","de1f751ce3"],["assets/book/hu/ekonomicka.js","ba1c3c2e7b"],["assets/book/hu/energie-scenare.js","90cac0910a"],["assets/book/hu/evakuacia.js","0ea7409036"],["assets/book/hu/horucavy.js","6f92f9a87b"],["assets/book/hu/hygiena-psychika.js","0f4b12ee7d"],["assets/book/hu/index.js","0265afe89f"],["assets/book/hu/jadrova.js","07faa27b87"],["assets/book/hu/komunikacie.js","b497190827"],["assets/book/hu/komunita.js","5d9643fc5f"],["assets/book/hu/konflikt.js","c850d6d75c"],["assets/book/hu/kontrolne-zoznamy.js","fcfbf25fe9"],["assets/book/hu/kryty-europa.js","0e0ce926fc"],["assets/book/hu/mrazy.js","dd16d309c8"],["assets/book/hu/nakupne-zoznamy.js","97ecbf28d2"],["assets/book/hu/pandemia.js","15b63941cd"],["assets/book/hu/plan.js","e6868aa885"],["assets/book/hu/povodne.js","645ec591b1"],["assets/book/hu/poziare.js","bdf7a19d4c"],["assets/book/hu/principy.js","81217a9584"],["assets/book/hu/prva-pomoc.js","dbdb471fa2"],["assets/book/hu/rozcestnik.js","450a509f1d"],["assets/book/hu/sablony.js","035a6ae9fe"],["assets/book/hu/scenare.js","c6c1ed75bf"],["assets/book/hu/sebestacnost.js","faddbb1538"],["assets/book/hu/slovnik.js","4393827585"],["assets/book/hu/terorizmus.js","662290d66e"],["assets/book/hu/ukrytie.js","d145b31cb8"],["assets/book/hu/varovanie.js","d2be255429"],["assets/book/hu/vypadok-elektriny.js","46a6b94380"],["assets/book/hu/vypadok-vody.js","d039889c36"],["assets/book/hu/zasoby.js","caaf8b1a9b"],["assets/book/hu/zdroje.js","73b579430e"],["assets/book/hu/zemetrasenie.js","e634b917ef"],["assets/book/hu/zranitelni.js","db7dc1a36b"],["assets/book/pl/batozina.js","8c5d2bfb61"],["assets/book/pl/burky.js","35a7fee9b9"],["assets/book/pl/chemicka.js","f37ecb400e"],["assets/book/pl/ekonomicka.js","f277ab4118"],["assets/book/pl/energie-scenare.js","7fcbb152e5"],["assets/book/pl/evakuacia.js","630155d781"],["assets/book/pl/horucavy.js","aa10465335"],["assets/book/pl/hygiena-psychika.js","c8478b02cd"],["assets/book/pl/index.js","c974e35df2"],["assets/book/pl/jadrova.js","d48f666055"],["assets/book/pl/komunikacie.js","19854d7a49"],["assets/book/pl/komunita.js","95aafeabf4"],["assets/book/pl/konflikt.js","bcd2154cfc"],["assets/book/pl/kontrolne-zoznamy.js","b1e320994c"],["assets/book/pl/kryty-europa.js","e3766b349b"],["assets/book/pl/mrazy.js","51c00c0301"],["assets/book/pl/nakupne-zoznamy.js","63e67d345a"],["assets/book/pl/pandemia.js","2dcae98130"],["assets/book/pl/plan.js","6142158708"],["assets/book/pl/povodne.js","be84224de6"],["assets/book/pl/poziare.js","01ba3f3000"],["assets/book/pl/principy.js","d816462f6c"],["assets/book/pl/prva-pomoc.js","cb95f6bbdc"],["assets/book/pl/rozcestnik.js","04a5ad738e"],["assets/book/pl/sablony.js","3a426ba611"],["assets/book/pl/scenare.js","1e8a869025"],["assets/book/pl/sebestacnost.js","dc434d8a00"],["assets/book/pl/slovnik.js","1752e3d0c9"],["assets/book/pl/terorizmus.js","1ede366f14"],["assets/book/pl/ukrytie.js","ab04eef9e1"],["assets/book/pl/varovanie.js","49babfa06f"],["assets/book/pl/vypadok-elektriny.js","29da26de6c"],["assets/book/pl/vypadok-vody.js","486a08d446"],["assets/book/pl/zasoby.js","db848d36c5"],["assets/book/pl/zdroje.js","cdc95e1bb4"],["assets/book/pl/zemetrasenie.js","8ec128fa45"],["assets/book/pl/zranitelni.js","3b00d83a59"],["assets/book/sk/batozina.js","a721f72330"],["assets/book/sk/burky.js","087f4fe186"],["assets/book/sk/chemicka.js","f1eccf1259"],["assets/book/sk/ekonomicka.js","c3a3813621"],["assets/book/sk/energie-scenare.js","dff015e5bb"],["assets/book/sk/evakuacia.js","3389e898c5"],["assets/book/sk/horucavy.js","49931bb117"],["assets/book/sk/hygiena-psychika.js","1191a59e4e"],["assets/book/sk/index.js","9851827ba6"],["assets/book/sk/jadrova.js","c5af5e9750"],["assets/book/sk/komunikacie.js","176565d636"],["assets/book/sk/komunita.js","e6d9389282"],["assets/book/sk/konflikt.js","9b8b951244"],["assets/book/sk/kontrolne-zoznamy.js","234f8b4cdc"],["assets/book/sk/kryty-europa.js","01cb0e2a62"],["assets/book/sk/mrazy.js","0515582ccb"],["assets/book/sk/nakupne-zoznamy.js","5cb6b561b5"],["assets/book/sk/pandemia.js","c70edcde37"],["assets/book/sk/plan.js","80cec68302"],["assets/book/sk/povodne.js","569a39c0b0"],["assets/book/sk/poziare.js","0c573c3663"],["assets/book/sk/principy.js","204e6328bb"],["assets/book/sk/prva-pomoc.js","63fb24d3d0"],["assets/book/sk/rozcestnik.js","7f2d80d158"],["assets/book/sk/sablony.js","0d9fcfeed9"],["assets/book/sk/scenare.js","2e4c6a8ef3"],["assets/book/sk/sebestacnost.js","849d13824b"],["assets/book/sk/slovnik.js","290c90aa9b"],["assets/book/sk/terorizmus.js","d6f8c60f50"],["assets/book/sk/ukrytie.js","35f7e3257d"],["assets/book/sk/varovanie.js","c1469a1901"],["assets/book/sk/vypadok-elektriny.js","cb9c115eee"],["assets/book/sk/vypadok-vody.js","11bc088f37"],["assets/book/sk/zasoby.js","fd73da6356"],["assets/book/sk/zdroje.js","6986758ce5"],["assets/book/sk/zemetrasenie.js","94332759ec"],["assets/book/sk/zranitelni.js","668c8dfb77"],["assets/css/app.css","78a962df09"],["assets/css/book-print.css","7c99418d33"],["assets/css/epub.css","48959dd2ab"],["assets/css/manual.css","571c845cf1"],["assets/css/print.css","733db8e60f"],["assets/css/site.css","f1206e1dff"],["assets/css/theme.css","daced54eb8"],["assets/downloads.js","1e01014922"],["assets/extra/kryty-sk.js","bba9a39f53"],["assets/fonts/atkinson-hyperlegible-latin-400-normal.woff2","3201099022"],["assets/fonts/atkinson-hyperlegible-latin-700-normal.woff2","05dadf003f"],["assets/fonts/atkinson-hyperlegible-latin-ext-400-normal.woff2","3a54aad037"],["assets/fonts/atkinson-hyperlegible-latin-ext-700-normal.woff2","97dbf56ced"],["assets/fonts/inter-latin-200-normal.woff2","18c82a74bf"],["assets/fonts/inter-latin-300-normal.woff2","71344c7f44"],["assets/fonts/inter-latin-400-normal.woff2","68f645c6b6"],["assets/fonts/inter-latin-600-normal.woff2","e0d61f6dc5"],["assets/fonts/inter-latin-700-normal.woff2","5197a7aeb2"],["assets/fonts/inter-latin-ext-200-normal.woff2","5faf504778"],["assets/fonts/inter-latin-ext-300-normal.woff2","f61b8cb65d"],["assets/fonts/inter-latin-ext-400-normal.woff2","1bf1f83717"],["assets/fonts/inter-latin-ext-600-normal.woff2","ed01801086"],["assets/fonts/inter-latin-ext-700-normal.woff2","c8d5550678"],["assets/fonts/oxanium-latin-500-normal.woff2","e444e828d0"],["assets/fonts/oxanium-latin-700-normal.woff2","ae5fa582cb"],["assets/fonts/oxanium-latin-ext-500-normal.woff2","75bb754893"],["assets/fonts/oxanium-latin-ext-700-normal.woff2","a882326e70"],["assets/fonts/source-serif-4-latin-600-normal.woff2","d2ebdb22f2"],["assets/fonts/source-serif-4-latin-700-normal.woff2","40999a7f59"],["assets/fonts/source-serif-4-latin-ext-600-normal.woff2","6a9cab53c1"],["assets/fonts/source-serif-4-latin-ext-700-normal.woff2","7ee631f3b0"],["assets/fonts/space-grotesk-latin-600-normal.woff2","da32251fe0"],["assets/fonts/space-grotesk-latin-700-normal.woff2","094681c9ad"],["assets/fonts/space-grotesk-latin-ext-600-normal.woff2","e8ad82b0a2"],["assets/fonts/space-grotesk-latin-ext-700-normal.woff2","4c1311a24b"],["assets/i18n/hu.js","db75a04522"],["assets/i18n/pl.js","daee38cab8"],["assets/img/icon-180.png","7b365c1562"],["assets/img/icon-192.png","6caaa821f5"],["assets/img/icon-512.png","c7ee7ccd3b"],["assets/img/icon-maskable-512.png","fea735106f"],["assets/img/logo.svg","4017113f7c"],["assets/js/app.js","5ae634ddf8"],["assets/map/6-3-1.js","a802647325"],["assets/map/6-3-2.js","b08728ed6d"],["assets/map/6-3-3.js","b9dbb94379"],["assets/map/6-4-1.js","de14e97a73"],["assets/map/6-4-2.js","d1de37df6d"],["assets/map/6-4-3.js","ccc30e9404"],["assets/map/6-5-1.js","28c1a7382f"],["assets/map/6-5-2.js","6efc0cb49c"],["assets/map/6-5-3.js","fe906d223b"],["assets/map/base.js","8cdb6197e3"],["assets/map/countries.js","0c53532ad5"],["assets/map/index.js","002eacf709"],["assets/map/labels.js","1c86aaae9d"],["assets/vendor/leaflet/images/layers-2x.png","152a162333"],["assets/vendor/leaflet/images/layers.png","c9e7528e49"],["assets/vendor/leaflet/images/marker-icon-2x.png","cf3a536596"],["assets/vendor/leaflet/images/marker-icon.png","60a90bcbb2"],["assets/vendor/leaflet/images/marker-shadow.png","7b6a8df639"],["assets/vendor/leaflet/leaflet.css","ec929f1100"],["assets/vendor/leaflet/leaflet.js","5a640ff863"],["index.html","e81d77515b"],["manifest.webmanifest","652fb92a51"]];
const CORE = 'kp-core-' + VERSION;
const TILES = 'kp-tiles';
const DOCS = 'kp-docs';
const MAPS = 'kp-map-2026-10-27'; // offline mapové dáta (nemenia sa s verziou aplikácie)
const TILE_LIMIT = 4000;

// PRECACHE: [[súbor, kontrolný súčet], …]. V cache je súbor pod adresou „súbor?v=súčet“. Pri novej verzii
// sa nezmenené súbory prekopírujú zo starej cache – stiahne sa len to, čo sa zmenilo (šetrí dáta aj hosting).
const keyOf = ([f, h]) => new URL(`${f}?v=${h}`, self.registration.scope).href;
self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CORE);
    const old = await Promise.all((await caches.keys()).filter((k) => k.startsWith('kp-core-') && k !== CORE).map((k) => caches.open(k)));
    const queue = PRECACHE.slice();
    const worker = async () => {
      for (let item = queue.shift(); item; item = queue.shift()) {
        const key = keyOf(item);
        if (await cache.match(key)) continue;
        let res = null;
        for (const c of old) { res = await c.match(key); if (res) break; }
        if (!res) {
          res = await fetch(new URL(item[0], self.registration.scope).href, { cache: 'no-cache' });
          if (!res.ok) throw new Error(`${item[0]}: ${res.status}`);
        }
        await cache.put(key, res);
      }
    };
    await Promise.all(Array.from({ length: 6 }, worker));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => (k.startsWith('kp-core-') && k !== CORE) || (k.startsWith('kp-map-') && k !== MAPS)).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

async function trimTiles() {
  const cache = await caches.open(TILES);
  const keys = await cache.keys();
  if (keys.length > TILE_LIMIT) for (const k of keys.slice(0, keys.length - TILE_LIMIT)) await cache.delete(k);
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (/(^|\.)tile\.(openstreetmap\.(org|fr|de)|opentopomap\.org)$/.test(url.hostname)) {
    event.respondWith((async () => {
      const cache = await caches.open(TILES);
      const hit = await cache.match(req);
      if (hit) return hit;
      try {
        const res = await fetch(req);
        if (res.ok || res.type === 'opaque') { cache.put(req, res.clone()); if (Math.random() < 0.02) trimTiles(); }
        return res;
      } catch (e) {
        return new Response('', { status: 504 });
      }
    })());
    return;
  }
  if (url.origin !== self.location.origin) return;
  event.respondWith((async () => {
    const cached = await caches.match(req, { ignoreSearch: true });
    if (cached) return cached;
    try {
      const res = await fetch(req);
      if (res.ok) {
        const rel = url.pathname.replace(new URL(self.registration.scope).pathname, '');
        const target = rel.startsWith('downloads/') ? DOCS : rel.startsWith('assets/map/') ? MAPS : CORE;
        caches.open(target).then((c) => c.put(req, res.clone()));
      }
      return res;
    } catch (e) {
      if (req.mode === 'navigate') {
        const fallback = await caches.match(new URL('index.html', self.registration.scope).href, { ignoreSearch: true });
        if (fallback) return fallback;
      }
      return new Response('Offline', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
    }
  })());
});

async function cacheList(cacheName, urls, port, label) {
  const cache = await caches.open(cacheName);
  let done = 0, failed = 0;
  for (const u of urls) {
    try {
      if (!(await cache.match(u))) {
        const res = await fetch(u, { mode: u.startsWith('http') ? 'cors' : 'same-origin' });
        if (res.ok) await cache.put(u, res); else failed++;
      }
    } catch (e) { failed++; }
    done++;
    if (port && (done % 10 === 0 || done === urls.length)) port.postMessage({ label, done, total: urls.length, failed });
    if (cacheName === TILES) await new Promise((r) => setTimeout(r, 60));
  }
  if (port) port.postMessage({ label, done, total: urls.length, failed, finished: true });
}

self.addEventListener('message', (event) => {
  const msg = event.data || {};
  const port = event.ports && event.ports[0];
  if (msg.type === 'cache-docs') {
    event.waitUntil(cacheList(DOCS, msg.urls || [], port, 'docs'));
  } else if (msg.type === 'cache-tiles') {
    event.waitUntil(cacheList(TILES, (msg.urls || []).slice(0, 1500), port, 'tiles'));
  } else if (msg.type === 'version' && port) {
    port.postMessage({ version: VERSION });
  }
});
