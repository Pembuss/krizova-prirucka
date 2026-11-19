// Build: aplikácia (PWA) s knihou vo všetkých jazykoch, kniha v PDF a EPUB, prehľad úkrytov CO.
// Použitie: node tools/build.mjs [--no-pdf] [--no-epub] [--no-manual] [--manual-only] [--refresh] [--lang=sk]
import { I18N } from './i18n-setup.mjs'; // preklady PL a HU – musí byť načítané pred dátami
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { buildSync } from 'esbuild';
import { CHAPTERS, PARTS, PATHS, SITUATIONS, BOOK_TITLE, BOOK_SUBTITLE, chapterById } from '../src/data/book.js';
import { CRISES, ACTIONS, CRISIS_GROUPS } from '../src/data/crises.js';
import { CHECKLISTS } from '../src/data/checklists.js';
import { COUNTRIES } from '../src/data/countries.js';
import { UI, LANGS, t } from '../src/data/ui.js';
import { SITE } from '../src/data/site.js';
import { READER_TAGS, REC } from '../src/data/reader.js';
import { SCENARIOS } from '../src/data/scenarios.js';
import { NPP } from '../src/data/npp.js';
import { VERSION, VERSION_DATE } from '../src/data/version.js';
import { SHELTER_REGIONS, SHELTER_TOTAL, SHELTER_CITIES, SHELTER_SOURCE } from '../src/data/shelters-sk.js';

const L = (sk, cs, en) => ({ sk, cs, en });
import { expandPlaceholders, chapterLabel, esc, scenarioNumbers } from './render.mjs';
import { shootScreens, manualHtml } from './manual.mjs';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = process.env.KP_DIST ? path.resolve(process.env.KP_DIST) : path.join(ROOT, 'dist'); // KP_DIST: iný výstupný priečinok
const args = process.argv.slice(2);
const NO_PDF = args.includes('--no-pdf');
const NO_EPUB = args.includes('--no-epub');
const NO_MANUAL = args.includes('--no-manual');
const MANUAL_ONLY = args.includes('--manual-only'); // len návod k aplikácii nad hotovým dist (po úprave content/navod)
const REFRESH = args.includes('--refresh'); // len zoznam na stiahnutie a service worker (po tools/package.mjs --web)
const ONLY = (args.find((a) => a.startsWith('--lang=')) || '').split('=')[1];
const ALL_LANGS = LANGS.map((l) => l.id);
const BUILD_LANGS = ALL_LANGS.filter((l) => fs.existsSync(path.join(ROOT, 'content', l, 'rozcestnik.md')) && (!ONLY || l === ONLY));
const EDITION = '2026-10';

const read = (p) => fs.readFileSync(p, 'utf8');
const write = (p, s) => { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, s); };
const copyDir = (src, dst) => fs.cpSync(src, dst, { recursive: true });
const LOGO = read(path.join(ROOT, 'src/img/logo.svg')).trim();

