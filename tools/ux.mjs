// Série UX testov zostavenej aplikácie (dist): zrozumiteľnosť, ergonómia, grafická architektúra, rozloženie, ovládateľnosť.
// Použitie: node tools/ux.mjs [--quick] [--lang=sk] [--out=cesta.md]   (najprv npm run build:web)
//   --quick  len 3 konfigurácie zariadení namiesto 8
// Úrovne: FAIL = skutočná chyba (kód skončí s 1), WARN = odporúčanie na zlepšenie.
// Testy sa nelíšia od používateľa: berú obrazovky tak, ako ich uvidí človek (veľkosť, kontrast, klávesnica, dosah prsta).
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = process.env.KP_DIST ? path.resolve(process.env.KP_DIST) : path.join(ROOT, 'dist');
const argv = process.argv.slice(2);
const QUICK = argv.includes('--quick');
const LANG = (argv.find((a) => a.startsWith('--lang=')) || '--lang=sk').slice(7);
const ONLY = (argv.find((a) => a.startsWith('--routes=')) || '').slice(9).split(',').filter((x) => x !== '');
const OUT = (argv.find((a) => a.startsWith('--out=')) || '').slice(6) || path.join(ROOT, 'tools', '.tmp', 'ux-report.md');

function loadPlaywright() {
  for (const id of [process.env.PLAYWRIGHT_MODULE, 'playwright', '/opt/node-tools/node_modules/playwright'].filter(Boolean)) {
    try { return require(id); } catch { /* ďalší */ }
  }
  throw new Error('Chýba Playwright (npm install).');
}
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2' };
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

const ROUTES = ['', 'teraz', 'teraz/blackout/1', 'teraz/flood/vsetko', 'kniha', 'kniha/vypadok-elektriny', 'kniha/hladat/voda', 'mapa', 'trasy', 'plan', 'profil/2', 'zasoby', 'energia', 'batohy', 'rodina', 'karty', 'zoznamy', 'krajiny', 'kryty', 'tlac', 'pomoc', 'nastavenia', 'o-aplikacii', 'viac', 'uvod/0', 'instalacia', 'instalacia/navod/ios'];
const BARE = (r) => /^(uvod|instalacia)/.test(r);
const CONFIGS = [
  { id: 'telefón·1', w: 390, h: 844, look: 'a', size: '', mobile: true },
  { id: 'telefón·2', w: 390, h: 844, look: 'b', size: '', mobile: true },
  { id: 'telefón·1·XL', w: 390, h: 844, look: 'a', size: 'xl', mobile: true },
  { id: 'telefón·2·XL', w: 390, h: 844, look: 'b', size: 'xl', mobile: true },
  { id: 'malý 320', w: 320, h: 568, look: 'a', size: '', mobile: true },
  { id: 'na šírku', w: 844, h: 390, look: 'a', size: '', mobile: true },
  { id: 'tablet', w: 768, h: 1024, look: 'b', size: '', mobile: false },
  { id: 'počítač', w: 1280, h: 800, look: 'a', size: '', mobile: false },
];
const USE = QUICK ? [CONFIGS[0], CONFIGS[3], CONFIGS[7]] : CONFIGS;

// ---------- zber výsledkov ----------
const findings = new Map(); // kľúč → { level, suite, id, msg, where:Set }
function add(level, suite, id, msg, where) {
  if (ACCEPTED.some((re) => re.test(msg))) { level = 'OK'; }
  const k = `${id}|${msg}`;
  if (!findings.has(k)) findings.set(k, { level, suite, id, msg, where: new Set() });
  findings.get(k).where.add(where);
}
let checks = 0;
// Výnimky, ktoré autor aplikácie vedome schválil (nie sú chyby): N11 – stlmený text a „+ Pridať cieľ“, N18 – tlačidlá priblíženia mapy.
const ACCEPTED = [/Pridať cieľ/, /Rozhodni sa/, /leaflet-control-zoom|leaflet-bar/, /a\.skip|Preskočiť na obsah/];

