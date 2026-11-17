// Pomocník pre prekladateľa: číslovaný zoznam textov a zlúčenie prekladov do src/i18n/<jazyk>/data.js.
//   node tools/i18n-merge.mjs list <kontext> [od] [do]   – vypíše „číslo<TAB>anglický text“
//   node tools/i18n-merge.mjs merge <jazyk> <kontext> <súbor.tsv>  – súbor: „číslo<TAB>preklad“ na riadok
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SNAP = path.join(ROOT, 'tools/.tmp/i18n-source.json');
const [cmd, a, b, c] = process.argv.slice(2);

async function source() {
  if (fs.existsSync(SNAP)) return JSON.parse(fs.readFileSync(SNAP, 'utf8'));
  // zoznam textov podľa kontextu (rovnaký ako v tools/i18n.mjs)
  const seen = new Map();
  const walk = (x, ctx) => {
    if (!x || typeof x !== 'object') return;
    if (typeof x.en === 'string' && typeof x.sk === 'string') { if (!seen.has(x.en)) seen.set(x.en, ctx); return; }
    for (const v of Object.values(x)) walk(v, ctx);
  };
  for (const f of ['book', 'checklists', 'countries', 'crises', 'help', 'items', 'reader', 'scenarios', 'site', 'sources', 'ui']) walk(await import(`../src/data/${f}.js`), f);
  const lit = String.raw`'((?:[^'\\]|\\.)*)'`;
  const re = new RegExp(String.raw`\bL\(\s*${lit}\s*,\s*${lit}\s*,\s*${lit}\s*\)`, 'g');
  for (const f of ['tools/build.mjs', 'tools/render.mjs']) {
    for (const m of fs.readFileSync(path.join(ROOT, f), 'utf8').matchAll(re)) { const en = m[3].replace(/\\'/g, "'"); if (!seen.has(en)) seen.set(en, path.basename(f, '.mjs')); }
  }
  const out = {};
  for (const [en, ctx] of seen) (out[ctx] ||= []).push(en);
  fs.mkdirSync(path.dirname(SNAP), { recursive: true });
  fs.writeFileSync(SNAP, JSON.stringify(out, null, 1));
  return out;
}

const src = await source();
if (cmd === 'list') {
  const list = src[a] || [];
  const from = Number(b || 0), to = Number(c || list.length);
  for (let i = from; i < Math.min(to, list.length); i++) console.log(`${i}\t${list[i]}`);
} else if (cmd === 'merge') {
  const lang = a, ctx = b, file = c;
  const list = src[ctx];
  const dictFile = path.join(ROOT, 'src/i18n', lang, 'data.js');
  const dict = (await import(pathToFileURL(dictFile).href + '?t=' + Date.now())).default;
  let n = 0;
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    if (!line.trim()) continue;
    const m = line.match(/^(\d+)\t(.*)$/);
    if (!m) throw new Error('Zlý riadok: ' + line.slice(0, 80));
    const en = list[Number(m[1])];
    if (en == null) throw new Error('Neznáme číslo ' + m[1]);
    dict[en] = m[2];
    n++;
  }
  const body = Object.entries(dict).map(([k, v]) => `  ${JSON.stringify(k)}: ${JSON.stringify(v)},`).join('\n');
  fs.writeFileSync(dictFile, `// Texty z dát (krízy, zásoby, zoznamy, krajiny, scenáre…) – kľúč je anglický text zo src/data a tools/.\n// Nové preklady: node tools/i18n-merge.mjs list <kontext> a merge <jazyk> <kontext> <súbor.tsv>\nexport default {\n${body}\n};\n`);
  const missing = list.filter((en) => dict[en] == null).length;
  console.log(`${lang}/${ctx}: +${n}, chýba ešte ${missing} z ${list.length}`);
}