// ---------- Kapitoly ----------
function pandoc(md) {
  const r = spawnSync('pandoc', ['-f', 'markdown+fenced_divs+pipe_tables+raw_attribute', '-t', 'html5', '--wrap=none'], { input: md, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  if (r.status !== 0) throw new Error(r.stderr);
  return r.stdout;
}
function renderChapters(lang) {
  const chs = CHAPTERS.map((ch) => {
    const file = path.join(ROOT, 'content', lang, `${ch.id}.md`);
    if (!fs.existsSync(file)) throw new Error(`Missing chapter ${lang}/${ch.id}.md`);
    const md = expandPlaceholders(read(file), lang);
    let html = pandoc(md);
    const label = chapterLabel(ch.id, lang);
    html = html.replace(/<h1 id="([^"]+)">([\s\S]*?)<\/h1>/, (m, id, title) => `<h1 id="${id}">${label ? `<span class="ch-label">${esc(label)}</span>` : ''}${title}</h1>`);
    html = html.replace(/<table>/g, '<div class="table-wrap"><table>').replace(/<\/table>/g, '</table></div>');
    return { ...ch, label, html, title: t(ch.title, lang) };
  });
  // Druhý krok: voľby a krížové odkazy potrebujú nadpisy zo všetkých kapitol.
  const refs = headingMap(chs);
  for (const c of chs) {
    c.html = inlineRefs(enhanceChoices(c.html, c.id, refs, lang), c.id, refs, lang);
    c.ids = [...c.html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
  }
  chs.refs = refs;
  return chs;
}

// ---------- Kniha-hra: voľby, krížové odkazy, profil čitateľa ----------
const stripTags = (h) => h.replace(/<span class="ch-label">[\s\S]*?<\/span>/g, '').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim();
// id → { ch, label, text, chapter } pre všetky nadpisy s id
function headingMap(chs) {
  const m = new Map();
  for (const c of chs) {
    m.set(c.id, { ch: c.id, label: c.label, text: c.title, chapter: true });
    for (const h of c.html.matchAll(/<h([1-4])[^>]*\sid="([^"]+)"[^>]*>([\s\S]*?)<\/h\1>/g)) {
      if (h[2] !== c.id) m.set(h[2], { ch: c.id, label: c.label, text: stripTags(h[3]), chapter: false });
    }
    for (const x of c.html.matchAll(/\sid="([^"]+)"/g)) if (!m.has(x[1])) m.set(x[1], { ch: c.id, label: c.label, text: c.title, chapter: true });
  }
  return m;
}
function shortLabel(label, lang) {
  if (!label) return '';
  if (lang === 'hu') return label.replace(t(UI.chapter, lang).toLowerCase(), t(UI.chShort, lang).toLowerCase()).replace(t(UI.appendix, lang).toLowerCase(), t(UI.appShort, lang).toLowerCase());
  return label.replace(t(UI.chapter, lang), t(UI.chShort, lang)).replace(t(UI.appendix, lang), t(UI.appShort, lang));
}
// Text odkazu: „Kap. 8 › Keď voda stúpa“, v tej istej kapitole len „› Keď voda stúpa“
function refText(id, fromCh, refs, lang) {
  const h = refs.get(id);
  if (!h) { warn(`Neznámy cieľ voľby #${id} (${fromCh})`); return ''; }
  const lab = shortLabel(h.label, lang);
  if (h.chapter) return h.ch === fromCh ? '' : `${lab ? lab + ' · ' : ''}${h.text}`;
  return h.ch === fromCh ? `› ${h.text}` : `${lab ? lab + ' › ' : ''}${h.text}`;
}
const tagDef = (id) => READER_TAGS.find((x) => x.id === id);
// Sekcie „Kam ďalej“ (…-dalej) sa zobrazia ako voľby: „Text: [Kapitola](#id)“ → voľba „Text“ s odkazom na kapitolu.
function dalejToChoices(html) {
  return html.replace(/(<h2 id="[a-z0-9-]*-dalej">[\s\S]*?<\/h2>\s*)<ul>([\s\S]*?)<\/ul>/g, (m, h, ul) => {
    const items = [...ul.matchAll(/<li>([\s\S]*?)<\/li>/g)].flatMap(([, li]) => {
      const links = [...li.matchAll(/<a href="#([^"]+)">([\s\S]*?)<\/a>/g)];
      if (!links.length) return [];
      if (links.length === 1) {
        const prefix = li.slice(0, li.indexOf('<a')).replace(/<[^>]+>/g, '').replace(/[\s:–-]+$/, '').trim();
        return [`<li><a href="#${links[0][1]}">${prefix || links[0][2]}</a></li>`];
      }
      return links.map((l) => `<li><a href="#${l[1]}">${l[2]}</a></li>`);
    });
    return `${h}<div class="choices"><ul>${items.join('')}</ul></div>`;
  });
}
function enhanceChoices(html, chId, refs, lang) {
  html = dalejToChoices(html);
  let n = 0;
  html = html.replace(/<div class="choices( next)?">([\s\S]*?)<\/div>/g, (m, next, inner) => {
    n++;
    inner = inner.replace(/<a href="#([^"]+)"(?: class="([^"]*)")?>([\s\S]*?)<\/a>/g, (mm, id, cls = '', text) => {
      const tags = (cls.match(/if-[a-z]+/g) || []).map((x) => x.slice(3)).filter((x) => { if (!tagDef(x)) warn(`Neznáma značka if-${x} (${chId})`); return tagDef(x); });
      const icons = tags.map((x) => tagDef(x).icon).join('');
      const who = tags.map((x) => t(tagDef(x).short, lang)).join(', ');
      // keď text voľby už obsahuje názov cieľa, stačí číslo kapitoly
      const norm = (x) => x.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
      const tgt = refs.get(id);
      const ref = tgt && norm(stripTags(text)).includes(norm(tgt.text)) ? (tgt.ch === chId ? '' : shortLabel(tgt.label, lang)) : refText(id, chId, refs, lang);
      return `<a href="#${id}"${tags.length ? ` data-if="${tags.join(' ')}"` : ''}><span class="ch-t">${text}</span>${icons ? `<span class="for" title="${esc(who)}">${icons}</span>` : ''}<span class="xr">${esc(ref)}<span class="ch-page" data-id="${id}"></span></span></a>`;
    });
    return `<nav class="choices${next || ''}" id="volba-${chId}-${n}" aria-label="${esc(t(UI.choose, lang))}"><p class="choices-label">🎲 ${esc(t(UI.choose, lang))}</p>${inner}</nav>`;
  });
  // Krížové odkazy bez textu (tipy v scenároch) dostanú názov cieľa
  return html.replace(/<a class="xref" href="#([^"]+)"><\/a>/g, (m, id) => `<a class="xref" href="#${id}">→ ${esc(refText(id, chId, refs, lang) || t(chapterById(refs.get(id)?.ch || chId)?.title, lang))}<span class="ch-page" data-id="${id}"></span></a>`);
}
// Odkazy v texte dostanú pre tlač a EPUB kapitolu a stranu: „(→ kap. 9, str. 45)“. Na obrazovke sú skryté.
// Voľby (nav.choices) a krížové odkazy (a.xref) majú vlastný popis, preto sa vynechajú.
function inlineRefs(html, chId, refs, lang) {
  return html.split(/(<nav class="choices[\s\S]*?<\/nav>)/).map((part, i) => (i % 2 ? part
    : part.replace(/<a href="#([^"]+)">([\s\S]*?)<\/a>/g, (m, id) => m + prefSpan(id, chId, refs, lang)))).join('');
}
function prefSpan(id, chId, refs, lang) {
  const h = refs.get(id);
  if (!h) return '';
  if (h.ch === chId) return `<span class="pref same"> (→ <span class="pg" data-id="${id}"></span>)</span>`;
  const lab = h.label ? shortLabel(h.label, lang).replace(/^\p{Lu}/u, (c) => c.toLowerCase()) : t(chapterById(h.ch)?.title, lang);
  return `<span class="pref"> (→ ${esc(lab)}<span class="pg" data-id="${id}" data-sep=", "></span>)</span>`;
}
// Doplní čísla strán (tlačené vydanie) do volieb, krížových odkazov a odkazov v texte.
const PAGE_FILL = (map, pg) => {
  document.querySelectorAll('.ch-page').forEach((el) => { const n = map[el.dataset.id]; el.textContent = n ? ` · ${pg} ${n}` : ''; });
  document.querySelectorAll('.pref .pg').forEach((el) => {
    const n = map[el.dataset.id];
    el.textContent = n ? `${el.dataset.sep || ''}${pg} ${n}` : '';
    el.parentElement.classList.toggle('filled', !!n);
  });
};
function fillPagesHtml(html, map, pg) {
  return html
    .replace(/<span class="ch-page" data-id="([^"]+)"><\/span>/g, (m, id) => (map[id] ? `<span class="ch-page"> · ${pg} ${map[id]}</span>` : ''))
    .replace(/<span class="pref( same)?">([\s\S]*?)<span class="pg" data-id="([^"]+)"( data-sep="([^"]*)")?><\/span>\)<\/span>/g, (m, same, pre, id, x, sep = '') => {
      if (!map[id]) return same ? '' : `<span class="pref">${pre})</span>`;
      return `<span class="pref">${pre}${sep}${pg} ${map[id]})</span>`;
    });
}
// Údaje pre interaktivitu knihy na webe (profil čitateľa, odporúčania, scenáre)
function bookData(lang, chs) {
  const refs = chs.refs;
  const section = (id) => { const h = refs.get(id); return h ? { ch: h.ch, label: shortLabel(h.label, lang), text: h.text } : null; };
  const recIds = [...new Set(Object.values(REC).flat())];
  return {
    order: chs.map((c) => c.id),
    titles: Object.fromEntries(chs.map((c) => [c.id, `${c.label ? shortLabel(c.label, lang) + ' · ' : ''}${c.title}`])),
    sections: Object.fromEntries(recIds.map((id) => [id, section(id)]).filter(([, v]) => v)),
    tags: READER_TAGS.map((x) => ({ id: x.id, icon: x.icon, name: t(x.name, lang) })),
    rec: REC,
    npp: NPP.map((x) => [x.lat, x.lon]),
    paths: PATHS,
    crisisOf: Object.fromEntries(CRISES.map((c) => [c.chapter, c.id])),
    scen: Object.fromEntries(SCENARIOS.map((s) => [s.crisis, { id: s.id, title: `${s.icon} ${t(s.title, lang)}` }])),
    s: BOOK_STRINGS[lang],
  };
}
// Texty pre skript knihy (profil, odporúčania, prehrávač scenárov)
const BOOK_STRINGS = Object.fromEntries(ALL_LANGS.map((lang) => [lang, Object.fromEntries(Object.entries({
  readingAs: L('Kniha je prispôsobená pre domácnosť', 'Kniha je přizpůsobená pro domácnost', 'The book is tailored to a household'),
  personalise: L('Prispôsob knihu svojej domácnosti', 'Přizpůsob knihu své domácnosti', 'Tailor the book to your household'),
  personaliseHint: L('Označ, čo platí pre teba. Kniha potom zvýrazní voľby „pre teba“ a odporučí ďalšie kapitoly. Údaje zostávajú len v tvojom prehliadači.', 'Označ, co platí pro tebe. Kniha pak zvýrazní volby „pro tebe“ a doporučí další kapitoly. Údaje zůstávají jen v tvém prohlížeči.', 'Tick what applies to you. The book will then highlight choices "for you" and recommend further chapters. Nothing leaves your browser.'),
  fromApp: L('Prevziať z profilu v aplikácii', 'Převzít z profilu v aplikaci', 'Use my app profile'),
  edit: L('Upraviť', 'Upravit', 'Edit'),
  done: L('Hotovo', 'Hotovo', 'Done'),
  none: L('nič nevybrané', 'nic nevybráno', 'nothing selected'),
  forYou: UI.forYou,
  recTitle: L('Ďalej odporúčame pre teba', 'Dále doporučujeme pro tebe', 'Recommended for you next'),
  recWhy: L('lebo', 'protože', 'because'),
  nextInBook: L('Ďalšia kapitola v poradí', 'Další kapitola v pořadí', 'Next chapter in order'),
  back: L('Späť na voľbu', 'Zpět na volbu', 'Back to your choice'),
  read: L('Prečítané', 'Přečteno', 'Read'),
  of: L('z', 'z', 'of'),
  resetRead: L('Vymazať označenie prečítaných', 'Smazat označení přečtených', 'Clear reading progress'),
  play: L('▶ Hrať príbeh', '▶ Hrát příběh', '▶ Play the story'),
  replay: L('↺ Hrať znova', '↺ Hrát znovu', '↺ Play again'),
  cont: UI.cont,
  good: UI.good,
  bad: UI.bad,
  step: L('Krok', 'Krok', 'Step'),
  resultTitle: L('Tvoj výsledok', 'Tvůj výsledek', 'Your result'),
  result: L('Dobré rozhodnutia: {g} z {n}', 'Dobrá rozhodnutí: {g} z {n}', 'Good decisions: {g} of {n}'),
  resGreat: L('Výborne! Si pripravený a rozhoduješ sa správne.', 'Výborně! Jsi připravený a rozhoduješ se správně.', 'Excellent! You are prepared and make the right calls.'),
  resOk: L('Dobre, ale niektoré rozhodnutia boli riskantné. Pozri si tipy nižšie.', 'Dobře, ale některá rozhodnutí byla riskantní. Podívej se na tipy níže.', 'Good, but some decisions were risky. See the tips below.'),
  resBad: L('V skutočnej kríze by to bolo nebezpečné. Prečítaj si odporúčané kapitoly a skús to znova.', 'Ve skutečné krizi by to bylo nebezpečné. Přečti si doporučené kapitoly a zkus to znovu.', 'In a real crisis this would be dangerous. Read the recommended chapters and try again.'),
  learn: L('Čo si zopakovať', 'Co si zopakovat', 'What to review'),
  prepare: UI.gbPrepare,
  played: L('Dohrané', 'Dohráno', 'Completed'),
  paper: UI.gbPaper,
  hidePaper: L('Skryť verziu na papier', 'Skrýt verzi na papír', 'Hide paper version'),
  other: L('Ďalšie príbehy', 'Další příběhy', 'More stories'),
}).map(([k, v]) => [k, t(v, lang)]))]));
// Preklady musia mať rovnaké zástupné značky ako slovenčina (odkazy kontroluje appLinks).
function checkConsistency(lang) {
  if (lang === 'sk') return;
  const ph = (s) => [...s.matchAll(/\{\{[^}]+\}\}/g)].map((m) => m[0]).join(' ');
  for (const ch of CHAPTERS) {
    const skFile = path.join(ROOT, 'content', 'sk', `${ch.id}.md`);
    if (fs.existsSync(skFile) && ph(read(path.join(ROOT, 'content', lang, `${ch.id}.md`))) !== ph(read(skFile))) warn(`${lang}/${ch.id}: zástupné značky {{…}} sa líšia od slovenskej verzie`);
  }
}
function linkMap(chs) {
  const map = new Map();
  for (const c of chs) for (const id of c.ids) if (!map.has(id)) map.set(id, c.id);
  return map;
}
// Odkazy #kotva → adresa v aplikácii #/kniha/<kapitola>/<kotva> (kotva v tej istej kapitole má prednosť).
const appHref = (ch, id) => `#/kniha/${ch}${id === ch ? '' : '/' + id}`;
function appLinks(html, map, c) {
  const own = new Set(c.ids);
  return html.replace(/href="#([^"/][^"]*)"/g, (m, id) => {
    const ch = own.has(id) ? c.id : map.get(id);
    if (!ch) { warn(`Neznámy odkaz #${id} (${c.id})`); return m; }
    return `href="${appHref(ch, id)}"`;
  });
}
// reťazec do JS súboru (dáta sa načítavajú cez <script>, aby fungovali aj z disku)
const jsStr = (x) => JSON.stringify(x).replace(/<\/(script)/gi, '<\\/$1').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
const warnings = new Set();
const warn = (s) => warnings.add(s);

