// Automatické testy zostavenej aplikácie (dist) v Chromiu – spúšťa ich aj GitHub Actions pred nasadením.
// Použitie: npm test  (najprv npm run build; offline balík: node tools/package.mjs --web)
//   --quick  len slovenčina a bez offline balíka
// Kontroluje: všetky obrazovky v 5 jazykoch bez chýb v konzole, súbory na stiahnutie, limit 10 MB na súbor,
// offline režim (service worker), offline výpočet trasy a stiahnutie offline balíka (spojenie častí).
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { LANGS } from '../src/data/ui.js';
import { CHAPTERS } from '../src/data/book.js';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = process.env.KP_DIST ? path.resolve(process.env.KP_DIST) : path.join(ROOT, 'dist'); // KP_DIST: iný priečinok
const QUICK = process.argv.includes('--quick');
const ROUTES = ['', 'teraz', 'teraz/blackout/1', 'teraz/flood/vsetko', 'kniha', 'kniha/vypadok-elektriny', 'kniha/hladat/voda', 'mapa', 'trasy', 'plan', 'profil', 'zasoby', 'energia', 'batohy', 'rodina', 'karty', 'zoznamy', 'krajiny', 'kryty', 'tlac', 'pomoc', 'nastavenia', 'o-aplikacii', 'viac', 'uvod/0', 'instalacia', 'instalacia/navod/ios', 'instalacia/navod/android', 'instalacia/navod/desktop', 'instalacia/navod/inapp', 'instalacia/hotovo'];

let failed = 0;
const ok = (msg) => console.log('  ✓ ' + msg);
const fail = (msg) => { failed++; console.log('  ✗ ' + msg); };
const check = (cond, msg) => (cond ? ok(msg) : fail(msg));

function loadPlaywright() {
  for (const id of ['playwright', process.env.PLAYWRIGHT_MODULE, '/opt/node-tools/node_modules/playwright'].filter(Boolean)) {
    try { return require(id); } catch { /* ďalší */ }
  }
  throw new Error('Chýba Playwright (npm install).');
}
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.pdf': 'application/pdf', '.epub': 'application/epub+zip' };
const HITS = [];
let SW_EXTRA = '';
function serve() {
  const srv = http.createServer((req, res) => {
    let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (p.endsWith('/')) p += 'index.html';
    const f = path.join(DIST, p);
    if (!f.startsWith(DIST) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); res.end('not found'); return; }
    HITS.push(p);
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    // SW_EXTRA: simulácia novej verzie service workera (test aktualizácie)
    if (p === '/sw.js' && SW_EXTRA) { res.end(fs.readFileSync(f, 'utf8') + SW_EXTRA); return; }
    fs.createReadStream(f).pipe(res);
  });
  return new Promise((resolve) => srv.listen(0, '127.0.0.1', () => resolve(srv)));
}
function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]));
}

// fresh: prvé otvorenie (bez uložených nastavení); standalone: ako nainštalovaná aplikácia z ikony na ploche
async function newPage(browser, base, lang, extra = {}, { fresh = false, standalone = false } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block', acceptDownloads: true, ...extra });
  // iba lokálny server – externé mapové a vyhľadávacie služby sa v testoch nevolajú
  await ctx.route((u) => !u.href.startsWith(base), (r) => r.abort());
  if (!fresh) await ctx.addInitScript((l) => { if (!localStorage.getItem('kp.prefs')) localStorage.setItem('kp.prefs', JSON.stringify({ lang: l, onboarded: true, tourDone: true })); }, lang);
  // natívne inštalačné okno Chromia v testoch nechceme
  await ctx.addInitScript(() => window.addEventListener('beforeinstallprompt', (e) => e.stopImmediatePropagation(), true));
  if (standalone) {
    await ctx.addInitScript(() => {
      const orig = window.matchMedia.bind(window);
      window.matchMedia = (q) => (/display-mode:\s*standalone/.test(q) ? { matches: true, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} } : orig(q));
    });
  }
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push('console: ' + m.text()); });
  page.on('requestfailed', (r) => { if (r.url().startsWith(base)) errors.push('request: ' + r.url().slice(base.length)); });
  page.on('response', (r) => { if (r.url().startsWith(base) && r.status() >= 400) errors.push(`HTTP ${r.status()}: ${r.url().slice(base.length)}`); });
  return { ctx, page, errors };
}

