// Balík na stiahnutie všetkého naraz: web + aplikácia + offline mapa + kniha (PDF, EPUB) + prehľad úkrytov + zdrojový kód.
// Použitie: npm run build && npm run package  →  vystupy/Krizova-prirucka-<verzia>.zip a samostatné súbory vo vystupy/
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
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
fs.cpSync(DIST, pkg, { recursive: true });

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