// ---------- Kniha v aplikácii (assets/book/<jazyk>/) ----------
// Scenáre pre prehrávač: texty v jazyku, čísla §, ciele tipov ako adresy v aplikácii
function scenarioData(lang, chs, map) {
  const num = scenarioNumbers();
  const href = (id) => { const ch = map.get(id); return ch ? appHref(ch, id) : ''; };
  return SCENARIOS.map((s) => ({
    id: s.id, icon: s.icon, title: t(s.title, lang), setting: t(s.setting, lang), chapter: s.crisis,
    prepare: s.prepare.map((x) => t(x, lang)),
    nodes: Object.fromEntries(s.nodes.map((n) => [n.id, {
      text: t(n.text, lang), v: n.verdict || '', end: !!n.end, num: num.get(`${s.id}/${n.id}`),
      tip: n.tip ? { text: t(n.tip.text, lang), href: href(n.tip.ref), ref: refText(n.tip.ref, 'scenare', chs.refs, lang) } : null,
      choices: (n.choices || []).map((c) => ({ to: c.to, text: c.text ? t(c.text, lang) : '' })),
    }])),
  }));
}
function buildAppBook(lang, chs) {
  const map = linkMap(chs);
  const dir = path.join(DIST, 'assets/book', lang);
  for (const c of chs) write(path.join(dir, `${c.id}.js`), `KP_BOOK_CHAPTER(${JSON.stringify(lang)},${JSON.stringify(c.id)},${jsStr(appLinks(c.html, map, c))});\n`);
  const idx = {
    title: t(BOOK_TITLE, lang), subtitle: t(BOOK_SUBTITLE, lang),
    parts: PARTS.map((p) => ({ id: p.id, name: t(p.name, lang) })),
    chapters: chs.map((c) => ({ id: c.id, part: c.part, label: c.label, short: shortLabel(c.label, lang), num: (c.label.match(/(?:^|\s)(\d+|[A-Z])(?:\.|$|\s)/) || [])[1] || '', title: c.title })),
    situations: SITUATIONS.map((x) => ({ id: x.id, icon: x.icon, name: t(x.name, lang), chapters: x.chapters })),
    D: bookData(lang, chs),
    scenarios: scenarioData(lang, chs, map),
  };
  write(path.join(dir, 'index.js'), `KP_BOOK_INDEX(${JSON.stringify(lang)},${jsStr(idx)});\n`);
}

