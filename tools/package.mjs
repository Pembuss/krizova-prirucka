// Balík na stiahnutie všetkého naraz: web + aplikácia + offline mapa + kniha (PDF, EPUB) + prehľad úkrytov + zdrojový kód.
// Použitie: npm run build && npm run package  →  vystupy/Krizova-prirucka-<verzia>.zip a samostatné súbory vo vystupy/
//           node tools/package.mjs --web     →  offline balík pre web (bez zdrojového kódu) rozdelený na časti do 9 MB
//                                               v dist/downloads/offline/ (Netlify berie súbory najviac do 10 MB);
//                                               aplikácia ich v Nastaveniach stiahne a spojí do jedného ZIP
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { VERSION } from '../src/data/version.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const OUT = path.join(ROOT, 'vystupy');
const slug = VERSION.replace(/\s+/g, '-');            // „beta 2.0“ → „beta-2.0“
const NAME = `Krizova-prirucka-${slug}`;
const run = (cmd, args, opts = {}) => {
  const r = spawnSync(cmd, args, { encoding: 'utf8', ...opts });
  if (r.status !== 0) throw new Error(`${cmd} ${args.join(' ')}\n${r.stderr}`);
  return r.stdout;
};

if (!fs.existsSync(path.join(DIST, 'OTVOR-PRIRUCKU.html'))) throw new Error('Najprv spusti „npm run build“.');
fs.mkdirSync(OUT, { recursive: true });
const tmp = path.join(OUT, '.tmp');
fs.rmSync(tmp, { recursive: true, force: true });
const pkg = path.join(tmp, NAME);
const OFFLINE = path.join(DIST, 'downloads/offline');
fs.cpSync(DIST, pkg, { recursive: true, filter: (f) => !f.startsWith(OFFLINE) });

if (process.argv.includes('--web')) {
  const zip = path.join(tmp, `${NAME}.zip`);
  run('zip', ['-X', '-9', '-r', '-q', zip, NAME], { cwd: tmp });
  const buf = fs.readFileSync(zip);
  fs.rmSync(OFFLINE, { recursive: true, force: true });
  fs.mkdirSync(OFFLINE, { recursive: true });
  const PART = 9 * 1024 * 1024;
  const parts = [];
  for (let i = 0, n = 1; i < buf.length; i += PART, n++) {
    const file = `downloads/offline/part-${String(n).padStart(2, '0')}.bin`;
    const chunk = buf.subarray(i, i + PART);
    fs.writeFileSync(path.join(DIST, file), chunk);
    parts.push({ file, size: chunk.length });
  }
  const sha256 = crypto.createHash('sha256').update(buf).digest('hex');
  fs.writeFileSync(path.join(OFFLINE, 'index.json'), JSON.stringify({ name: `${NAME}.zip`, size: buf.length, sha256, parts }, null, 1));
  fs.rmSync(tmp, { recursive: true, force: true });
  run(process.execPath, [path.join(ROOT, 'tools/build.mjs'), '--refresh'], { cwd: ROOT, stdio: 'inherit' });
  console.log(`✓ offline balík ${NAME}.zip (${(buf.length / 1e6).toFixed(1)} MB) v ${parts.length} častiach v dist/downloads/offline/`);
  process.exit(0);
}

// zdrojový kód (posledný commit) – do balíka aj samostatne
const src = path.join(OUT, `krizova-prirucka-${slug}-zdrojovy-kod.zip`);
fs.rmSync(src, { force: true });
// mapové dáta (src/mapdata, ~85 MB) v archíve nie sú – rovnaké súbory sú v balíku v assets/map/
run('git', ['archive', '--format=zip', `--prefix=krizova-prirucka-${slug}/`, '-o', src, 'HEAD', '--', '.', ':(exclude)src/mapdata'], { cwd: ROOT });
fs.mkdirSync(path.join(pkg, 'zdrojovy-kod'), { recursive: true });
fs.copyFileSync(src, path.join(pkg, 'zdrojovy-kod', path.basename(src)));

const zip = path.join(OUT, `${NAME}.zip`);
fs.rmSync(zip, { force: true });
run('zip', ['-X', '-9', '-r', '-q', zip, NAME], { cwd: tmp });
fs.rmSync(tmp, { recursive: true, force: true });

// samostatné súbory (PDF, EPUB, prehľad úkrytov)
for (const f of fs.readdirSync(path.join(DIST, 'downloads'))) {
  if (/\.(pdf|epub)$/.test(f)) fs.copyFileSync(path.join(DIST, 'downloads', f), path.join(OUT, f));
}
const mb = (f) => (fs.statSync(f).size / 1e6).toFixed(1) + ' MB';
console.log(`✓ ${path.relative(ROOT, zip)} (${mb(zip)})`);
console.log(`✓ ${path.relative(ROOT, src)} (${mb(src)})`);