// ---------- audit jednej obrazovky v prehliadači ----------
function auditInPage(opts) {
  const vw = window.innerWidth, vh = window.innerHeight;
  const out = { vw, vh };
  const view = document.querySelector('#view') || document.body;
  const inClosed = (e) => { for (let p = e; p && p !== document.body; p = p.parentElement) { const d = p.parentElement; if (d && d.tagName === 'DETAILS' && !d.open && p.tagName !== 'SUMMARY') return true; } return false; };
  const vis = (e) => { if (inClosed(e)) return false; const r = e.getBoundingClientRect(); if (r.width < 1 || r.height < 1) return false; const cs = getComputedStyle(e); return cs.visibility !== 'hidden' && cs.display !== 'none' && Number(cs.opacity) > 0.05; };
  const sel = (e) => e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + (typeof e.className === 'string' && e.className.trim() ? '.' + e.className.trim().split(/\s+/).slice(0, 2).join('.') : '');
  const chrome = (e) => !!e.closest('.app-tabs, .app-header, .tour-tip, #look-pop, #toast, .update-banner, .back-pill, .leaflet-container, .leaflet-control-attribution');
  const inFixed = (e) => { for (let p = e; p && p !== document.body; p = p.parentElement) { const ps = getComputedStyle(p).position; if (ps === 'fixed' || ps === 'sticky') return true; } return false; };
  const inScroller = (e) => { for (let p = e.parentElement; p && p !== document.body; p = p.parentElement) { const o = getComputedStyle(p).overflowX; if (o === 'auto' || o === 'scroll' || o === 'hidden') return true; } return false; };

  // Rozloženie: bočné posúvanie a prvky mimo okna
  out.overflowX = document.documentElement.scrollWidth > vw + 1;
  out.scrollW = document.documentElement.scrollWidth;
  out.clipped = [];
  for (const e of view.querySelectorAll('*')) {
    if (!vis(e) || inScroller(e)) continue;
    const r = e.getBoundingClientRect();
    if (r.right > vw + 2 && getComputedStyle(e).position !== 'fixed' && out.clipped.length < 6) out.clipped.push(`${sel(e)} (${Math.round(r.right)} > ${vw})`);
  }
  // text orezaný bez možnosti prečítať (overflow hidden + scrollWidth > clientWidth)
  out.truncated = [];
  for (const e of view.querySelectorAll('h1,h2,h3,p,li,a,button,span,label,td,th')) {
    if (!vis(e) || e.closest('.visually-hidden') || e.classList.contains('visually-hidden')) continue;
    const cs = getComputedStyle(e);
    if ((cs.overflow === 'hidden' || cs.overflowX === 'hidden') && cs.textOverflow !== 'ellipsis' && e.scrollWidth > e.clientWidth + 2 && e.textContent.trim().length > 2 && out.truncated.length < 6) out.truncated.push(`${sel(e)} „${e.textContent.trim().slice(0, 30)}“`);
  }

  // Ovládacie prvky
  const SEL = 'a[href], button, input:not([type=hidden]), select, textarea, [role=button], [role=checkbox], [tabindex="0"], summary';
  const targets = [...document.querySelectorAll(SEL)].filter((e) => vis(e) && !e.closest('.leaflet-control-attribution'));
  const nameOf = (e) => (e.getAttribute('aria-label') || e.getAttribute('aria-labelledby') && [...e.getAttribute('aria-labelledby').split(' ')].map((i) => document.getElementById(i)?.textContent || '').join(' ') || e.innerText || e.value || e.getAttribute('title') || e.querySelector('img[alt]')?.alt || '').replace(/\s+/g, ' ').trim();
  out.targets = targets.map((e) => {
    const r = e.getBoundingClientRect();
    // odkaz v pláne vety (inline) sa posudzuje miernejšie
    const inline = e.tagName === 'A' && getComputedStyle(e).display === 'inline' && !!e.closest('p, li, td, small, .muted');
    return { sel: sel(e), w: Math.round(r.width), h: Math.round(r.height), inline, name: nameOf(e), href: e.getAttribute('href') || '', tag: e.tagName, type: e.type || '', left: r.left, top: r.top, right: r.right, bottom: r.bottom, el: 0 };
  });
  // prekrývanie ovládacích prvkov (nie vnorených)
  out.overlaps = [];
  for (let i = 0; i < targets.length && out.overlaps.length < 6; i++) for (let j = i + 1; j < targets.length; j++) {
    const a = targets[i], b = targets[j];
    if (a.contains(b) || b.contains(a) || chrome(a) || chrome(b) || inFixed(a) !== inFixed(b) || getComputedStyle(a).display === 'inline' || getComputedStyle(b).display === 'inline') continue; // odkazy v texte sa lámu na viac riadkov
    const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
    const w = Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left), h = Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top);
    if (w > 4 && h > 4 && w * h > 0.2 * Math.min(ra.width * ra.height, rb.width * rb.height)) { out.overlaps.push(`${sel(a)} „${nameOf(a).slice(0, 14)}“ [${Math.round(ra.left)},${Math.round(ra.top)} ${Math.round(ra.width)}×${Math.round(ra.height)}] × ${sel(b)} „${nameOf(b).slice(0, 14)}“ [${Math.round(rb.left)},${Math.round(rb.top)} ${Math.round(rb.width)}×${Math.round(rb.height)}]`); if (out.overlaps.length >= 6) break; }
  }
  // popisky: pole bez názvu a ovládač len s ikonou bez názvu
  out.noLabel = [];
  for (const e of targets) {
    const isField = ['INPUT', 'SELECT', 'TEXTAREA'].includes(e.tagName) && !['button', 'submit', 'hidden'].includes(e.type);
    const named = !!nameOf(e) || !!(e.labels && e.labels.length && [...e.labels].some((l) => l.textContent.trim()));
    if (!named && out.noLabel.length < 8) out.noLabel.push(`${isField ? 'pole' : 'ovládač'} ${sel(e)}${e.getAttribute('href') ? ' → ' + e.getAttribute('href') : ''}${e.closest('[data-bind]') ? '' : ''} v ${sel(e.parentElement)}`);
  }
  // rovnaký názov, rôzny cieľ
  const byName = new Map();
  for (const e of targets) if (e.tagName === 'A' && e.getAttribute('href')?.startsWith('#/')) { const n = nameOf(e).toLowerCase(); if (n.length > 1) { if (!byName.has(n)) byName.set(n, new Set()); byName.get(n).add(e.getAttribute('href')); } }
  out.dupLabels = [...byName].filter(([, h]) => h.size > 1).map(([n, h]) => `„${n.slice(0, 30)}“ → ${[...h].slice(0, 3).join(', ')}`).slice(0, 5);
  out.vagueLinks = targets.filter((e) => e.tagName === 'A' && !chrome(e) && !e.closest('.app-nav') && /^(tu|viac|kliknite tu|click here|here|more|link)$/i.test(nameOf(e))).map(sel).slice(0, 4);

  // Text: veľkosť a kontrast
  const parse = (c) => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p[3] === undefined ? 1 : p[3] }; };
  const over = (f, b) => ({ r: f.r * f.a + b.r * (1 - f.a), g: f.g * f.a + b.g * (1 - f.a), b: f.b * f.a + b.b * (1 - f.a), a: 1 });
  const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
  const bgOf = (e) => {
    let stack = [];
    for (let p = e; p; p = p.parentElement) {
      const cs = getComputedStyle(p);
      if (cs.backgroundImage !== 'none') return null; // prechod/obrázok: kontrast nezistíme spoľahlivo
      const c = parse(cs.backgroundColor);
      if (c && c.a > 0) { stack.push(c); if (c.a >= 1) break; }
    }
    let base = { r: 255, g: 255, b: 255, a: 1 };
    for (let i = stack.length - 1; i >= 0; i--) base = over(stack[i], base);
    return base;
  };
  out.fonts = new Set(); out.sizes = new Map(); out.radii = new Set(); out.smallText = []; out.lowContrast = []; out.textN = 0;
  const walker = document.createTreeWalker(view, NodeFilter.SHOW_TEXT);
  const seen = new Set();
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const t = n.nodeValue.trim(); const e = n.parentElement;
    if (!t || !e || seen.has(e) || ['SCRIPT', 'STYLE'].includes(e.tagName) || !vis(e)) continue;
    seen.add(e);
    const cs = getComputedStyle(e); const fs = parseFloat(cs.fontSize);
    out.textN++;
    out.fonts.add(cs.fontFamily.split(',')[0].replace(/["']/g, '').trim());
    out.sizes.set(Math.round(fs), (out.sizes.get(Math.round(fs)) || 0) + 1);
    if (fs < 12 && out.smallText.length < 8) out.smallText.push(`${fs.toFixed(1)} px ${sel(e)} „${t.slice(0, 24)}“`);
    const fg = parse(cs.color); const bg = bgOf(e);
    if (fg && bg) {
      const f2 = over(fg, bg); const l1 = lum(f2), l2 = lum(bg);
      const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
      const large = fs >= 24 || (fs >= 18.66 && Number(cs.fontWeight) >= 700);
      if (ratio < (large ? 3 : 4.5) && out.lowContrast.length < 10) out.lowContrast.push({ r: Math.round(ratio * 100) / 100, t: `${sel(e)} „${t.slice(0, 24)}“`, large });
    }
  }
  out.fonts = [...out.fonts]; out.sizes = [...out.sizes];
  for (const e of view.querySelectorAll('.btn, .chip, .card, .box, input, select, .a-tab, .b-tile')) { if (vis(e)) out.radii.add(getComputedStyle(e).borderRadius.split(' ')[0]); }
  out.radii = [...out.radii];

  // Hlavičky
  const hs = [...document.querySelectorAll('h1,h2,h3,h4')].filter(vis).map((h) => ({ l: Number(h.tagName[1]), size: parseFloat(getComputedStyle(h).fontSize), top: h.getBoundingClientRect().top, t: h.textContent.trim().slice(0, 30) }));
  out.headings = hs; out.title = document.title;
  // Dosah a orientácia
  out.h112 = (() => { const a = document.querySelector('.hdr-112'); if (!a) return null; const r = a.getBoundingClientRect(); return vis(a) ? { w: Math.round(r.width), h: Math.round(r.height) } : null; })();
  out.currentNav = !!document.querySelector('.app-tabs [aria-current], .app-nav [aria-current]');
  out.tabs = (() => { const t = document.querySelector('.app-tabs'); if (!t || getComputedStyle(t).display === 'none') return null; const r = t.getBoundingClientRect(); return { top: r.top, bottom: r.bottom, left: r.left, width: r.width, height: r.height }; })();
  out.rail = out.tabs && out.tabs.width < vw / 2;
  // text pod pevným menu: po posune na koniec musí byť posledný obsah nad ním
  window.scrollTo(0, document.documentElement.scrollHeight);
  let maxBottom = 0, maxEl = null;
  for (const e of view.querySelectorAll('*')) { if (!vis(e) || inFixed(e) || chrome(e) || e.closest('[hidden], .toc-drawer, .visually-hidden')) continue; const r = e.getBoundingClientRect(); if (r.height > 0 && r.bottom > maxBottom && r.bottom < 100000) { maxBottom = r.bottom; maxEl = e; } }
  out.endGap = out.tabs && !out.rail ? Math.round(out.tabs.top - maxBottom) : null; out.endEl = maxEl ? sel(maxEl) : '';
  window.scrollTo(0, 0);
  // prvá obrazovka: nadpis a hlavná akcia bez posúvania
  out.h1Top = hs.find((h) => h.l === 1)?.top ?? null;
  out.primary = [...document.querySelectorAll('#view .btn:not(.btn-ghost), #view .a-urgent, #view .b-urgent')].filter(vis).map((e) => e.getBoundingClientRect().top)[0] ?? null;
  // čitateľnosť textu: dĺžka vety a riadku
  out.longSentences = []; out.longLines = [];
  for (const p of view.querySelectorAll('p, li')) {
    if (!vis(p) || p.closest('table, nav, .chips, button')) continue;
    const text = p.innerText.replace(/\s+/g, ' ').trim();
    if (text.length < 40) continue;
    for (const s of text.split(/(?<=[.!?])\s+/)) { const w = s.split(' ').length; if (w > 32 && out.longSentences.length < 6) out.longSentences.push(`${w} slov: „${s.slice(0, 50)}…“`); }
    const r = p.getBoundingClientRect(); const fsz = parseFloat(getComputedStyle(p).fontSize);
    const cpl = r.width / (fsz * 0.5);
    if (cpl > 95 && text.length > 150 && out.longLines.length < 3) out.longLines.push(`${Math.round(cpl)} znakov/riadok ${sel(p)}`);
  }
  // skratky bez vysvetlenia (iba informatívne)
  const txt = (view.textContent || '').replace(/\s+/g, ' ');
  out.abbr = [...new Set((txt.match(/\b[A-ZÁČĎÉÍĽŇÓŠŤÚÝŽ]{2,6}\b/g) || []).filter((a) => !['SK', 'CS', 'EN', 'PL', 'HU', 'EÚ', 'PDF', 'EPUB', 'USB', 'GPS', 'SOS', 'ZIP', 'WC', 'OK', 'ID'].includes(a)))].slice(0, 8);
  // zoznam odkazov pre hĺbku navigácie
  out.links = [...new Set(out.targets.filter((t) => t.href.startsWith('#/')).map((t) => t.href.replace(/^#\//, '').split('/')[0]))];
  return out;
}

// ---------- klávesnica ----------
async function keyboardAudit(page, route, cfg) {
  const where = `${cfg.id} · #/${route}`;
  await page.evaluate(() => { document.activeElement?.blur?.(); window.scrollTo(0, 0); });
  const seen = []; let stuck = 0; let backJumps = 0; let lastTop = -1; let noRing = [];
  for (let i = 0; i < 70; i++) {
    await page.keyboard.press('Tab');
    const info = await page.evaluate(() => {
      const e = document.activeElement; if (!e || e === document.body) return null;
      const snap = () => { const cs = getComputedStyle(e); return `${cs.outlineStyle}|${cs.outlineWidth}|${cs.outlineColor}|${cs.boxShadow}|${cs.borderColor}|${cs.backgroundColor}|${cs.color}|${cs.textDecorationLine}`; };
      const a = snap(); const cs = getComputedStyle(e);
      const outline = cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) >= 2;
      const shadow = cs.boxShadow !== 'none';
      e.blur(); const b = snap(); e.focus({ preventScroll: true });
      const r = e.getBoundingClientRect();
      e.__kpi = e.__kpi || (window.__kpn = (window.__kpn || 0) + 1);
      return { id: e.tagName + e.__kpi + '|' + (e.getAttribute('href') || e.getAttribute('data-bind') || ''), ring: outline || shadow || a !== b, top: r.top + window.scrollY, inView: r.bottom > 0 && r.top < window.innerHeight, label: (e.getAttribute('aria-label') || e.innerText || e.value || '').trim().slice(0, 20) };
    });
    if (!info) { await page.waitForTimeout(30); if (seen.length > 3) break; continue; }
    if (seen.length && seen[seen.length - 1] === info.id) { stuck++; if (stuck >= 3) { add('FAIL', 'ovládateľnosť', 'K1', 'klávesnica uviazne na jednom prvku (pasca fokusu)', where); break; } } else stuck = 0;
    if (seen.includes(info.id) && seen.indexOf(info.id) < seen.length - 1) break; // cyklus: koniec stránky
    seen.push(info.id);
    if (!info.ring) noRing.push(info.label || info.id);
    if (!info.inView) add('WARN', 'ovládateľnosť', 'K3', 'zaostrený prvok je mimo viditeľnej oblasti (stránka sa neposunula)', where);
    if (info.top + 40 < lastTop) backJumps++;
    lastTop = info.top;
  }
  checks++;
  if (seen.length < 3) add('WARN', 'ovládateľnosť', 'K0', `klávesnicou sa dá zaostriť len ${seen.length} prvkov`, where);
  if (noRing.length) add('FAIL', 'ovládateľnosť', 'K2', `fokus klávesnice nie je viditeľný (${[...new Set(noRing)].slice(0, 3).join(', ')})`, where);
  if (backJumps > 3) add('WARN', 'ovládateľnosť', 'K4', `poradie fokusu skáče späť hore (${backJumps}×) – nesedí s vizuálnym poradím`, where);
  return seen.length;
}

// ---------- vyhodnotenie jednej obrazovky ----------
function judge(a, route, cfg) {
  const where = `${cfg.id} · #/${route || ''}`;
  const bare = BARE(route);
  checks += 12;
  // ROZLOŽENIE
  if (a.overflowX) add('FAIL', 'rozloženie', 'L1', `stránka sa dá posúvať do strán (šírka obsahu ${a.scrollW} px)`, where);
  for (const c of a.clipped) add('FAIL', 'rozloženie', 'L2', `prvok presahuje pravý okraj okna: ${c}`, where);
  for (const t of a.truncated) add('WARN', 'rozloženie', 'L3', `text je orezaný bez „…“: ${t}`, where);
  if (a.endGap !== null && a.endGap < -1) add('FAIL', 'rozloženie', 'L4', `posledný obsah (${a.endEl}) zakrýva spodné menu o ${-a.endGap} px`, where);
  if (a.h1Top !== null && a.h1Top > a.vh * 0.6) add('WARN', 'rozloženie', 'L5', `hlavný nadpis je až na ${Math.round(a.h1Top)} px (pod 60 % výšky okna)`, where);
  if (a.primary !== null && a.primary > a.vh - 60 && ['', 'teraz', 'instalacia', 'uvod/0'].includes(route)) add('WARN', 'rozloženie', 'L6', `hlavná akcia je mimo prvej obrazovky (${Math.round(a.primary)} px z ${a.vh})`, where);
  // ERGONÓMIA
  for (const t of a.targets) {
    const min = Math.min(t.w, t.h);
    if (t.tag === 'INPUT' && ['checkbox', 'radio'].includes(t.type) && min < 24) { add('WARN', 'ergonómia', 'E1', `${t.type} ${t.sel} má ${t.w}×${t.h} px (bez rozšírenej plochy štítku)`, where); continue; }
    if (t.inline) { if (t.h < 14) add('WARN', 'ergonómia', 'E2', `odkaz v texte je nízky (${t.h} px): ${t.sel}`, where); continue; }
    if (min < 24) add('FAIL', 'ergonómia', 'E3', `ovládací prvok pod 24 px (${t.w}×${t.h}): ${t.sel} „${t.name.slice(0, 20)}“`, where);
    else if (cfg.mobile && min < 44) add('WARN', 'ergonómia', 'E4', `dotykový cieľ pod 44 px (${t.w}×${t.h}): ${t.sel} „${t.name.slice(0, 20)}“`, where);
  }
  for (const o of a.overlaps) add('FAIL', 'ergonómia', 'E5', `ovládacie prvky sa prekrývajú: ${o}`, where);
  if (!bare && cfg.mobile) {
    if (!a.h112) add('FAIL', 'ergonómia', 'E6', 'chýba viditeľné tlačidlo 112 v hlavičke', where);
    else if (Math.min(a.h112.w, a.h112.h) < 44) add('WARN', 'ergonómia', 'E7', `tlačidlo 112 má ${a.h112.w}×${a.h112.h} px`, where);
  }
  // GRAFICKÁ ARCHITEKTÚRA
  for (const s of a.smallText) add(parseFloat(s) < 11 ? 'FAIL' : 'WARN', 'grafika', 'G1', `malé písmo ${s}`, where);
  for (const c of a.lowContrast) add(c.r < 3 ? 'FAIL' : 'WARN', 'grafika', 'G2', `kontrast ${c.r}:1 (treba ${c.large ? 3 : 4.5}) – ${c.t}`, where);
  if (a.fonts.length > 3) add('WARN', 'grafika', 'G3', `${a.fonts.length} rodín písma na jednej obrazovke (${a.fonts.join(', ')})`, where);
  if (a.sizes.length > 11) add('WARN', 'grafika', 'G4', `${a.sizes.length} rôznych veľkostí písma na jednej obrazovke – nejednotná typografia`, where);
  if (a.radii.length > 5) add('WARN', 'grafika', 'G5', `${a.radii.length} rôznych zaoblení rohov (${a.radii.slice(0, 6).join(', ')})`, where);
  const hs = a.headings;
  const sizes = {}; for (const h of hs) (sizes[h.l] = sizes[h.l] || []).push(h.size);
  const avg = (x) => x.reduce((s, v) => s + v, 0) / x.length;
  if (sizes[1] && sizes[2] && avg(sizes[1]) < avg(sizes[2]) - 0.5) add('WARN', 'grafika', 'G6', 'nadpis 1. úrovne je menší než nadpis 2. úrovne – zlá vizuálna hierarchia', where);
  // ZROZUMITEĽNOSŤ
  const h1 = hs.filter((h) => h.l === 1).length;
  if (!bare && h1 === 0) add('FAIL', 'zrozumiteľnosť', 'Z1', 'obrazovka nemá hlavný nadpis (h1) – používateľ nevie, kde je', where);
  if (h1 > 1) add('WARN', 'zrozumiteľnosť', 'Z2', `${h1} hlavných nadpisov (h1) na jednej obrazovke`, where);
  for (let i = 1; i < hs.length; i++) if (hs[i].l - hs[i - 1].l > 1) { add('WARN', 'zrozumiteľnosť', 'Z3', `nadpisy preskakujú úroveň (h${hs[i - 1].l} → h${hs[i].l} „${hs[i].t}“)`, where); break; }
  for (const n of a.noLabel) add('FAIL', 'zrozumiteľnosť', 'Z4', `${n} nemá názov ani popisok (čítač obrazovky ani človek nevie, čo robí)`, where);
  for (const d of a.dupLabels) add('WARN', 'zrozumiteľnosť', 'Z5', `rovnaký text odkazu vedie na rôzne miesta: ${d}`, where);
  for (const v of a.vagueLinks) add('WARN', 'zrozumiteľnosť', 'Z6', `nejasný text odkazu: ${v}`, where);
  for (const s of a.longSentences) add('WARN', 'zrozumiteľnosť', 'Z7', `príliš dlhá veta (${s})`, where);
  for (const l of a.longLines) add('WARN', 'zrozumiteľnosť', 'Z8', `príliš dlhý riadok textu: ${l}`, where);
  if (a.abbr.length >= 3) add('WARN', 'zrozumiteľnosť', 'Z9', `skratky v texte bez vysvetlenia: ${a.abbr.join(', ')}`, where);
  if (!bare && !a.currentNav && route !== '' && !route.startsWith('kniha/')) add('WARN', 'zrozumiteľnosť', 'Z10', 'menu neukazuje, kde sa práve nachádzaš (chýba aria-current)', where);
}

// ---------- hlavný beh ----------
async function main() {
  if (!fs.existsSync(path.join(DIST, 'index.html'))) throw new Error('Najprv zostav aplikáciu: npm run build:web');
  const { chromium } = loadPlaywright();
  const browser = await chromium.launch();
  const srv = await serve();
  const base = `http://127.0.0.1:${srv.address().port}/`;
  const reach = new Map(); // route → odkazy
  const t0 = Date.now();
  try {
    for (const cfg of USE) {
      process.stdout.write(`\n${cfg.id} (${cfg.w}×${cfg.h})`);
      const ctx = await browser.newContext({ viewport: { width: cfg.w, height: cfg.h }, serviceWorkers: 'block', hasTouch: cfg.mobile, isMobile: cfg.mobile, deviceScaleFactor: cfg.mobile ? 2 : 1, reducedMotion: 'reduce' });
      await ctx.route((u) => !u.href.startsWith(base), (r) => r.abort());
      await ctx.addInitScript(([l, look, size]) => {
        localStorage.setItem('kp.prefs', JSON.stringify({ lang: l, look, size, onboarded: true, tourDone: true, installChoice: 'browser', installHintOff: true }));
        localStorage.setItem('kp.state', JSON.stringify({ wizardDone: true }));
        localStorage.setItem('kp.profile', JSON.stringify({ members: [{ id: 'a', name: 'Anna', age: 36, diet: {}, meds: [] }, { id: 'b', name: 'Jakub', age: 7, diet: {}, meds: [] }], pets: [], housing: { type: 'flat' }, location: { label: 'Košice', lat: 48.72, lon: 21.26 }, supplies: { targetDays: 7 } }));
      }, [LANG, cfg.look, cfg.size]);
      await ctx.addInitScript(() => window.addEventListener('beforeinstallprompt', (e) => e.stopImmediatePropagation(), true));
      const page = await ctx.newPage();
      const errors = [];
      page.on('pageerror', (e) => errors.push(String(e)));
      for (const route of ONLY.length ? ONLY.map((r) => r.replace(/^#?\/?/, '')) : ROUTES) {
        if (cfg.id === 'na šírku' && !['', 'teraz/blackout/1', 'instalacia', 'zasoby', 'kniha', 'profil/2'].includes(route)) continue;
        if ((cfg.id === 'malý 320' || cfg.size === 'xl') && ['kniha/hladat/voda', 'instalacia/navod/ios', 'uvod/0', 'tlac', 'o-aplikacii'].includes(route)) continue;
        await page.goto(base + 'index.html#/' + route);
        await page.waitForTimeout(route === 'mapa' || route === 'trasy' ? 1200 : 450);
        const a = await page.evaluate(auditInPage, {});
        judge(a, route, cfg);
        if (cfg.id === USE[0].id) reach.set(route.split('/')[0], a.links);
        process.stdout.write('.');
      }
      // klávesnica: len na vybraných obrazovkách a len v 2 konfiguráciách
      if (cfg.id === USE[0].id || cfg.id === 'počítač') {
        for (const route of ['', 'teraz', 'zasoby', 'nastavenia', 'profil/2', 'kniha']) {
          await page.goto(base + 'index.html#/' + route); await page.waitForTimeout(450);
          await keyboardAudit(page, route, cfg); process.stdout.write('k');
        }
      }
      if (errors.length) add('FAIL', 'ovládateľnosť', 'K9', `chyba v konzole: ${errors[0].slice(0, 80)}`, cfg.id);
      await ctx.close();
    }

    // hĺbka navigácie (počet ťuknutí z Domova)
    const first = new Set(['', 'teraz', 'kniha', 'mapa', 'viac', ...(reach.get('') || [])]);
    const depth = new Map([...first].map((r) => [r, 1]));
    for (let d = 1; d < 4; d++) for (const [r, dd] of [...depth]) if (dd === d) for (const l of reach.get(r) || []) if (!depth.has(l)) depth.set(l, d + 1);
    for (const r of ROUTES.map((x) => x.split('/')[0]).filter((x, i, a) => a.indexOf(x) === i && !BARE(x))) {
      const d = depth.get(r);
      if (!d) add('WARN', 'zrozumiteľnosť', 'Z11', `obrazovka #/${r} nie je dosiahnuteľná ťuknutím z Domova a menu`, 'navigácia');
      else if (d > 2 && !['o-aplikacii', 'tlac'].includes(r)) add('WARN', 'zrozumiteľnosť', 'Z12', `obrazovka #/${r} je až na ${d}. ťuknutie z Domova`, 'navigácia');
    }
    checks += 20;
    // krízové ovládanie: Kríza teraz a 112 sú jedným ťuknutím z každej obrazovky (bočné/spodné menu + hlavička)
    if (!(reach.get('') || []).includes('teraz')) add('FAIL', 'ergonómia', 'E8', 'z Domova nevedie priamy odkaz na „Kríza teraz“', 'navigácia');
  } finally {
    await browser.close(); srv.close();
  }
  report(Date.now() - t0);
}

function report(ms) {
  const order = ['rozloženie', 'ergonómia', 'grafika', 'zrozumiteľnosť', 'ovládateľnosť'];
  const list = [...findings.values()];
  const fails = list.filter((f) => f.level === 'FAIL'), warns = list.filter((f) => f.level === 'WARN'), okays = list.filter((f) => f.level === 'OK');
  const lines = [`# UX audit (${LANG}) – ${new Date().toISOString().slice(0, 16).replace('T', ' ')}`, '',
    `Konfigurácie: ${USE.map((c) => c.id).join(', ')}. Vyhodnotených kontrol: ${checks}. **FAIL ${fails.length}**, WARN ${warns.length}, schválené výnimky ${okays.length}.`, ''];
  console.log(`\n\nUX audit: ${checks} kontrol, ${fails.length} chýb (FAIL), ${warns.length} odporúčaní (WARN), ${(ms / 1000).toFixed(0)} s`);
  for (const suite of order) {
    const items = list.filter((f) => f.suite === suite && f.level !== 'OK').sort((a, b) => (a.level === b.level ? b.where.size - a.where.size : a.level === 'FAIL' ? -1 : 1));
    lines.push(`## ${suite[0].toUpperCase() + suite.slice(1)} – ${items.filter((i) => i.level === 'FAIL').length} FAIL, ${items.filter((i) => i.level === 'WARN').length} WARN`, '');
    console.log(`\n${suite.toUpperCase()}: ${items.filter((i) => i.level === 'FAIL').length} FAIL, ${items.filter((i) => i.level === 'WARN').length} WARN`);
    if (!items.length) { lines.push('Bez nálezov.', ''); console.log('  ✓ bez nálezov'); continue; }
    for (const f of items) {
      const where = [...f.where];
      const lim = f.level === 'FAIL' ? 12 : 3;
      const w = where.slice(0, lim).join('; ') + (where.length > lim ? ` … (+${where.length - lim})` : '');
      lines.push(`- **${f.level} ${f.id}** ${f.msg}  \n  _${where.length}× · ${w}_`);
      if (items.indexOf(f) < 12) console.log(`  ${f.level === 'FAIL' ? '✗' : '·'} ${f.id} ${f.msg} [${where.length}×]`);
    }
    if (items.length > 12) console.log(`  … ďalších ${items.length - 12} v správe`);
    lines.push('');
  }
  if (okays.length) { lines.push('## Schválené výnimky (nepočítajú sa)', '', ...okays.map((f) => `- ${f.id} ${f.msg}`), ''); console.log(`\nSchválené výnimky: ${okays.length}`); }
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, lines.join('\n'));
  console.log(`\nSpráva: ${OUT}`);
  process.exitCode = fails.length ? 1 : 0;
}

main().catch((e) => { console.error(e); process.exit(2); });