// Preklady, ktoré ešte neskontroloval rodený hovoriaci (obálka PDF, EPUB)
const UNVERIFIED = {
  pl: 'Tłumaczenie nie zostało jeszcze sprawdzone przez rodzimego użytkownika języka. Ważne informacje sprawdzaj w oficjalnych źródłach.',
  hu: 'A fordítást anyanyelvi beszélő még nem ellenőrizte. A fontos adatokat hivatalos forrásban is ellenőrizd.',
};
// Upozornenie sa zobrazí, kým má jazyk v src/data/ui.js príznak unverified (jediný vypínač)
const unverifiedNote = (lang) => (LANGS.find((l) => l.id === lang)?.unverified ? UNVERIFIED[lang] || '' : '');
// Celá kniha na jednej stránke – podklad pre PDF a obálku EPUB (print/<jazyk>.html)
function fullBook(lang, chs) {
  const toc = PARTS.map((p) => {
    const items = chs.filter((c) => c.part === p.id).map((c) => `<li><a href="#${c.id}"><span>${c.label ? esc(c.label) + ' · ' : ''}${esc(c.title)}</span><span class="toc-page" data-id="${c.id}"></span></a></li>`).join('');
    return `<li class="toc-part">${esc(t(p.name, lang))}<ol>${items}</ol></li>`;
  }).join('');
  // Neviditeľné značky §§id§§ určia stranu každého cieľa odkazu; prvok so značkou dostane position: relative (data-pm),
  // aby značka ostala na strane, kde prvok začína (nie na začiatku kapitoly).
  const mark = (html) => html.replace(/<(h[1-4]|div|section|p|li|figure|aside)(\s[^>]*?\sid="([a-z0-9-]+)"[^>]*|\s+id="([a-z0-9-]+)"[^>]*)>/g, (m, tag, attrs, id1, id2) => `<${tag}${attrs} data-pm><span class="pdf-marker">§§${id1 || id2}§§</span>`);
  const chapters = chs.map((c) => `<section class="chapter" id="sec-${c.id}"><span class="pdf-marker">§§${c.id}§§</span>${mark(c.html)}</section>`).join('\n');
  return `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(t(BOOK_TITLE, lang))} (${esc(VERSION)})</title>
<link rel="stylesheet" href="../assets/css/site.css"><link rel="stylesheet" href="../assets/css/print.css"><link rel="stylesheet" href="../assets/css/book-print.css">
</head><body class="fullbook">
<section class="cover">
<div class="cover-logo">${LOGO}</div>
<p class="cover-kicker">${esc(t(L('Príručka pre domácnosti', 'Příručka pro domácnosti', 'A handbook for households'), lang))}</p>
<h1 class="cover-title">${esc(t(BOOK_TITLE, lang))}</h1>
<p class="cover-sub">${esc(t(BOOK_SUBTITLE, lang))}</p>
<ul class="cover-list">${CRISES.map((c) => `<li>${c.icon} ${esc(t(c.name, lang))}</li>`).join('')}</ul>
<p class="cover-version">${esc(t(UI.versionLabel, lang))} ${esc(VERSION)} · ${esc(VERSION_DATE)}</p>
${unverifiedNote(lang) ? `<p class="cover-unverified">${esc(unverifiedNote(lang))}</p>` : ''}
<p class="cover-foot">${esc(t(UI.dataNote, lang))} · ${esc(t(UI.disclaimer, lang))}<br><strong>112</strong> – ${esc(t(UI.emergency, lang))}</p>
</section>
<section class="toc-page-wrap"><h2 class="toc-heading">${esc(t(UI.contents, lang))}</h2><ol class="fulltoc">${toc}</ol></section>
${chapters}
</body></html>`;
}

