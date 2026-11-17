// Kontrola prekladov PL a HU: koľko textov rozhrania a dát chýba.
// Použitie: node tools/i18n.mjs [--write]  (--write uloží chýbajúce texty do tools/.tmp/i18n-<jazyk>-*.json)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { I18N } from './i18n-setup.mjs';
import { S } from '../src/js/app/strings.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA = ['book', 'checklists', 'countries', 'crises', 'help', 'items', 'reader', 'scenarios', 'site', 'sources', 'ui'];
const seen = new Map(); // en → kontext
const walk = (x, ctx) => {
  if (!x || typeof x !== 'object') return;
  if (typeof x.en === 'string' && typeof x.sk === 'string') { if (!seen.has(x.en)) seen.set(x.en, { sk: x.sk, ctx }); return; }
  for (const [k, v] of Object.entries(x)) walk(v, ctx);
};
for (const f of DATA) {
  const mod = await import(`../src/data/${f}.js`);
  walk(mod, f);
}
// texty z buildu (tools/*.mjs): L('sk', 'cs', 'en') – jednoduchý rozbor zdrojového textu
const lit = String.raw`'((?:[^'\\]|\\.)*)'`;
const re = new RegExp(String.raw`\bL\(\s*${lit}\s*,\s*${lit}\s*,\s*${lit}\s*\)`, 'g');
for (const f of ['tools/build.mjs', 'tools/render.mjs']) {
  for (const m of fs.readFileSync(path.join(ROOT, f), 'utf8').matchAll(re)) {
    const en = m[3].replace(/\\'/g, "'");
    if (!seen.has(en)) seen.set(en, { sk: m[1].replace(/\\'/g, "'"), ctx: path.basename(f) });
  }
}
const write = process.argv.includes('--write');
for (const [lang, d] of Object.entries(I18N)) {
  const uiMissing = Object.keys(S).filter((k) => d.ui[k] == null);
  const dataMissing = [...seen.keys()].filter((en) => d.data[en] == null);
  const unused = Object.keys(d.data).filter((en) => !seen.has(en));
  // zástupné značky {n}, {name}… musia sedieť s angličtinou
  const vars = (x) => [...new Set(String(Array.isArray(x) ? x.join(' ') : x).match(/\{\w+\}/g) || [])].sort().join(' ');
  const bad = Object.entries(d.ui).filter(([k, v]) => S[k] && vars(v) !== vars(S[k][2])).map(([k]) => k);
  bad.push(...Object.entries(d.data).filter(([en, v]) => vars(v) !== vars(en)).map(([en]) => en.slice(0, 60)));
  if (bad.length) console.log(`${lang}: nesedia značky {…}: ${bad.join(', ')}`);
  const unknown = Object.keys(d.ui).filter((k) => !S[k]);
  if (unknown.length) console.log(`${lang}: neznáme kľúče: ${unknown.join(', ')}`);
  console.log(`${lang}: rozhranie ${Object.keys(S).length - uiMissing.length}/${Object.keys(S).length}, dáta ${seen.size - dataMissing.length}/${seen.size}${unused.length ? `, nepoužité ${unused.length}` : ''}`);
  if (unused.length && process.argv.includes('--unused')) console.log(unused.map((x) => '  - ' + x.slice(0, 100)).join('\n'));
  if (write) {
    fs.mkdirSync(path.join(ROOT, 'tools/.tmp'), { recursive: true });
    fs.writeFileSync(path.join(ROOT, `tools/.tmp/i18n-${lang}-ui.json`), JSON.stringify(Object.fromEntries(uiMissing.map((k) => [k, S[k][2]])), null, 1));
    const byCtx = {};
    for (const en of dataMissing) (byCtx[seen.get(en).ctx] ||= []).push(en);
    fs.writeFileSync(path.join(ROOT, `tools/.tmp/i18n-${lang}-data.json`), JSON.stringify(byCtx, null, 1));
  }
}
