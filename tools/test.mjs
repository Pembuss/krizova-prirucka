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
const DIST = path.join(ROOT, 'dist');
const QUICK = process.argv.includes('--quick');
const ROUTES = ['', 'teraz', 'teraz/blackout/1', 'teraz/flood/vsetko', 'kniha', 'kniha/vypadok-elektriny', 'kniha/hladat/voda', 'mapa', 'trasy', 'plan', 'profil', 'zasoby', 'energia', 'batohy', 'rodina', 'karty', 'zoznamy', 'krajiny', 'kryty', 'tlac', 'pomoc', 'nastavenia', 'o-aplikacii', 'viac', 'uvod/0'];

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
function serve() {
  const srv = http.createServer((req, res) => {
    let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (p.endsWith('/')) p += 'index.html';
    const f = path.join(DIST, p);
    if (!f.startsWith(DIST) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); res.end('not found'); return; }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    fs.createReadStream(f).pipe(res);
  });
  return new Promise((resolve) => srv.listen(0, '127.0.0.1', () => resolve(srv)));
}
function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]));
}

async function newPage(browser, base, lang, extra = {}) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block', acceptDownloads: true, ...extra });
  // iba lokálny server – externé mapové a vyhľadávacie služby sa v testoch nevolajú
  await ctx.route((u) => !u.href.startsWith(base), (r) => r.abort());
  await ctx.addInitScript((l) => { if (!localStorage.getItem('kp.prefs')) localStorage.setItem('kp.prefs', JSON.stringify({ lang: l, onboarded: true, tourDone: true })); }, lang);
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