// ---------- Samostatný prehľad: úkryty CO na Slovensku (iba slovensky) ----------
const fmtN = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '\u00a0');
const fmtP = (n) => String(n).replace('.', ',');
function shelterTables() {
  const nb = (x) => esc(x).replace(/(\d) (\d{3})/g, '$1\u00a0$2');
  const cell = (n, cap) => `<td class="num">${fmtN(n)}<br><small>${fmtN(cap)} miest</small></td>`;
  const row = (r, tag = 'td') => `<tr><${tag}>${esc(r[0])}</${tag}>${cell(r[2], r[3])}${cell(r[4], r[5])}${cell(r[6], r[7])}<td class="num">${fmtP(r[8])} %</td>${cell(r[9], r[10])}<td class="num">${r[11]} %</td></tr>`;
  const regions = `<div class="table-wrap"><table class="shelter-table"><thead><tr><th>Kraj</th><th>Odolné (OÚ)</th><th>Plynotesné (PÚ)</th><th>OÚ + PÚ spolu</th><th>% OÚ+PÚ</th><th>Jednoduché (JÚBS)</th><th>% JÚBS</th></tr></thead>
<tbody>${SHELTER_REGIONS.map((r) => row(r)).join('')}</tbody><tfoot>${row(SHELTER_TOTAL, 'th')}</tfoot></table></div>
<p class="small muted">Zdroj: <a href="${SHELTER_SOURCE.url}">${esc(SHELTER_SOURCE.label)}</a>. Počty zahŕňajú úkryty pre obyvateľstvo aj pre zamestnancov. Súčet krajov v stĺpci OÚ + PÚ je 1\u00a0476; súhrnný riadok MV SR uvádza 1\u00a0474 (rozdiel je v podklade za Prešovský kraj).</p>`;
  const cities = `<div class="table-wrap"><table class="shelter-table cities"><thead><tr><th>Kraj</th><th>Mesto / okres</th><th>Zverejnené údaje</th><th>V mape aplikácie</th></tr></thead><tbody>${SHELTER_CITIES.map(([kr, city, text, src, inMap]) => `<tr><td>${esc(kr)}</td><td><strong>${esc(city)}</strong></td><td>${nb(text)}<br><small><a href="${esc(src.url)}">${esc(src.label)}</a></small></td><td>${inMap ? '✔ áno' : '–'}</td></tr>`).join('')}</tbody></table></div>`;
  return { regions, cities };
}
function buildShelterOverview() {
  const md = read(path.join(ROOT, 'content/extra/kryty-slovensko.md'));
  const { regions, cities } = shelterTables();
  let html = pandoc(md.replace('{{shelterRegions}}', '```{=html}\n' + regions + '\n```').replace('{{shelterCities}}', '```{=html}\n' + cities + '\n```'));
  html = html.replace(/<table>/g, '<div class="table-wrap"><table>').replace(/<\/table>(?!<\/div>)/g, '</table></div>');
  const ver = `<p class="small muted">${esc(t(UI.versionLabel, 'sk'))} ${esc(VERSION)} · ${esc(VERSION_DATE)}</p>`;
  // do aplikácie (#/kryty)
  write(path.join(DIST, 'assets/extra/kryty-sk.js'), `window.KP_EXTRA=window.KP_EXTRA||{};window.KP_EXTRA['kryty-sk']=${jsStr(html + ver)};\n`);
  // tlačová stránka (podklad pre PDF)
  write(path.join(DIST, 'print/kryty-sk.html'), `<!doctype html><html lang="sk"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Úkryty CO na Slovensku – prehľad</title><link rel="stylesheet" href="../assets/css/site.css"><link rel="stylesheet" href="../assets/css/print.css"></head>
<body><main class="wrap narrow shelter-overview">${html}${ver}</main></body></html>`);
}
async function buildShelterPdf(browser) {
  const page = await browser.newPage();
  await page.goto('file://' + path.join(DIST, 'print', 'kryty-sk.html'), { waitUntil: 'load' });
  await page.emulateMedia({ media: 'print' });
  await page.evaluate(() => document.documentElement.classList.add('pdf-color'));
  const footer = `<div style="font-family:Inter,Arial,sans-serif;font-size:8px;width:100%;padding:0 15mm;display:flex;justify-content:space-between;color:#444"><span>Úkryty CO na Slovensku – prehľad · Krízová príručka ${esc(VERSION)} · 112</span><span><span class="pageNumber"></span> / <span class="totalPages"></span></span></div>`;
  const out = path.join(DIST, 'downloads', 'prehlad-krytov-slovensko.pdf');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  await page.pdf({ path: out, format: 'A4', printBackground: true, displayHeaderFooter: true, headerTemplate: '<div></div>', footerTemplate: footer, margin: { top: '14mm', bottom: '16mm', left: '0', right: '0' }, outline: true, tagged: true });
  await page.close();
  return out;
}
// ---------- Aplikácia (koreň webu), manifest, súbory na stiahnutie ----------
function buildRoot() {
  const appHtml = read(path.join(ROOT, 'src/app/index.html')).replace('{{LOGO}}', LOGO).replaceAll('{{VERSION}}', esc(VERSION)).replaceAll('{{ROOT}}', '');
  write(path.join(DIST, 'index.html'), appHtml);
  // Zrozumiteľný vstup pre verziu otváranú priamo z disku (rozbalený ZIP, USB kľúč).
  write(path.join(DIST, 'OTVOR-PRIRUCKU.html'), appHtml);
  fs.copyFileSync(path.join(ROOT, 'src/NAVOD.txt'), path.join(DIST, 'NAVOD.txt'));
  // staršie odkazy (beta 2.0) na app/index.html
  write(path.join(DIST, 'app/index.html'), `<!doctype html><html lang="sk"><head><meta charset="utf-8"><title>Krízová príručka</title>
<script>location.replace('../index.html' + location.search + location.hash);</script></head><body><a href="../index.html">Krízová príručka</a></body></html>`);
  const manifest = {
    name: 'Krízová príručka – Crisis Handbook', short_name: 'Krízová príručka', id: './', start_url: './index.html', scope: './', display: 'standalone',
    background_color: '#F4F7FA', theme_color: '#0B5C7A', lang: 'sk', dir: 'ltr', description: t(SITE.tagline, 'sk'), categories: ['utilities', 'education', 'books'],
    icons: [
      { src: 'assets/img/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: 'assets/img/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: 'assets/img/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    shortcuts: [
      { name: 'Kríza teraz', url: './index.html#/teraz' },
      { name: 'Príručka', url: './index.html#/kniha' },
      { name: 'Mapa a trasy', url: './index.html#/mapa' },
    ],
  };
  write(path.join(DIST, 'manifest.webmanifest'), JSON.stringify(manifest, null, 2));
}
// Zoznam súborov na stiahnutie pre aplikáciu (assets/downloads.js): veľkosť, počet strán PDF
function pdfPages(file) {
  const r = spawnSync('pdfinfo', [file], { encoding: 'utf8' });
  return Number((r.stdout || '').match(/Pages:\s+(\d+)/)?.[1]) || null;
}
function buildDownloads() {
  const f = (rel, extra = {}) => {
    const abs = path.join(DIST, rel);
    if (!fs.existsSync(abs)) return null;
    return { file: rel, size: fs.statSync(abs).size, ...(rel.endsWith('.pdf') ? { pages: pdfPages(abs) } : {}), ...extra };
  };
  const book = {}, manual = {};
  for (const l of ALL_LANGS) {
    const pdf = f(`downloads/krizova-prirucka-${l}.pdf`), epub = f(`downloads/krizova-prirucka-${l}.epub`);
    if (pdf || epub) book[l] = Object.fromEntries(Object.entries({ pdf, epub }).filter(([, v]) => v));
    const m = f(`downloads/navod-aplikacia-${l}.pdf`);
    if (m) manual[l] = m;
  }
  let offline = null;
  const offIdx = path.join(DIST, 'downloads/offline/index.json');
  if (fs.existsSync(offIdx)) offline = JSON.parse(read(offIdx));
  const data = { version: VERSION, book, manual, shelters: f('downloads/prehlad-krytov-slovensko.pdf'), offline };
  write(path.join(DIST, 'assets/downloads.js'), `window.KP_DOWNLOADS=${JSON.stringify(data)};\n`);
  return data;
}

// Návod k aplikácii (PDF): snímky obrazoviek zo zostavenej aplikácie + text z content/navod/<jazyk>.md
const MANUAL_TITLE = { sk: 'Návod k aplikácii', cs: 'Návod k aplikaci', en: 'App manual', pl: 'Instrukcja aplikacji', hu: 'Felhasználói útmutató' };
async function buildManual(browser, lang) {
  const src = path.join(ROOT, 'content/navod', `${lang}.md`);
  if (!fs.existsSync(src)) return null;
  const work = path.join(ROOT, 'tools/.tmp/manual', lang);
  fs.rmSync(work, { recursive: true, force: true });
  const errors = await shootScreens(browser, { dist: DIST, lang, outDir: path.join(work, 'shots') });
  for (const e of errors) warn(`Návod ${lang}: chyba v aplikácii pri snímkach: ${e}`);
  const html = manualHtml({
    md: read(src), lang, shotsRel: 'shots', title: MANUAL_TITLE[lang], subtitle: t(BOOK_TITLE, lang),
    version: `${t(UI.versionLabel, lang)} ${VERSION}`, date: VERSION_DATE, logo: LOGO, unverified: unverifiedNote(lang),
    cssHref: 'file://' + path.join(DIST, 'assets/css/manual.css'),
  });
  write(path.join(work, 'index.html'), html);
  const page = await browser.newPage();
  await page.goto('file://' + path.join(work, 'index.html'), { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  const footer = `<div style="font-family:Inter,Arial,sans-serif;font-size:8px;width:100%;padding:0 15mm;display:flex;justify-content:space-between;color:#444"><span>${esc(t(BOOK_TITLE, lang))} · ${esc(MANUAL_TITLE[lang])} · ${esc(VERSION)} · 112</span><span><span class="pageNumber"></span> / <span class="totalPages"></span></span></div>`;
  const out = path.join(DIST, 'downloads', `navod-aplikacia-${lang}.pdf`);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  await page.pdf({ path: out, format: 'A4', printBackground: true, displayHeaderFooter: true, headerTemplate: '<div></div>', footerTemplate: footer, margin: { top: '14mm', bottom: '16mm', left: '16mm', right: '16mm' }, outline: true, tagged: true });
  await page.close();
  return pdfPages(out);
}

// Snímky obrazoviek v manifeste – Chrome na Androide ich ukáže vo väčšom inštalačnom okne
function addManifestScreenshots() {
  const src = path.join(ROOT, 'tools/.tmp/manual/sk/shots');
  const file = path.join(DIST, 'manifest.webmanifest');
  if (!fs.existsSync(src) || !fs.existsSync(file)) return 0;
  const shots = [['home-a', 'Domov'], ['now-step', 'Kríza teraz – krok za krokom'], ['book-reader', 'Príručka – kniha-hra'], ['map', 'Offline mapa']];
  const out = [];
  for (const [n, label] of shots) {
    const f = path.join(src, `${n}.jpg`);
    if (!fs.existsSync(f)) continue;
    fs.mkdirSync(path.join(DIST, 'assets/img/screens'), { recursive: true });
    fs.copyFileSync(f, path.join(DIST, 'assets/img/screens', `${n}.jpg`));
    out.push({ src: `assets/img/screens/${n}.jpg`, sizes: '780x1560', type: 'image/jpeg', form_factor: 'narrow', label });
  }
  const m = JSON.parse(read(file));
  m.screenshots = out;
  write(file, JSON.stringify(m, null, 2));
  return out.length;
}

// Skripty zabalené do bežných (nie modulových) súborov – fungujú aj po otvorení z disku (file://).
function bundleScripts() {
  buildSync({
    entryPoints: { app: 'src/js/app/main.js' },
    absWorkingDir: ROOT, outdir: path.join(DIST, 'assets/js'), bundle: true, format: 'iife', target: 'es2020',
    define: { __BOOK_LANGS__: JSON.stringify(BUILD_LANGS) },
    minify: true, charset: 'utf8', legalComments: 'none', logLevel: 'warning',
  });
}

function copyAssets() {
  copyDir(path.join(ROOT, 'src/css'), path.join(DIST, 'assets/css'));
  // preklady rozhrania a dát (PL, HU) – aplikácia ich načíta len pri zvolenom jazyku
  for (const [lang, d] of Object.entries(I18N)) write(path.join(DIST, 'assets/i18n', `${lang}.js`), `window.KP_I18N=window.KP_I18N||{};window.KP_I18N[${JSON.stringify(lang)}]=${jsStr(d)};\n`);
  bundleScripts();
  fs.mkdirSync(path.join(DIST, 'assets/img'), { recursive: true });
  fs.copyFileSync(path.join(ROOT, 'src/img/logo.svg'), path.join(DIST, 'assets/img/logo.svg'));
  copyDir(path.join(ROOT, 'node_modules/leaflet/dist'), path.join(DIST, 'assets/vendor/leaflet'));
  // písma (OFL) podľa src/css/theme.css
  const fontDirs = ['inter', 'space-grotesk', 'atkinson-hyperlegible', 'source-serif-4', 'oxanium'].map((f) => path.join(ROOT, 'node_modules/@fontsource', f, 'files'));
  fs.mkdirSync(path.join(DIST, 'assets/fonts'), { recursive: true });
  for (const [, name] of read(path.join(ROOT, 'src/css/theme.css')).matchAll(/url\(\.\.\/fonts\/([^)]+)\)/g)) {
    const src = fontDirs.map((d) => path.join(d, name)).find((x) => fs.existsSync(x));
    if (src) fs.copyFileSync(src, path.join(DIST, 'assets/fonts', name)); else warn(`Chýba písmo ${name}`);
  }
  // offline mapa (vektorové dlaždice, popisy, vyhľadávanie, cestná sieť) – vytvára tools/mapdata/*.py
  const mapSrc = path.join(ROOT, 'src/mapdata');
  if (fs.existsSync(path.join(mapSrc, 'index.js'))) { copyDir(mapSrc, path.join(DIST, 'assets/map')); splitRoute(); }
  else warn('Chýbajú offline mapové dáta (src/mapdata) – mapa bude len online.');
  for (const f of ['leaflet-src.js', 'leaflet-src.js.map', 'leaflet.js.map', 'leaflet-src.esm.js', 'leaflet-src.esm.js.map']) fs.rmSync(path.join(DIST, 'assets/vendor/leaflet', f), { force: true });
}

// Netlify neprijme súbor väčší ako 10 MB: cestná sieť (route.js) sa rozdelí na hlavičku a časti
// route-1.js, route-2.js… Dlhé reťazce (nodes, edges, geom) sa delia na kúsky, router ich spojí.
const PART_MAX = 8.5e6;
function splitRoute() {
  const file = path.join(DIST, 'assets/map/route.js');
  if (!fs.existsSync(file) || fs.statSync(file).size <= PART_MAX) return;
  const txt = read(file);
  const d = JSON.parse(txt.slice(txt.indexOf('(') + 1, txt.lastIndexOf(')')));
  const head = {}, chunks = [];
  for (const [k, v] of Object.entries(d)) {
    if (typeof v === 'string' && v.length > 1e5) for (let i = 0; i < v.length; i += PART_MAX) chunks.push([k, v.slice(i, i + PART_MAX)]);
    else head[k] = v;
  }
  const parts = [];
  for (const [k, c] of chunks) {
    let p = parts[parts.length - 1];
    if (!p || p.size + c.length > PART_MAX) parts.push((p = { add: [], size: 0 }));
    p.add.push([k, c]); p.size += c.length;
  }
  head.parts = parts.length;
  write(file, `KPMAP_ROUTE(${JSON.stringify(head)});\n`);
  parts.forEach((p, i) => write(path.join(DIST, 'assets/map', `route-${i + 1}.js`), `KPMAP_ROUTE(${JSON.stringify({ part: i + 1, add: p.add })});\n`));
}
// Kontrola veľkosti súborov pre Netlify (najviac 10 MB na súbor)
function bigFiles(dir = DIST, max = 10 * 1024 * 1024) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const f = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...bigFiles(f, max));
    else if (fs.statSync(f).size > max) out.push(path.relative(DIST, f));
  }
  return out;
}

