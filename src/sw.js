// Service worker Krízovej príručky – offline režim.
const VERSION = '__VERSION__';
const PRECACHE = __PRECACHE__;
const CORE = 'kp-core-' + VERSION;
const TILES = 'kp-tiles';
const DOCS = 'kp-docs';
const MAPS = 'kp-map-2026-10-27'; // offline mapové dáta (nemenia sa s verziou aplikácie)
const TILE_LIMIT = 4000;
const LANG_DIRS = ['sk/', 'cs/', 'en/'];
const isLangFile = (f) => LANG_DIRS.some((d) => f.startsWith(d));
const coreFiles = PRECACHE.filter((f) => !isLangFile(f));
const langFiles = (lang) => PRECACHE.filter((f) => f.startsWith(lang + '/'));

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CORE).then((c) => c.addAll(coreFiles)).then(() => self.skipWaiting()));
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
        const fallback = (await caches.match('sk/index.html')) || (await caches.match('app/index.html'));
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
  if (msg.type === 'cache-lang' && LANG_DIRS.includes(msg.lang + '/')) {
    event.waitUntil(cacheList(CORE, langFiles(msg.lang), port, 'lang'));
  } else if (msg.type === 'cache-docs') {
    event.waitUntil(cacheList(DOCS, msg.urls || [], port, 'docs'));
  } else if (msg.type === 'cache-tiles') {
    event.waitUntil(cacheList(TILES, (msg.urls || []).slice(0, 1500), port, 'tiles'));
  } else if (msg.type === 'version' && port) {
    port.postMessage({ version: VERSION });
  }
});
