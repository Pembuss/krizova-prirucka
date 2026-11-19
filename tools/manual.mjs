// Návod k aplikácii (PDF) v každom jazyku: text z content/navod/<jazyk>.md + snímky obrazoviek
// odfotené zo zostavenej aplikácie (dist) v danom jazyku. Volá ho tools/build.mjs po zostavení aplikácie.
// Snímka sa v texte vloží ako obrázok s adresou shot:<názov>, napr. ![Domov](shot:home-a)
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

// Obrazovky na odfotenie: názov → adresa v aplikácii a príprava
export const SHOTS = [
  ['install', '#/instalacia'],
  ['install-ios', '#/instalacia/navod/ios'],
  ['onb-lang', '#/uvod/0'],
  ['onb-look', '#/uvod/1'],
  ['onb-home', '#/uvod/2'],
  ['home-a', '#/'],
  ['tour', '#/', { tour: true }],
  ['home-b', '#/', { look: 'b' }],
  ['now-pick', '#/teraz'],
  ['now-step', '#/teraz/blackout/2'],
  ['now-list', '#/teraz/blackout/vsetko'],
  ['book-home', '#/kniha'],
  ['book-reader', '#/kniha/vypadok-elektriny', { scrollTo: '.choices' }],
  ['map', '#/mapa', { wait: 3500 }],
  ['more', '#/viac'],
  ['plan', '#/plan'],
  ['supplies', '#/zasoby'],
  ['print', '#/tlac'],
  ['settings', '#/nastavenia'],
  ['help', '#/pomoc'],
];
const VIEW = { width: 390, height: 780 };

async function setPrefs(page, patch) {
  await page.evaluate((p) => {
    const cur = JSON.parse(localStorage.getItem('kp.prefs') || '{}');
    localStorage.setItem('kp.prefs', JSON.stringify({ ...cur, ...p }));
  }, patch);
}
async function show(page, hash, wait = 700) {
  await page.evaluate((h) => { if (location.hash !== h) location.hash = h; }, hash);
  await page.waitForTimeout(wait);
}

// Odfotí obrazovky aplikácie v jazyku lang → <outDir>/<názov>.jpg
export async function shootScreens(browser, { dist, lang, outDir }) {
  fs.mkdirSync(outDir, { recursive: true });
  const ctx = await browser.newContext({ viewport: VIEW, deviceScaleFactor: 2, colorScheme: 'light', reducedMotion: 'reduce' });
  // obrazovka inštalácie sa má na snímkach správať ako na webe v telefóne s Androidom
  await ctx.addInitScript(() => { window.__KP_SHOT = 'android'; });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  const url = 'file://' + path.join(dist, 'index.html');
  // prvé spustenie: úvodná inštruktáž v zvolenom jazyku
  await page.goto(`${url}?lang=${lang}#/uvod/0`);
  await page.waitForTimeout(900);
  const shot = (name) => page.screenshot({ path: path.join(outDir, `${name}.jpg`), type: 'jpeg', quality: 78 });
  // inštalácia ešte pred úvodnou inštruktážou (ako pri prvom otvorení na webe)
  await show(page, '#/instalacia'); await shot('install');
  await show(page, '#/instalacia/navod/ios'); await shot('install-ios');
  await show(page, '#/uvod/0');
  await shot('onb-lang');
  await show(page, '#/uvod/1'); await shot('onb-look');
  await show(page, '#/uvod/2');
  await page.click('[data-inc="kids"]'); await page.click('[data-inc="kids"]');
  await shot('onb-home');
  await page.click('[data-save-home]'); await page.waitForTimeout(400);
  await page.click('[data-finish]:not([data-finish="tour"])'); await page.waitForTimeout(700);
  for (const [name, hash, o = {}] of SHOTS) {
    if (name.startsWith('onb-') || name.startsWith('install')) continue;
    if (o.look) { await setPrefs(page, { look: o.look }); await page.reload(); await page.waitForTimeout(800); }
    if (o.tour) {
      await show(page, '#/viac', 300);
      await page.evaluate(() => { sessionStorage.setItem('kp.tour', '1'); location.hash = '#/'; });
      await page.waitForTimeout(1200);
      await shot(name);
      await page.keyboard.press('Escape');
      await page.evaluate(() => sessionStorage.removeItem('kp.tour'));
      await page.waitForTimeout(300);
      continue;
    }
    await show(page, hash, o.wait || 800);
    if (o.scrollTo) {
      await page.evaluate((s) => { const n = document.querySelector(s); if (n) window.scrollTo(0, n.getBoundingClientRect().top + window.scrollY - 120); }, o.scrollTo);
      await page.waitForTimeout(300);
    } else await page.evaluate(() => window.scrollTo(0, 0));
    await shot(name);
    if (o.look) { await setPrefs(page, { look: 'a' }); await page.reload(); await page.waitForTimeout(800); }
  }
  await ctx.close();
  return errors;
}

// Markdown → HTML; shot:<názov> → snímka
function pandoc(md) {
  const r = spawnSync('pandoc', ['-f', 'markdown+fenced_divs+pipe_tables+implicit_figures', '-t', 'html5', '--wrap=none'], { input: md, encoding: 'utf8' });
  if (r.status !== 0) throw new Error(r.stderr);
  return r.stdout;
}
export const TOC_TITLE = { sk: 'Obsah', cs: 'Obsah', en: 'Contents', pl: 'Spis treści', hu: 'Tartalom' };
export function manualHtml({ md, lang, shotsRel, title, subtitle, version, date, logo, unverified, cssHref }) {
  let body = pandoc(md);
  body = body.replace(/src="shot:([\w-]+)"/g, (m, n) => `src="${shotsRel}/${n}.jpg"`);
  // obsah z nadpisov 2. úrovne, vložený pred prvú kapitolu
  const heads = [...body.matchAll(/<h2 id="([^"]+)">([\s\S]*?)<\/h2>/g)];
  const toc = `<nav class="m-toc"><h2>${TOC_TITLE[lang] || 'Contents'}</h2><ol>${heads.map(([, id, h]) => `<li><a href="#${id}">${h}</a></li>`).join('')}</ol></nav>`;
  const first = body.indexOf('<h2 id=');
  if (first >= 0) body = body.slice(0, first) + toc + body.slice(first);
  const missing = [...md.matchAll(/\(shot:([\w-]+)\)/g)].map((x) => x[1]).filter((n) => !SHOTS.some(([s]) => s === n));
  if (missing.length) throw new Error(`Návod ${lang}: neznáme snímky ${missing.join(', ')}`);
  return `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><title>${title}</title>
<link rel="stylesheet" href="${cssHref}"></head><body class="manual">
<header class="m-cover"><div class="m-logo">${logo}</div><div><p class="m-kicker">${subtitle}</p><h1 class="m-title">${title}</h1>
<p class="m-version">${version} · ${date}</p>${unverified ? `<p class="m-unverified">${unverified}</p>` : ''}</div></header>
<main class="m-body">${body}</main></body></html>`;
}