// ---------- Ikony, obálka, PDF, EPUB (Chromium) ----------
function loadPlaywright() {
  // Bežne z devDependencies; v predpripravenom prostredí z globálnej inštalácie.
  for (const id of ['playwright', process.env.PLAYWRIGHT_MODULE, '/opt/node-tools/node_modules/playwright'].filter(Boolean)) {
    try { return require(id); } catch { /* skús ďalší */ }
  }
  throw new Error('Chýba Playwright: spusti „npm install“ a „npx playwright install chromium“, alebo build s --no-pdf --no-epub.');
}
async function withBrowser(fn) {
  const { chromium } = loadPlaywright();
  const browser = await chromium.launch();
  try { return await fn(browser); } finally { await browser.close(); }
}
async function renderIcons(browser) {
  const page = await browser.newPage();
  const svg = LOGO.replace('<svg', '<svg width="100%" height="100%"');
  for (const [name, size, pad] of [['icon-192.png', 192, 0], ['icon-512.png', 512, 0], ['icon-180.png', 180, 0], ['icon-maskable-512.png', 512, 0.12]]) {
    await page.setViewportSize({ width: size, height: size });
    await page.setContent(`<html><body style="margin:0;background:${pad ? '#E8590C' : 'transparent'};display:grid;place-items:center;height:100vh"><div style="width:${100 - pad * 200}%;height:${100 - pad * 200}%">${svg}</div></body></html>`);
    await page.screenshot({ path: path.join(DIST, 'assets/img', name), omitBackground: !pad });
  }
  await page.close();
}
async function renderCover(browser, lang) {
  const page = await browser.newPage({ viewport: { width: 800, height: 1280 } });
  await page.goto('file://' + path.join(DIST, 'print', `${lang}.html`));
  await page.addStyleTag({ content: '.toc-page-wrap,.chapter{display:none!important}.cover{height:1280px!important;min-height:0!important}' });
  const out = path.join(ROOT, 'tools/.tmp', `cover-${lang}.png`);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  await page.screenshot({ path: out, clip: { x: 0, y: 0, width: 800, height: 1280 } });
  await page.close();
  return out;
}
async function buildPdf(browser, lang) {
  const page = await browser.newPage();
  await page.goto('file://' + path.join(DIST, 'print', `${lang}.html`), { waitUntil: 'load' });
  await page.emulateMedia({ media: 'print' });
  await page.evaluate(() => document.documentElement.classList.add('pdf-color'));
  const footer = `<div style="font-family:Inter,Arial,sans-serif;font-size:8px;width:100%;padding:0 15mm;display:flex;justify-content:space-between;color:#444"><span>${esc(t(BOOK_TITLE, lang))} · ${esc(VERSION)} · 112</span><span><span class="pageNumber"></span> / <span class="totalPages"></span></span></div>`;
  const opts = { format: 'A4', printBackground: true, displayHeaderFooter: true, headerTemplate: '<div></div>', footerTemplate: footer, margin: { top: '14mm', bottom: '16mm', left: '0', right: '0' }, outline: true, tagged: true };
  // Strany cieľov odkazov podľa neviditeľných značiek §§id§§. Doplnené čísla strán predĺžia text, preto sa
  // prepočítava, kým sa rozloženie neustáli (1. priechod s náhradným číslom „000“ rovnakej šírky).
  const tmp = path.join(ROOT, 'tools/.tmp', `pass-${lang}.pdf`);
  const measure = async () => {
    await page.pdf({ ...opts, path: tmp });
    const txt = spawnSync('pdftotext', ['-layout', tmp, '-'], { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 }).stdout;
    const pages = txt.split('\f');
    const map = {};
    pages.forEach((p, i) => { for (const m of p.matchAll(/§§([a-z0-9-]+)§§/g)) if (!map[m[1]]) map[m[1]] = i + 1; });
    return { map, count: pages.length - 1 };
  };
  const fill = (map) => page.evaluate(([m, pg, f]) => {
    document.querySelectorAll('.toc-page').forEach((el) => { el.textContent = m ? m[el.dataset.id] || '' : '000'; });
    new Function('map', 'pg', `(${f})(map, pg)`)(m || new Proxy({}, { get: () => '000' }), pg);
  }, [map, t(UI.pageShort, lang), PAGE_FILL.toString()]);
  await fill(null);
  let { map: pageOf, count } = await measure();
  for (let pass = 2; pass <= 5; pass++) {
    await fill(pageOf);
    const r = await measure();
    const same = Object.keys(r.map).length === Object.keys(pageOf).length && Object.entries(r.map).every(([k, v]) => pageOf[k] === v);
    pageOf = r.map; count = r.count;
    if (same) break;
    if (pass === 5) warn(`PDF ${lang}: čísla strán sa neustálili ani po 5 priechodoch`);
  }
  const noPage = await page.evaluate((map) => [...new Set([...document.querySelectorAll('.ch-page, .pref .pg')].map((e) => e.dataset.id).filter((id) => !map[id]))], pageOf);
  if (noPage.length) warn(`PDF ${lang}: bez čísla strany ${noPage.length} cieľov (${noPage.slice(0, 5).join(', ')})`);
  await page.evaluate(() => document.querySelectorAll('.pdf-marker').forEach((el) => el.remove()));
  const out = path.join(DIST, 'downloads', `krizova-prirucka-${lang}.pdf`);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  await page.pdf({ ...opts, path: out });
  await page.close();
  return { out, pages: count, found: CHAPTERS.filter((c) => pageOf[c.id]).length, pageOf };
}
const EPUB_NOTE = L(
  'Čísla strán v odkazoch (→ kap. 9, str. 45) zodpovedajú tlačenej verzii (PDF). Čítačky so zoznamom strán ich otvoria cez „Prejsť na stranu“.',
  'Čísla stran v odkazech (→ kap. 9, str. 45) odpovídají tištěné verzi (PDF). Čtečky se seznamem stran je otevřou přes „Přejít na stranu“.',
  'Page numbers in references (→ ch. 9, p. 45) match the printed edition (PDF). Readers with a page list can open them with “Go to page”.');