async function main() {
  if (!fs.existsSync(path.join(DIST, 'index.html'))) throw new Error('Najprv zostav aplikáciu: npm run build');
  console.log('Súbory');
  const big = walk(DIST).filter((f) => fs.statSync(f).size > 10 * 1024 * 1024).map((f) => path.relative(DIST, f));
  check(!big.length, big.length ? `súbory nad 10 MB: ${big.join(', ')}` : 'žiadny súbor nemá viac ako 10 MB (limit Netlify)');
  const dlText = fs.readFileSync(path.join(DIST, 'assets/downloads.js'), 'utf8');
  const D = JSON.parse(dlText.slice(dlText.indexOf('=') + 1).trim().replace(/;$/, ''));
  const listed = [...Object.values(D.book).flatMap((b) => Object.values(b)), ...Object.values(D.manual), D.shelters, ...(D.offline?.parts || [])].filter(Boolean);
  const bad = listed.filter((f) => !fs.existsSync(path.join(DIST, f.file)) || fs.statSync(path.join(DIST, f.file)).size !== f.size);
  check(!bad.length, bad.length ? `nesedia súbory na stiahnutie: ${bad.map((f) => f.file).join(', ')}` : `${listed.length} súborov na stiahnutie existuje a sedí veľkosť`);
  const langs = LANGS.map((l) => l.id);
  const noBook = langs.filter((l) => !D.book[l]?.pdf || !D.book[l]?.epub);
  const noManual = langs.filter((l) => !D.manual[l]);
  if (!QUICK) {
    check(!noBook.length, noBook.length ? `chýba kniha PDF/EPUB: ${noBook.join(', ')}` : 'kniha PDF a EPUB vo všetkých jazykoch');
    check(!noManual.length, noManual.length ? `chýba návod k aplikácii: ${noManual.join(', ')}` : 'návod k aplikácii vo všetkých jazykoch');
  }
  for (const l of langs) {
    const n = fs.existsSync(path.join(DIST, 'assets/book', l)) ? fs.readdirSync(path.join(DIST, 'assets/book', l)).filter((f) => f !== 'index.js').length : 0;
    if (!QUICK || l === 'sk') check(n === CHAPTERS.length, `kniha v aplikácii ${l}: ${n}/${CHAPTERS.length} kapitol`);
  }

  const { chromium } = loadPlaywright();
  const browser = await chromium.launch();
  const srv = await serve();
  const base = `http://127.0.0.1:${srv.address().port}/`;
  try {
    for (const lang of QUICK ? ['sk'] : langs) {
      console.log(`Obrazovky – ${lang}`);
      const { ctx, page, errors } = await newPage(browser, base, lang);
      await page.goto(base + 'index.html#/');
      await page.waitForSelector('#view *');
      const empty = [];
      for (const r of ROUTES) {
        await page.evaluate((h) => { location.hash = h; }, '#/' + r);
        await page.waitForTimeout(r === 'mapa' || r === 'trasy' ? 900 : 250);
        const txt = await page.evaluate(() => document.querySelector('#view')?.innerText.trim().length || document.body.innerText.trim().length);
        if (txt < 20) empty.push(r || 'domov');
      }
      check(!empty.length, empty.length ? `prázdne obrazovky: ${empty.join(', ')}` : `${ROUTES.length} obrazoviek sa zobrazí`);
      check(await page.evaluate((l) => document.documentElement.lang === l, lang), `jazyk stránky je ${lang}`);
      check(!errors.length, errors.length ? `chyby: ${[...new Set(errors)].slice(0, 5).join(' | ')}` : 'bez chýb v konzole');
      await ctx.close();
    }

    console.log('Prvé otvorenie: inštalácia do telefónu');
    {
      const { ctx, page, errors } = await newPage(browser, base, 'sk', {}, { fresh: true });
      await page.goto(base + 'index.html');
      await page.waitForSelector('[data-install]', { timeout: 10000 }).catch(() => {});
      check(await page.evaluate(() => location.hash) === '#/instalacia', 'na webe sa najprv ponúkne inštalácia do telefónu');
      check(await page.locator('[data-install]').isVisible() && await page.locator('[data-browser]').isVisible(), 'tlačidlá „Nainštalovať“ a „Pokračovať v prehliadači“');
      await page.click('[data-install]');
      await page.waitForTimeout(400);
      check(await page.evaluate(() => location.hash) === '#/instalacia/navod' && await page.locator('.inst-steps li').count() === 3, 'bez natívneho okna sa ukáže návod krok za krokom');
      await page.goto(base + 'index.html#/instalacia');
      await page.waitForSelector('[data-browser]');
      await page.click('[data-browser]');
      await page.waitForTimeout(400);
      check(await page.evaluate(() => location.hash.startsWith('#/uvod')), '„Pokračovať v prehliadači“ otvorí úvodnú inštruktáž');
      await page.evaluate(() => { const p = JSON.parse(localStorage.getItem('kp.prefs')); p.onboarded = true; localStorage.setItem('kp.prefs', JSON.stringify(p)); location.hash = '#/'; location.reload(); });
      await page.waitForSelector('#view *');
      await page.waitForTimeout(400);
      check(await page.locator('.install-hint').count() === 1, 'na Domove je pripomienka inštalácie');
      await page.click('[data-hint-off]');
      await page.reload(); await page.waitForTimeout(500);
      check(await page.locator('.install-hint').count() === 0, 'pripomienka sa dá natrvalo zavrieť');
      check(!errors.length, errors.length ? `chyby: ${errors.slice(0, 3).join(' | ')}` : 'bez chýb v konzole');
      await ctx.close();
    }
    {
      const { ctx, page } = await newPage(browser, base, 'sk', {}, { fresh: true, standalone: true });
      await page.goto(base + 'index.html');
      await page.waitForTimeout(800);
      check(await page.evaluate(() => location.hash.startsWith('#/uvod')), 'nainštalovaná aplikácia ide rovno na inštruktáž, bez ponuky inštalácie');
      await page.goto(base + 'index.html#/nastavenia');
      await page.waitForTimeout(500);
      check(await page.locator('a[href="#/instalacia/navod"]').count() === 0, 'v nainštalovanej aplikácii sa inštalácia neponúka');
      await ctx.close();
    }

    console.log('Vzhľady A, B, C, D, E');
    for (const [look, sel] of [['a', '.home-a'], ['b', '.home-b'], ['c', '.home-c'], ['d', '.home-d'], ['e', '.home-e']]) {
      const { ctx, page, errors } = await newPage(browser, base, 'sk');
      await ctx.addInitScript((l) => localStorage.setItem('kp.prefs', JSON.stringify({ lang: 'sk', look: l, autoDark: false, onboarded: true, tourDone: true, installChoice: 'browser' })), look);
      await page.goto(base + 'index.html#/'); await page.waitForSelector(sel, { timeout: 8000 }).catch(() => {});
      const okHome = await page.locator(sel).count() === 1 && await page.evaluate((l) => document.documentElement.dataset.look === l, look);
      for (const r of ['teraz/blackout/1', 'kniha/vypadok-elektriny', 'viac', 'nastavenia']) { await page.evaluate((h) => { location.hash = h; }, '#/' + r); await page.waitForTimeout(250); }
      check(okHome && !errors.length, okHome ? (errors.length ? `vzhľad ${look.toUpperCase()}: chyby ${errors.slice(0, 2).join(' | ')}` : `vzhľad ${look.toUpperCase()}: domov a obrazovky bez chýb`) : `vzhľad ${look.toUpperCase()}: domovská obrazovka sa nezobrazila`);
      await ctx.close();
    }

    console.log('Záloha a obnova údajov');
    {
      const { ctx, page, errors } = await newPage(browser, base, 'sk');
      await page.goto(base + 'index.html');
      const DAY = 864e5;
      await page.evaluate((DAY) => {
        localStorage.setItem('kp.state', JSON.stringify({ wizardDone: true }));
        localStorage.setItem('kp.read', JSON.stringify({ povodne: 1 }));
        localStorage.setItem('kp.reader', JSON.stringify({ tags: ['kids'], src: 'manual' }));
        const p = JSON.parse(localStorage.getItem('kp.prefs')); p.backupFirstSeen = Date.now() - 10 * DAY; localStorage.setItem('kp.prefs', JSON.stringify(p));
      }, DAY);
      await page.reload(); await page.waitForSelector('#view *'); await page.waitForTimeout(400);
      check(await page.locator('[data-bk-off]').count() === 1, 'na Domove je pripomienka zálohy');
      await page.goto(base + 'index.html#/nastavenia/zaloha'); await page.waitForSelector('[data-export]');
      check((await page.locator('[data-backup-status]').innerText()).includes('nemáš'), 'Nastavenia: zatiaľ žiadna záloha');
      const [dl] = await Promise.all([page.waitForEvent('download'), page.click('[data-export]')]);
      const backup = JSON.parse(fs.readFileSync(await dl.path(), 'utf8'));
      check(backup.extra?.['kp.read']?.povodne === 1 && backup.extra['kp.reader'].tags[0] === 'kids', 'záloha obsahuje aj prečítané kapitoly a profil čitateľa');
      await page.waitForTimeout(400);
      check((await page.locator('[data-backup-status]').innerText()).startsWith('✓'), 'zobrazí sa dátum poslednej zálohy');
      await page.evaluate(() => { localStorage.removeItem('kp.read'); localStorage.removeItem('kp.reader'); });
      await page.setInputFiles('[data-import]', await dl.path());
      await page.waitForTimeout(800);
      const back = await page.evaluate(() => [localStorage.getItem('kp.read'), localStorage.getItem('kp.reader')]);
      check(back[0] && JSON.parse(back[0]).povodne === 1 && back[1], 'obnova zo zálohy vráti údaje');
      await page.goto(base + 'index.html#/'); await page.waitForSelector('#view *'); await page.waitForTimeout(400);
      check(await page.locator('[data-bk-off]').count() === 0, 'po zálohe pripomienka zmizne');
      check(!errors.length, errors.length ? `chyby: ${errors.slice(0, 3).join(' | ')}` : 'bez chýb v konzole');
      await ctx.close();
    }

    console.log('Offline trasa (bez internetu)');
    {
      const { ctx, page, errors } = await newPage(browser, base, 'sk');
      await page.goto(base + 'index.html#/trasy');
      await page.waitForFunction(() => window.__kpRoute);
      const r = await page.evaluate(async () => {
        const x = await window.__kpRoute.routeOffline('car', [{ lat: 48.1486, lon: 17.1077 }, { lat: 49.2231, lon: 18.7394 }], { alternatives: false });
        return Math.round(x[0].distance / 1000);
      }).catch((e) => 'chyba ' + e.message);
      check(typeof r === 'number' && r > 150 && r < 260, `Bratislava → Žilina autom: ${r} km`);
      check(!errors.length, errors.length ? `chyby: ${errors.slice(0, 3).join(' | ')}` : 'mapové dáta (aj rozdelené časti) sa načítali');
      await ctx.close();
    }

    console.log('Offline režim (service worker)');
    {
      const { ctx, page, errors } = await newPage(browser, base, 'sk', { serviceWorkers: 'allow' });
      await page.goto(base + 'index.html#/');
      const ready = await page.evaluate(() => Promise.race([
        navigator.serviceWorker.ready.then(() => true),
        new Promise((r) => setTimeout(() => r(false), 30000)),
      ]));
      check(ready, 'service worker je aktívny');
      await page.waitForTimeout(3000); // dokončenie ukladania súborov
      // druhé otvorenie už riadi service worker – nová verzia sa potom ponúkne pásom „Aktualizovať“
      await page.reload(); await page.waitForTimeout(1500);
      // aktualizácia: nová verzia service workera nesmie znova sťahovať nezmenené súbory
      const before = HITS.length;
      const swText = fs.readFileSync(path.join(DIST, 'sw.js'), 'utf8');
      const preN = JSON.parse(swText.match(/const PRECACHE = (\[.*?\]);/s)[1]).length;
      check(new Set(HITS).size >= preN, `prvá inštalácia uložila ${preN} súborov`);
      SW_EXTRA = '\n// test aktualizácie\n';
      const changed = await page.evaluate(() => new Promise((resolve) => {
        navigator.serviceWorker.addEventListener('controllerchange', () => resolve(true));
        navigator.serviceWorker.getRegistration().then((r) => r.update());
        setTimeout(() => resolve(false), 30000);
      }));
      const refetched = HITS.slice(before).filter((p) => p !== '/sw.js');
      check(changed && refetched.length === 0, changed ? `aktualizácia service workera: znova stiahnutých súborov ${refetched.length}${refetched.length ? ' (' + refetched.slice(0, 3).join(', ') + '…)' : ''}` : 'nová verzia service workera sa neaktivovala');
      SW_EXTRA = '';
      check(await page.locator('#update-banner [data-upd-apply]').isVisible(), 'po novej verzii sa ukáže pás „Aktualizovať“');
      await page.evaluate(() => { location.hash = '#/nastavenia'; }); await page.waitForTimeout(600);
      check((await page.locator('[data-upd-main]').innerText()).includes('Aktualizovať'), 'v Nastaveniach je tlačidlo „Aktualizovať“');
      await ctx.setOffline(true);
      await page.reload();
      await page.waitForSelector('#view *', { timeout: 10000 }).catch(() => {});
      check((await page.locator('#view').innerText().catch(() => '')).length > 20, 'domovská obrazovka bez internetu');
      await page.evaluate(() => { location.hash = '#/kniha/vypadok-elektriny'; });
      await page.waitForTimeout(800);
      check(await page.locator('.reader-content h1').count() > 0, 'kapitola knihy bez internetu');
      await page.evaluate(() => { location.hash = '#/teraz/blackout/1'; });
      await page.waitForTimeout(400);
      check((await page.locator('#view').innerText()).length > 50, 'Kríza teraz bez internetu');
      void errors;
      await ctx.close();
    }

    if (D.offline && !QUICK) {
      console.log('Offline balík (ZIP z častí)');
      const { ctx, page } = await newPage(browser, base, 'sk');
      await page.goto(base + 'index.html#/nastavenia');
      await page.waitForSelector('[data-zip]');
      const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 120000 }), page.click('[data-zip]')]);
      const file = await dl.path();
      const buf = fs.readFileSync(file);
      check(buf.length === D.offline.size, `veľkosť ZIP ${(buf.length / 1e6).toFixed(1)} MB`);
      const idx = JSON.parse(fs.readFileSync(path.join(DIST, 'downloads/offline/index.json'), 'utf8'));
      check(crypto.createHash('sha256').update(buf).digest('hex') === idx.sha256, 'kontrolný súčet ZIP sedí (časti sa spojili správne)');
      check(dl.suggestedFilename() === D.offline.name, `názov súboru ${dl.suggestedFilename()}`);
      await ctx.close();
    }
  } finally {
    await browser.close();
    srv.close();
  }
  console.log(failed ? `\n${failed} test(ov) zlyhalo` : '\nVšetky testy prešli');
  process.exit(failed ? 1 : 0);
}
main().catch((e) => { console.error(e); process.exit(1); });