function buildEpub(lang, chs, cover, pageOf = {}) {
  const strip = (s) => s.replace(/[\p{Extended_Pictographic}\u{1F1E6}-\u{1F1FF}\uFE0F\u200D]/gu, '').replace(/<span class="ch-label">([^<]*)<\/span>/g, '<span class="ch-label">$1</span> ');
  let body = chs.map((c) => strip(c.html.replace(/<div class="table-wrap">|<\/table><\/div>/g, (m) => (m.startsWith('</') ? '</table>' : '')))).join('\n');
  const hasPages = Object.keys(pageOf).length > 0;
  body = fillPagesHtml(body, pageOf, t(UI.pageShort, lang));
  // voľby ako bežný blok – niektoré čítačky s <nav> vnútri textu nepracujú
  body = body.replace(/<nav class="choices([^"]*)"([^>]*)>([\s\S]*?)<\/nav>/g, '<div class="choices$1"$2>$3</div>');
  // značky strán tlačeného vydania pred nadpismi (EPUB page-list)
  let last = 0;
  if (hasPages) {
    body = body.replace(/<(h[1-4]|div)(\s[^>]*?\bid="([a-z0-9-]+)"[^>]*)>/g, (m, tag, attrs, id) => {
      const n = pageOf[id];
      if (!n || n <= last) return m;
      last = n;
      return `<span class="pagebreak" id="pg${n}" title="${n}"></span>${m}`;
    });
  }
  const note = (unverifiedNote(lang) ? `<p class="epub-note">${esc(unverifiedNote(lang))}</p>` : '') + (hasPages ? `<p class="epub-note">${esc(t(EPUB_NOTE, lang))}</p>` : '');
  const src = path.join(ROOT, 'tools/.tmp', `epub-${lang}.html`);
  write(src, `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><title>${esc(t(BOOK_TITLE, lang))}</title></head><body>${note}${body}</body></html>`);
  const out = path.join(DIST, 'downloads', `krizova-prirucka-${lang}.epub`);
  const r = spawnSync('pandoc', ['-f', 'html', '-t', 'epub3', src, '-o', out, '--toc', '--toc-depth=2', '--split-level=1',
    '--css', path.join(ROOT, 'src/css/epub.css'), '--epub-cover-image', cover,
    '--metadata', `title=${t(BOOK_TITLE, lang)}`, '--metadata', `subtitle=${t(BOOK_SUBTITLE, lang)}`, '--metadata', `lang=${lang}`,
    '--metadata', `date=${EDITION}`, '--metadata', `author=Krízová príručka`, '--metadata', `version=${VERSION}`], { encoding: 'utf8' });
  if (r.status !== 0) throw new Error(r.stderr);
  if (r.stderr.trim()) warn('pandoc epub: ' + r.stderr.trim().split('\n').slice(0, 3).join(' | '));
  if (hasPages) epubPageList(out, lang);
  return out;
}
// Doplní do EPUB zoznam strán tlačeného vydania (epub:type="pagebreak" + nav page-list).
function epubPageList(file, lang) {
  const dir = path.join(ROOT, 'tools/.tmp', `epub-${lang}`);
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  const unz = spawnSync('unzip', ['-q', file, '-d', dir], { encoding: 'utf8' });
  if (unz.status !== 0) { warn(`EPUB ${lang}: zoznam strán sa nedoplnil (unzip)`); return; }
  const textDir = path.join(dir, 'EPUB', 'text');
  const entries = [];
  for (const f of fs.readdirSync(textDir).sort()) {
    const p = path.join(textDir, f);
    const s = read(p).replace(/<span id="pg(\d+)"[^>]*class="pagebreak"[^>]*><\/span>/g, (m, n) => {
      entries.push([Number(n), f]);
      return `<span epub:type="pagebreak" role="doc-pagebreak" id="pg${n}" aria-label="${n}"></span>`;
    });
    write(p, s);
  }
  entries.sort((a, b) => a[0] - b[0]);
  const navP = path.join(dir, 'EPUB', 'nav.xhtml');
  write(navP, read(navP).replace('</body>', `<nav epub:type="page-list" id="page-list" hidden="hidden"><h1>${esc(t(L('Strany tlačenej verzie', 'Strany tištěné verze', 'Print page list'), lang))}</h1><ol>${entries.map(([n, f]) => `<li><a href="text/${f}#pg${n}">${n}</a></li>`).join('')}</ol></nav>\n</body>`));
  const opfP = path.join(dir, 'EPUB', 'content.opf');
  write(opfP, read(opfP).replace('</metadata>', '<meta property="schema:accessibilityFeature">printPageNumbers</meta>\n</metadata>'));
  fs.rmSync(file);
  const z1 = spawnSync('zip', ['-X0q', file, 'mimetype'], { cwd: dir });
  const z2 = spawnSync('zip', ['-X9rq', file, 'META-INF', 'EPUB'], { cwd: dir });
  if (z1.status !== 0 || z2.status !== 0) throw new Error(`EPUB ${lang}: zip zlyhal`);
}

// ---------- Service worker ----------
function listFiles(dir, base = dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
    const p = path.join(dir, d.name);
    return d.isDirectory() ? listFiles(p, base) : [path.relative(base, p).split(path.sep).join('/')];
  });
}
// Hlavičky pre hosting (Netlify aj Cloudflare Pages čítajú súbor _headers)
function buildHeaders() {
  const epubs = fs.existsSync(path.join(DIST, 'downloads')) ? fs.readdirSync(path.join(DIST, 'downloads')).filter((f) => f.endsWith('.epub')) : [];
  write(path.join(DIST, '_headers'), [
    '# Hlavičky pre Netlify a Cloudflare Pages (vytvára tools/build.mjs)',
    '/*', '  X-Content-Type-Options: nosniff', '  Referrer-Policy: strict-origin-when-cross-origin',
    '  Permissions-Policy: camera=(), microphone=(), geolocation=(self)', '  X-Frame-Options: SAMEORIGIN',
    '# service worker sa musí vždy overiť na serveri, inak by sa nové verzie oneskorovali',
    '/sw.js', '  Cache-Control: no-cache',
    '/manifest.webmanifest', '  Content-Type: application/manifest+json',
    ...epubs.flatMap((f) => [`/downloads/${f}`, '  Content-Type: application/epub+zip']),
    '/downloads/offline/*', '  Content-Type: application/octet-stream',
    '',
  ].join('\n'));
}
function buildServiceWorker() {
  buildHeaders();
  // Z offline mapy sa vopred ukladá len prehľad Európy; podrobné balíky sa uložia, keď ich mapa načíta.
  const mapPre = (f) => !f.startsWith('assets/map/') || /^assets\/map\/(index|labels|countries|base|6-[0-9-]+)\.js$/.test(f);
  const files = listFiles(DIST).filter((f) => !f.startsWith('downloads/') && !f.startsWith('print/') && !f.startsWith('app/') && f !== 'sw.js' && f !== 'OTVOR-PRIRUCKU.html' && !f.endsWith('.map') && !f.endsWith('.txt') && !f.startsWith('.') && !f.startsWith('_') && !f.endsWith('.toml') && !f.startsWith('assets/img/screens/') && !f.endsWith('.zip') && mapPre(f));
  // každý súbor s kontrolným súčtom – service worker pri aktualizácii stiahne len zmenené súbory
  const hash = crypto.createHash('sha1');
  const pre = files.map((f) => {
    const h = crypto.createHash('sha1').update(fs.readFileSync(path.join(DIST, f))).digest('hex').slice(0, 10);
    hash.update(f + h);
    return [f, h];
  });
  const version = hash.digest('hex').slice(0, 10);
  const sw = read(path.join(ROOT, 'src/sw.js')).replace('__VERSION__', version).replace('__PRECACHE__', JSON.stringify(pre));
  write(path.join(DIST, 'sw.js'), sw);
  return { version, count: files.length };
}

// ---------- Hlavný beh ----------
async function main() {
  const t0 = Date.now();
  if (MANUAL_ONLY || REFRESH) {
    if (!fs.existsSync(path.join(DIST, 'index.html'))) throw new Error('Najprv zostav aplikáciu: node tools/build.mjs');
    if (MANUAL_ONLY) {
      fs.cpSync(path.join(ROOT, 'src/css/manual.css'), path.join(DIST, 'assets/css/manual.css'));
      buildDownloads();
      await withBrowser(async (browser) => {
        for (const lang of BUILD_LANGS) { const n = await buildManual(browser, lang); if (n) console.log(`✓ návod k aplikácii ${lang}: ${n} strán`); }
      });
      addManifestScreenshots();
    }
    const dl = buildDownloads();
    console.log(`✓ na stiahnutie: kniha ${Object.keys(dl.book).join(', ') || '–'}${dl.offline ? `, offline balík (${dl.offline.parts.length} častí)` : ''}`);
    const sw = buildServiceWorker();
    console.log(`✓ service worker ${sw.version}`);
    if (warnings.size) console.log('Upozornenia:\n - ' + [...warnings].join('\n - '));
    console.log(`Hotovo za ${((Date.now() - t0) / 1000).toFixed(1)} s`);
    return;
  }
  if (!ONLY) fs.rmSync(DIST, { recursive: true, force: true });
  fs.mkdirSync(DIST, { recursive: true });
  copyAssets();
  fs.writeFileSync(path.join(DIST, '.nojekyll'), ''); // GitHub Pages bez Jekyllu
  buildRoot();
  const books = {};
  for (const lang of BUILD_LANGS) {
    const chs = renderChapters(lang);
    checkConsistency(lang);
    books[lang] = chs;
    buildAppBook(lang, chs);
    write(path.join(DIST, 'print', `${lang}.html`), fullBook(lang, chs));
    console.log(`✓ ${lang}: ${chs.length} kapitol v aplikácii`);
  }
  if (BUILD_LANGS.includes('sk')) { buildShelterOverview(); console.log('✓ prehľad úkrytov CO (#/kryty)'); }
  await withBrowser(async (browser) => {
    await renderIcons(browser);
    if (!NO_PDF && BUILD_LANGS.includes('sk')) { await buildShelterPdf(browser); console.log('✓ PDF prehľad úkrytov CO'); }
    for (const lang of BUILD_LANGS) {
      let pageOf = {};
      if (!NO_PDF) { const r = await buildPdf(browser, lang); pageOf = r.pageOf; console.log(`✓ PDF ${lang}: ${r.pages} strán, kapitoly nájdené ${r.found}/${CHAPTERS.length}`); }
      if (!NO_EPUB) { const cover = await renderCover(browser, lang); buildEpub(lang, books[lang], cover, pageOf); console.log(`✓ EPUB ${lang}${NO_PDF ? ' (bez čísel strán – PDF sa nezostavovalo)' : ''}`); }
    }
  });
  if (!NO_PDF && !NO_MANUAL) {
    buildDownloads(); // aplikácia na snímkach ukáže knihy na stiahnutie
    await withBrowser(async (browser) => {
      for (const lang of BUILD_LANGS) { const n = await buildManual(browser, lang); if (n) console.log(`✓ návod k aplikácii ${lang}: ${n} strán`); }
    });
    const n = addManifestScreenshots();
    if (n) console.log(`✓ manifest: ${n} snímky obrazovky pre inštalačné okno`);
  }
  const dl = buildDownloads();
  console.log(`✓ na stiahnutie: kniha ${Object.keys(dl.book).join(', ') || '–'}${dl.shelters ? ', úkryty' : ''}${Object.keys(dl.manual).length ? ', návod' : ''}`);
  const sw = buildServiceWorker();
  console.log(`✓ service worker ${sw.version}, ${sw.count} súborov na offline`);
  const miss = {};
  for (const k of globalThis.KP_I18N_MISS) { const [l] = k.split('\u0001'); miss[l] = (miss[l] || 0) + 1; }
  for (const [l, n] of Object.entries(miss)) if (BUILD_LANGS.includes(l)) warn(`${l}: ${n} textov bez prekladu (node tools/i18n.mjs)`);
  for (const f of bigFiles()) warn(`Súbor ${f} má viac ako 10 MB – Netlify ho neprijme`);
  if (warnings.size) console.log('Upozornenia:\n - ' + [...warnings].join('\n - '));
  console.log(`Hotovo za ${((Date.now() - t0) / 1000).toFixed(1)} s`);
}
main().catch((e) => { console.error(e); process.exit(1); });
