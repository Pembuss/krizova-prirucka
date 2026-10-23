// Build: kniha (HTML, PDF, EPUB), web v troch jazykoch, aplikácia, PWA.
// Použitie: node tools/build.mjs [--no-pdf] [--no-epub] [--lang=sk]
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

const L = (sk, cs, en) => ({ sk, cs, en });
import { expandPlaceholders, chapterLabel, esc, scenarioNumbers } from './render.mjs';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const args = process.argv.slice(2);
const NO_PDF = args.includes('--no-pdf');
const NO_EPUB = args.includes('--no-epub');
const ONLY = (args.find((a) => a.startsWith('--lang=')) || '').split('=')[1];
const ALL_LANGS = LANGS.map((l) => l.id);
const BUILD_LANGS = ALL_LANGS.filter((l) => fs.existsSync(path.join(ROOT, 'content', l, 'rozcestnik.md')) && (!ONLY || l === ONLY));
const EDITION = '2026-10';

const read = (p) => fs.readFileSync(p, 'utf8');
const write = (p, s) => { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, s); };
const copyDir = (src, dst) => fs.cpSync(src, dst, { recursive: true });
const LOGO = read(path.join(ROOT, 'src/img/logo.svg')).trim();

// Názvy súborov stránok webu (rovnaké vo všetkých jazykoch kvôli prepínaču jazyka).
const PAGES = {
  home: 'index.html', crises: 'krizy/index.html', cards: 'karty.html', lists: 'zoznamy.html', countries: 'krajiny.html',
  sources: 'zdroje.html', map: 'mapa.html', about: 'o-projekte.html', downloads: 'stiahnut.html', book: 'kniha/index.html',
};

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
    c.html = enhanceChoices(c.html, c.id, refs, lang);
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
// Údaje pre interaktivitu knihy na webe (profil čitateľa, odporúčania, scenáre)
function bookData(lang, chs, current) {
  const refs = chs.refs;
  const section = (id) => { const h = refs.get(id); return h ? { ch: h.ch, label: shortLabel(h.label, lang), text: h.text } : null; };
  const recIds = [...new Set(Object.values(REC).flat())];
  return {
    ch: current,
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
const BOOK_STRINGS = Object.fromEntries(['sk', 'cs', 'en'].map((lang) => [lang, Object.fromEntries(Object.entries({
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
// Preklady musia mať rovnaké zástupné značky ako slovenčina (odkazy kontroluje buildBook).
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
// Prepíše #kotvy na odkazy na súbory kapitol (prefix = cesta ku kapitolám z aktuálnej stránky).
function rewriteLinks(html, map, current, prefix = '') {
  return html.replace(/href="#([^"]+)"/g, (m, id) => {
    const ch = map.get(id);
    if (!ch) { warn(`Neznámy odkaz #${id} (${current})`); return m; }
    if (ch === current && !prefix) return m;
    return `href="${prefix}${ch}.html${id === ch ? '' : '#' + id}"`;
  });
}
const warnings = new Set();
const warn = (s) => warnings.add(s);

// ---------- Rozloženie stránky ----------
function navItems(lang) {
  return [
    ['book', t(UI.book, lang)], ['app', t(UI.app, lang)], ['map', t(UI.map, lang)],
    ['cards', t(UI.cards, lang)], ['lists', t(UI.lists, lang)], ['countries', t(UI.countries, lang)],
  ];
}
const FOOTER_ITEMS = ['home', 'sources', 'downloads', 'about'];
function layout({ lang, title, body, rel, active, page, description = '', bodyClass = '', scripts = [] }) {
  // rel = relatívna cesta ku koreňu webu (napr. '../' zo /sk/index.html)
  const href = (key) => key === 'app' ? `${rel}app/index.html?lang=${lang}` : `${rel}${lang}/${PAGES[key]}`;
  const nav = navItems(lang).map(([k, label]) => `<a href="${href(k)}"${k === active ? ' aria-current="page"' : ''}>${esc(label)}</a>`).join('');
  const langLinks = ALL_LANGS.map((l) => `<option value="${rel}${l}/${page}"${l === lang ? ' selected' : ''}>${l.toUpperCase()}</option>`).join('');
  return `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description || t(SITE.tagline, lang))}">
<meta name="theme-color" content="#c2410c">
<link rel="manifest" href="${rel}manifest.webmanifest">
<link rel="icon" href="${rel}assets/img/logo.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="${rel}assets/img/icon-180.png">
<link rel="stylesheet" href="${rel}assets/css/site.css">
<link rel="stylesheet" href="${rel}assets/css/print.css">
<script>try{var s=JSON.parse(localStorage.getItem('kp.prefs')||'{}');var d=document.documentElement;if(s.theme)d.dataset.theme=s.theme;if(s.size)d.dataset.size=s.size;if(s.contrast)d.dataset.contrast=s.contrast;}catch(e){}</script>
</head>
<body class="${bodyClass}" data-root="${rel}" data-lang="${lang}">
<a class="skip" href="#main">${esc(t(UI.skipToContent, lang))}</a>
<div class="emergency-strip">📞 ${esc(t(SITE.emergencyStrip, lang))}</div>
<header class="site-header"><div class="bar">
<a class="brand" href="${href('home')}">${LOGO}<span>${esc(t(SITE.title, lang))}</span></a>
<button class="iconbtn menu-toggle" aria-expanded="false" aria-controls="nav" aria-label="Menu">☰</button>
<nav class="nav" id="nav" aria-label="Menu">${nav}
<div class="tools">
<label class="visually-hidden" for="langsel">${esc(t(UI.language, lang))}</label>
<select id="langsel" class="langsel" data-lang-switch>${langLinks}</select>
<button class="iconbtn" data-theme-toggle aria-label="${esc(t(UI.theme, lang))}" title="${esc(t(UI.theme, lang))}">🌓</button>
<button class="iconbtn" data-size-toggle aria-label="A+" title="A+">A+</button>
</div></nav></div></header>
<main id="main">${body}</main>
<footer class="site-footer"><div class="wrap">
<nav class="footer-nav" aria-label="${esc(t(UI.about, lang))}">${FOOTER_ITEMS.map((k) => `<a href="${href(k)}">${esc(t(UI[k], lang))}</a>`).join('')}${navItems(lang).map(([k, label]) => `<a href="${href(k)}">${esc(label)}</a>`).join('')}</nav>
<p>${esc(t(UI.disclaimer, lang))}</p>
<p>${esc(t(UI.dataNote, lang))} · ${esc(t(SITE.license, lang))}</p>
</div></footer>
<script defer src="${rel}assets/js/site.js"></script>
${scripts.map((s) => `<script defer src="${rel}${s}"></script>`).join('\n')}
</body></html>`;
}

// ---------- Kniha (web) ----------
const jsonScript = (o) => JSON.stringify(o).replace(/</g, '\\u003c');
// Scenáre pre prehrávač na webe: texty v jazyku, čísla §, ciele tipov ako odkazy na stránky kapitol
function scenarioData(lang, chs, map) {
  const num = scenarioNumbers();
  const href = (id) => { const ch = map.get(id); return ch ? `${ch}.html${ch === id ? '' : '#' + id}` : ''; };
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
function bookToc(chs, lang, current, prefix = '') {
  let out = '<ol>';
  for (const part of PARTS) {
    out += `<li class="part">${esc(t(part.name, lang))}</li>`;
    for (const c of chs.filter((x) => x.part === part.id)) {
      out += `<li><a href="${prefix}${c.id}.html"${c.id === current ? ' aria-current="page"' : ''}>${c.label ? `<small>${esc(c.label)}</small> ` : ''}${esc(c.title)}</a></li>`;
    }
  }
  return out + '</ol>';
}
function buildBook(lang, chs) {
  const map = linkMap(chs);
  const dir = path.join(DIST, lang, 'kniha');
  chs.forEach((c, i) => {
    const prev = chs[i - 1], next = chs[i + 1];
    const pager = `<nav class="pager" aria-label="${esc(t(UI.contents, lang))}">${prev ? `<a href="${prev.id}.html">← ${esc(prev.title)}</a>` : '<span></span>'}${next ? `<a href="${next.id}.html">${esc(next.title)} →</a>` : '<span></span>'}</nav>`;
    const body = `<div class="book">
<aside><button class="btn btn-ghost toc-toggle no-print" aria-expanded="false" aria-controls="toc">☰ ${esc(t(UI.contents, lang))}</button>
<nav class="book-toc" id="toc" aria-label="${esc(t(UI.contents, lang))}">${bookToc(chs, lang, c.id)}</nav></aside>
<article class="book-main">
<div class="btn-row no-print"><a class="btn btn-ghost" href="index.html">🧭 ${esc(t(UI.contents, lang))}</a><button class="btn btn-ghost" data-print>🖨️ ${esc(t(UI.print, lang))}</button><a class="btn btn-ghost" href="../../app/index.html?lang=${lang}">${esc(t(UI.openApp, lang))}</a></div>
<div class="reader-bar no-print" data-reader-bar></div>
${rewriteLinks(c.html, map, c.id)}
<aside class="recommend no-print" data-recommend hidden></aside>
${pager}
<script type="application/json" id="book-data">${jsonScript(bookData(lang, chs, c.id))}</script>${c.id === 'scenare' ? `\n<script type="application/json" id="scenario-data">${jsonScript(scenarioData(lang, chs, map))}</script>` : ''}
</article></div>`;
    write(path.join(dir, `${c.id}.html`), layout({ lang, title: `${c.title} – ${t(BOOK_TITLE, lang)}`, body, rel: '../../', active: 'book', page: `kniha/${c.id}.html`, scripts: [] }));
  });
  // Úvodná stránka knihy: interaktívny rozcestník + obsah + na stiahnutie
  const crisisBtns = CRISES.map((c) => `<button type="button" data-crisis="${c.id}" aria-pressed="false"><span class="ico">${c.icon}</span>${esc(t(c.name, lang))}</button>`).join('');
  const sitBtns = SITUATIONS.map((s) => `<button type="button" data-situation="${s.id}" aria-pressed="false"><span class="ico">${s.icon}</span>${esc(t(s.name, lang))}</button>`).join('');
  const body = `<div class="wrap">
<section class="narrow">
<p class="ch-label">${esc(t(BOOK_TITLE, lang))}</p>
<h1>${esc(t(BOOK_SUBTITLE, lang))}</h1>
<div class="btn-row"><a class="btn" href="rozcestnik.html">📖 ${esc(chs[0].title)}</a><a class="btn btn-ghost" href="scenare.html">🎲 ${esc(chapterById('scenare') && t(chapterById('scenare').title, lang))}</a><a class="btn btn-ghost" href="cela.html">📄 ${esc(t(L('Celá kniha na jednej stránke', 'Celá kniha na jedné stránce', 'Whole book on one page'), lang))}</a><a class="btn btn-ghost" href="../stiahnut.html">⬇️ PDF / EPUB</a></div>
</section>
<section class="reader-panel" data-reader-panel></section>
<section id="rozcestnik-app" data-signpost>
<h2>🧭 ${esc(t(L('Čo sa deje?', 'Co se děje?', 'What is happening?'), lang))}</h2>
<div class="chooser" role="group">${crisisBtns}</div>
<h3>${esc(t(L('…alebo aká je tvoja situácia?', '…nebo jaká je tvoje situace?', '…or what is your situation?'), lang))}</h3>
<div class="chooser" role="group">${sitBtns}</div>
<div class="needs" role="group" aria-label="${esc(t(UI.next, lang))}">
<button type="button" data-need="now" aria-pressed="true">⚡ ${esc(t(UI.doNow, lang))}</button>
<button type="button" data-need="plan" aria-pressed="false">🗓️ ${esc(t(UI.plan, lang))}</button>
<button type="button" data-need="know" aria-pressed="false">📘 ${esc(t(UI.know, lang))}</button>
</div>
<div data-signpost-out aria-live="polite"><p class="muted">${esc(t(L('Vyber krízu alebo situáciu – zobrazí sa odporúčané poradie kapitol.', 'Vyber krizi nebo situaci – zobrazí se doporučené pořadí kapitol.', 'Pick a crisis or situation to see the recommended reading order.'), lang))}</p></div>
</section>
<section><h2>${esc(t(UI.contents, lang))}</h2><nav class="book-toc" style="position:static;max-height:none;display:block">${bookToc(chs, lang, '')}</nav></section>
</div>
<script type="application/json" id="signpost-data">${JSON.stringify({
    paths: PATHS, situations: Object.fromEntries(SITUATIONS.map((s) => [s.id, s.chapters])),
    crisisChapter: Object.fromEntries(CRISES.map((c) => [c.id, c.chapter])),
    titles: Object.fromEntries(chs.map((c) => [c.id, (c.label ? c.label + ' · ' : '') + c.title])),
  }).replace(/</g, '\\u003c')}</script>
<script type="application/json" id="book-data">${jsonScript(bookData(lang, chs, ''))}</script>`;
  write(path.join(dir, 'index.html'), layout({ lang, title: t(BOOK_TITLE, lang), body, rel: '../../', active: 'book', page: 'kniha/index.html' }));
  // Celá kniha na jednej stránke (tlač, PDF)
  write(path.join(dir, 'cela.html'), fullBook(lang, chs, map));
}

function fullBook(lang, chs, map, { pdf = false } = {}) {
  const toc = PARTS.map((p) => {
    const items = chs.filter((c) => c.part === p.id).map((c) => `<li><a href="#${c.id}"><span>${c.label ? esc(c.label) + ' · ' : ''}${esc(c.title)}</span><span class="toc-page" data-id="${c.id}"></span></a></li>`).join('');
    return `<li class="toc-part">${esc(t(p.name, lang))}<ol>${items}</ol></li>`;
  }).join('');
  const chapters = chs.map((c) => `<section class="chapter" id="sec-${c.id}"><span class="pdf-marker">§§${c.id}§§</span>${c.html.replace(/(<h[2-4][^>]*\sid="([a-z0-9-]+)"[^>]*>)/g, '$1<span class="pdf-marker">§§$2§§</span>').replace(/(<div class="gb-node[^"]*" id="([a-z0-9-]+)">)/g, '$1<span class="pdf-marker">§§$2§§</span>')}</section>`).join('\n');
  return `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(t(BOOK_TITLE, lang))}</title>
<link rel="stylesheet" href="../../assets/css/site.css"><link rel="stylesheet" href="../../assets/css/print.css"><link rel="stylesheet" href="../../assets/css/book-print.css">
</head><body class="fullbook">
<section class="cover">
<div class="cover-logo">${LOGO}</div>
<p class="cover-kicker">${esc(t(L('Príručka pre domácnosti', 'Příručka pro domácnosti', 'A handbook for households'), lang))}</p>
<h1 class="cover-title">${esc(t(BOOK_TITLE, lang))}</h1>
<p class="cover-sub">${esc(t(BOOK_SUBTITLE, lang))}</p>
<ul class="cover-list">${CRISES.map((c) => `<li>${c.icon} ${esc(t(c.name, lang))}</li>`).join('')}</ul>
<p class="cover-foot">${esc(t(UI.dataNote, lang))} · ${esc(t(UI.disclaimer, lang))}<br><strong>112</strong> – ${esc(t(UI.emergency, lang))}</p>
</section>
<section class="toc-page-wrap"><h2 class="toc-heading">${esc(t(UI.contents, lang))}</h2><ol class="fulltoc">${toc}</ol></section>
${chapters}
</body></html>`;
}

// ---------- Web ----------
function crisisCard(c, lang, rel) {
  return `<a class="card" href="${rel}${lang}/krizy/${c.id}.html"><div class="icon">${c.icon}</div><h3>${esc(t(c.name, lang))}</h3><p>${esc(t(c.short, lang))}</p></a>`;
}
function stepCard(c, lang, { chapterHref, standalone = true } = {}) {
  const steps = (c.now || c.steps).map((s) => `<li>${esc(t(s, lang))}</li>`).join('');
  return `<section class="stepcard page-break avoid-break" id="karta-${c.id}">
<div class="box urgent"><p class="box-title">${c.icon} ${esc(t(UI.now, lang))} – ${esc(t(c.name, lang))}</p><ol class="steps">${steps}</ol></div>
${c.before ? `<div class="grid two"><div><h3>${esc(t(UI.before, lang))}</h3><ul class="checklist">${c.before.map((s) => `<li><span class="cb">☐</span> ${esc(t(s, lang))}</li>`).join('')}</ul></div>
<div><h3>${esc(t(UI.after, lang))}</h3><ul class="checklist">${c.after.map((s) => `<li><span class="cb">☐</span> ${esc(t(s, lang))}</li>`).join('')}</ul></div></div>` : ''}
<p class="card-foot"><strong>112</strong> · ${chapterHref ? `<a href="${chapterHref}">${esc(t(UI.readChapter, lang))}: ${esc(t(chapterById(c.chapter).title, lang))}</a>` : ''}</p>
</section>`;
}

function buildSite(lang, chs) {
  const L2 = (k) => t(SITE[k], lang);
  const rel1 = '../';
  // Domov
  const groups = CRISIS_GROUPS.map((g) => `<h3>${esc(t(g.name, lang))}</h3><div class="grid cards">${CRISES.filter((c) => c.group === g.id).map((c) => crisisCard(c, lang, rel1)).join('')}</div>`).join('');
  const toolsHref = { app: `${rel1}app/index.html?lang=${lang}`, map: 'mapa.html', stories: 'kniha/scenare.html', cards: 'karty.html', lists: 'zoznamy.html', countries: 'krajiny.html', sources: 'zdroje.html' };
  const home = `<section class="hero"><div class="wrap">
<h1>${esc(L2('title'))}</h1><p class="lead">${esc(L2('heroLead'))}</p>
<div class="btn-row"><a class="btn btn-urgent" href="#krizy">⚡ ${esc(L2('ctaNow'))}</a><a class="btn" href="${rel1}app/index.html?lang=${lang}">🧮 ${esc(L2('ctaPrepare'))}</a><a class="btn btn-ghost" href="kniha/index.html">📖 ${esc(L2('ctaBook'))}</a></div>
</div></section>
<div class="wrap">
<section id="krizy"><h2>${esc(L2('crisesTitle'))}</h2><p>${esc(L2('crisesLead'))}</p>${groups}
<h3>${esc(t(L('Spôsoby ochrany', 'Způsoby ochrany', 'Protective actions'), lang))}</h3><div class="grid cards">${ACTIONS.map((a) => `<a class="card" href="karty.html#karta-${a.id}"><div class="icon">${a.icon}</div><h3>${esc(t(a.name, lang))}</h3></a>`).join('')}</div></section>
<section><h2>${esc(L2('startTitle'))}</h2><ol class="path">${SITE.start.map((s) => `<li>${esc(t(s, lang))}</li>`).join('')}</ol></section>
<section><h2>${esc(L2('toolsTitle'))}</h2><div class="grid cards">${SITE.tools.map((x) => `<a class="card" href="${toolsHref[x.href]}"><div class="icon">${x.icon}</div><h3>${esc(t(x.name, lang))}</h3><p>${esc(t(x.text, lang))}</p></a>`).join('')}</div></section>
<section><h2>${esc(L2('downloadsTitle'))}</h2><p>${esc(L2('downloadsLead'))}</p>${downloadButtons(lang, rel1)}</section>
<section><h2>${esc(L2('installTitle'))}</h2><p>${esc(L2('install'))}</p></section>
</div>`;
  write(path.join(DIST, lang, 'index.html'), layout({ lang, title: `${L2('title')} – ${L2('tagline')}`, body: home, rel: rel1, active: 'home', page: 'index.html' }));

  // Krízy – prehľad a detail
  const crisesIdx = `<div class="wrap"><h1>${esc(t(UI.crises, lang))}</h1><p>${esc(L2('crisesLead'))}</p>${CRISIS_GROUPS.map((g) => `<h2>${esc(t(g.name, lang))}</h2><div class="grid cards">${CRISES.filter((c) => c.group === g.id).map((c) => crisisCard(c, lang, '../../')).join('')}</div>`).join('')}</div>`;
  write(path.join(DIST, lang, 'krizy/index.html'), layout({ lang, title: t(UI.crises, lang), body: crisesIdx, rel: '../../', active: 'home', page: 'krizy/index.html' }));
  for (const c of CRISES) {
    const p = PATHS[c.id];
    const links = (ids) => ids.map((id) => `<a href="../kniha/${id}.html">${esc(t(chapterById(id).title, lang))}</a>`).join(', ');
    const body = `<div class="wrap narrow">
<p class="ch-label">${esc(t(UI.crisis, lang))}</p><h1>${c.icon} ${esc(t(c.name, lang))}</h1><p class="lead">${esc(t(c.short, lang))}</p>
<div class="btn-row no-print"><button class="btn btn-ghost" data-print>🖨️ ${esc(L2('printThis'))}</button><a class="btn btn-ghost" href="../kniha/${c.chapter}.html">📖 ${esc(t(UI.readChapter, lang))}</a><a class="btn btn-ghost" href="../../app/index.html?lang=${lang}#/teraz/${c.id}">📱 ${esc(t(UI.app, lang))}</a>${SCENARIOS.some((s) => s.crisis === c.id) ? `<a class="btn btn-ghost" href="../kniha/scenare.html#scenar-${SCENARIOS.find((s) => s.crisis === c.id).id}">🎲 ${esc(t(UI.playStory, lang))}</a>` : ''}</div>
${stepCard(c, lang, { chapterHref: `../kniha/${c.chapter}.html` })}
<div class="box next"><p class="box-title">${esc(t(UI.next, lang))}</p><ul><li><strong>${esc(t(UI.doNow, lang))}:</strong> ${links(p.now)}</li><li><strong>${esc(t(UI.plan, lang))}:</strong> ${links(p.plan)}</li><li><strong>${esc(t(UI.know, lang))}:</strong> ${links(p.know)}</li></ul></div>
</div>`;
    write(path.join(DIST, lang, `krizy/${c.id}.html`), layout({ lang, title: `${t(c.name, lang)} – ${L2('title')}`, body, rel: '../../', active: 'home', page: `krizy/${c.id}.html` }));
  }

  // Postupové karty
  const cards = `<div class="wrap narrow"><h1>${esc(t(UI.cards, lang))}</h1><p>${esc(L2('cardsLead'))}</p>
<div class="btn-row no-print"><button class="btn" data-print>🖨️ ${esc(L2('printAll'))}</button></div>
<nav class="no-print"><ul class="situations">${[...CRISES, ...ACTIONS].map((c) => `<li><a href="#karta-${c.id}">${c.icon} ${esc(t(c.name, lang))}</a></li>`).join('')}</ul></nav>
${[...CRISES, ...ACTIONS].map((c) => stepCard(c, lang, { chapterHref: `kniha/${c.chapter}.html` })).join('\n')}</div>`;
  write(path.join(DIST, lang, 'karty.html'), layout({ lang, title: `${t(UI.cards, lang)} – ${L2('title')}`, body: cards, rel: rel1, active: 'cards', page: 'karty.html' }));

  // Kontrolné zoznamy
  const lists = `<div class="wrap narrow"><h1>${esc(t(UI.lists, lang))}</h1><p>${esc(L2('listsLead'))}</p>
<div class="btn-row no-print"><button class="btn" data-print>🖨️ ${esc(L2('printAll'))}</button></div>
<nav class="no-print"><ul class="situations">${CHECKLISTS.map((c) => `<li><a href="#zoznam-${c.id}">${c.icon} ${esc(t(c.name, lang))}</a></li>`).join('')}</ul></nav>
${CHECKLISTS.map((c) => `<div class="checklist-block avoid-break" id="zoznam-${c.id}" data-persist="list-${c.id}"><p class="checklist-title">${c.icon} ${esc(t(c.name, lang))}</p>${c.note ? `<p class="checklist-note">${esc(t(c.note, lang))}</p>` : ''}<ul class="checklist">${c.items.map((it) => `<li><span class="cb">☐</span> ${esc(t(it.t, lang))}</li>`).join('')}</ul></div>`).join('\n')}</div>`;
  write(path.join(DIST, lang, 'zoznamy.html'), layout({ lang, title: `${t(UI.lists, lang)} – ${L2('title')}`, body: lists, rel: rel1, active: 'lists', page: 'zoznamy.html' }));

  // Krajiny (obsah kapitoly prílohy + filter)
  const kr = chs.find((c) => c.id === 'kryty-europa');
  const map = linkMap(chs);
  const countriesBody = `<div class="wrap narrow"><h1>${esc(t(UI.countries, lang))}</h1><p>${esc(L2('countriesLead'))}</p>
<div class="no-print"><label for="cfilter" class="visually-hidden">${esc(L2('filter'))}</label><input id="cfilter" type="search" placeholder="${esc(L2('filter'))}" data-country-filter style="width:100%;min-height:48px;padding:.5rem .8rem;border-radius:12px;border:2px solid var(--border);background:var(--bg);color:var(--ink)"></div>
${rewriteLinks(kr.html.replace(/<h1[\s\S]*?<\/h1>/, ''), map, '__none__', 'kniha/')}</div>`;
  write(path.join(DIST, lang, 'krajiny.html'), layout({ lang, title: `${t(UI.countries, lang)} – ${L2('title')}`, body: countriesBody, rel: rel1, active: 'countries', page: 'krajiny.html' }));

  // Zdroje
  const zd = chs.find((c) => c.id === 'zdroje');
  const sourcesBody = `<div class="wrap narrow"><h1>${esc(t(UI.sources, lang))}</h1><p>${esc(L2('sourcesLead'))}</p>${rewriteLinks(zd.html.replace(/<h1[\s\S]*?<\/h1>/, ''), map, '__none__', 'kniha/')}</div>`;
  write(path.join(DIST, lang, 'zdroje.html'), layout({ lang, title: `${t(UI.sources, lang)} – ${L2('title')}`, body: sourcesBody, rel: rel1, active: 'sources', page: 'zdroje.html' }));

  // Mapa a trasy (rovnaký modul ako v aplikácii)
  const mapBody = `<div class="wrap"><h1>${esc(t(UI.map, lang))}</h1><p>${esc(L2('mapLead'))}</p>
<link rel="stylesheet" href="../assets/vendor/leaflet/leaflet.css"><link rel="stylesheet" href="../assets/css/app.css">
<script src="../assets/vendor/leaflet/leaflet.js"></script>
<div id="map-tool" data-map-tool></div><p><a class="btn" href="../app/index.html?lang=${lang}#/profil">${esc(t(L('Profil domácnosti a ciele evakuácie', 'Profil domácnosti a cíle evakuace', 'Household profile and destinations'), lang))}</a></p></div>
<div id="print-root" class="print-root"></div>`;
  write(path.join(DIST, lang, 'mapa.html'), layout({ lang, title: `${t(UI.map, lang)} – ${L2('title')}`, body: mapBody, rel: rel1, active: 'map', page: 'mapa.html', scripts: ['assets/js/maptool.js'] }));

  // Na stiahnutie
  const dl = `<div class="wrap narrow"><h1>${esc(t(UI.downloads, lang))}</h1><p>${esc(L2('downloadsLead'))}</p>${downloadButtons(lang, rel1)}
<h2>${esc(L2('installTitle'))}</h2><p>${esc(L2('install'))}</p>
<div class="btn-row no-print"><button class="btn" data-save-offline>💾 ${esc(L2('saveOffline'))}</button></div><p data-offline-status class="muted" aria-live="polite"></p>
<h2>${esc(t(UI.print, lang))}</h2><ul><li><a href="karty.html">${esc(t(UI.cards, lang))}</a></li><li><a href="zoznamy.html">${esc(t(UI.lists, lang))}</a></li><li><a href="kniha/sablony.html">${esc(t(chapterById('sablony').title, lang))}</a></li><li><a href="kniha/cela.html">${esc(t(L('Celá kniha na jednej stránke', 'Celá kniha na jedné stránce', 'Whole book on one page'), lang))}</a></li></ul>
</div>`;
  write(path.join(DIST, lang, 'stiahnut.html'), layout({ lang, title: `${t(UI.downloads, lang)} – ${L2('title')}`, body: dl, rel: rel1, active: 'downloads', page: 'stiahnut.html' }));

  // O projekte
  const about = `<div class="wrap narrow"><h1>${esc(L2('aboutTitle'))}</h1><p>${esc(L2('about'))}</p>
<h2>${esc(L2('methodTitle'))}</h2><ul>${SITE.method.map((m) => `<li>${esc(t(m, lang))}</li>`).join('')}</ul>
<h2>${esc(L2('privacyTitle'))}</h2><p>${esc(L2('privacy'))}</p>
<h2>${esc(L2('proposalsTitle'))}</h2><ol>${SITE.proposals.map((m) => `<li>${esc(t(m, lang))}</li>`).join('')}</ol>
<h2>${esc(L2('licenseTitle'))}</h2><p>${esc(L2('license'))}</p>
<div class="box urgent"><p class="box-title">⚠️</p><p>${esc(t(UI.disclaimer, lang))}</p></div></div>`;
  write(path.join(DIST, lang, 'o-projekte.html'), layout({ lang, title: `${L2('aboutTitle')} – ${L2('title')}`, body: about, rel: rel1, active: 'about', page: 'o-projekte.html' }));
}
function downloadButtons(lang, rel) {
  return `<div class="btn-row">${ALL_LANGS.map((l) => `<a class="btn${l === lang ? '' : ' btn-ghost'}" href="${rel}downloads/krizova-prirucka-${l}.pdf" download>PDF ${l.toUpperCase()}</a><a class="btn btn-ghost" href="${rel}downloads/krizova-prirucka-${l}.epub" download>EPUB ${l.toUpperCase()}</a>`).join('')}</div>`;
}

// ---------- Koreň webu, aplikácia, manifest ----------
function buildRoot() {
  const choices = LANGS.map((l) => `<a class="btn btn-ghost" href="${l.id}/index.html" hreflang="${l.id}">${l.name}</a>`).join('');
  write(path.join(DIST, 'index.html'), `<!doctype html><html lang="sk"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Krízová príručka · Krizová příručka · Crisis Handbook</title><link rel="manifest" href="manifest.webmanifest"><link rel="icon" href="assets/img/logo.svg" type="image/svg+xml"><link rel="stylesheet" href="assets/css/site.css">
<script>(function(){try{var p=JSON.parse(localStorage.getItem('kp.prefs')||'{}');var l=p.lang||(navigator.language||'sk').slice(0,2);if(['sk','cs','en'].indexOf(l)<0)l=l==='cz'?'cs':'en';if(location.hash!=='#choose')location.replace(l+'/index.html');}catch(e){location.replace('sk/index.html');}})();</script>
</head><body><main class="wrap narrow" style="text-align:center;padding-top:3rem">${LOGO.replace('<svg', '<svg width="96" height="96"')}<h1>Krízová príručka · Krizová příručka · Crisis Handbook</h1><div class="btn-row" style="justify-content:center">${choices}</div></main></body></html>`);
  // Zrozumiteľný vstup pre verziu otváranú priamo z disku (rozbalený ZIP, USB kľúč).
  fs.copyFileSync(path.join(DIST, 'index.html'), path.join(DIST, 'OTVOR-PRIRUCKU.html'));
  fs.copyFileSync(path.join(ROOT, 'src/NAVOD.txt'), path.join(DIST, 'NAVOD.txt'));
  const manifest = {
    name: 'Krízová príručka – Crisis Handbook', short_name: 'Krízová príručka', start_url: './app/index.html', scope: './', display: 'standalone',
    background_color: '#ffffff', theme_color: '#c2410c', lang: 'sk', description: t(SITE.tagline, 'sk'),
    icons: [
      { src: 'assets/img/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: 'assets/img/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: 'assets/img/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    shortcuts: [
      { name: 'Kríza teraz', url: './app/index.html#/teraz' },
      { name: 'Mapa a trasy', url: './app/index.html#/mapa' },
    ],
  };
  write(path.join(DIST, 'manifest.webmanifest'), JSON.stringify(manifest, null, 2));
  const appHtml = read(path.join(ROOT, 'src/app/index.html')).replace('{{LOGO}}', LOGO);
  write(path.join(DIST, 'app/index.html'), appHtml);
}

// Skripty zabalené do bežných (nie modulových) súborov – fungujú aj po otvorení z disku (file://).
function bundleScripts() {
  buildSync({
    entryPoints: { site: 'src/js/site.js', app: 'src/js/app/main.js', maptool: 'src/js/maptool.js' },
    absWorkingDir: ROOT, outdir: path.join(DIST, 'assets/js'), bundle: true, format: 'iife', target: 'es2020',
    minify: true, charset: 'utf8', legalComments: 'none', logLevel: 'warning',
  });
}

function copyAssets() {
  copyDir(path.join(ROOT, 'src/css'), path.join(DIST, 'assets/css'));
  bundleScripts();
  fs.mkdirSync(path.join(DIST, 'assets/img'), { recursive: true });
  fs.copyFileSync(path.join(ROOT, 'src/img/logo.svg'), path.join(DIST, 'assets/img/logo.svg'));
  copyDir(path.join(ROOT, 'node_modules/leaflet/dist'), path.join(DIST, 'assets/vendor/leaflet'));
  for (const f of ['leaflet-src.js', 'leaflet-src.js.map', 'leaflet.js.map', 'leaflet-src.esm.js', 'leaflet-src.esm.js.map']) fs.rmSync(path.join(DIST, 'assets/vendor/leaflet', f), { force: true });
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
  await page.goto('file://' + path.join(DIST, lang, 'kniha/cela.html'));
  await page.addStyleTag({ content: '.toc-page-wrap,.chapter{display:none!important}.cover{height:1280px!important;min-height:0!important}' });
  const out = path.join(ROOT, 'tools/.tmp', `cover-${lang}.png`);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  await page.screenshot({ path: out, clip: { x: 0, y: 0, width: 800, height: 1280 } });
  await page.close();
  return out;
}
async function buildPdf(browser, lang) {
  const page = await browser.newPage();
  await page.goto('file://' + path.join(DIST, lang, 'kniha/cela.html'), { waitUntil: 'load' });
  await page.emulateMedia({ media: 'print' });
  await page.evaluate(() => document.documentElement.classList.add('pdf-color'));
  const footer = `<div style="font-family:Inter,Arial,sans-serif;font-size:8px;width:100%;padding:0 15mm;display:flex;justify-content:space-between;color:#444"><span>${esc(t(BOOK_TITLE, lang))} · 112</span><span><span class="pageNumber"></span> / <span class="totalPages"></span></span></div>`;
  const opts = { format: 'A4', printBackground: true, displayHeaderFooter: true, headerTemplate: '<div></div>', footerTemplate: footer, margin: { top: '14mm', bottom: '16mm', left: '0', right: '0' }, outline: true, tagged: true };
  // 1. priechod: zisti strany kapitol podľa neviditeľných značiek
  const tmp = path.join(ROOT, 'tools/.tmp', `pass1-${lang}.pdf`);
  await page.pdf({ ...opts, path: tmp });
  const txt = spawnSync('pdftotext', ['-layout', tmp, '-'], { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 }).stdout;
  const pages = txt.split('\f');
  const pageOf = {};
  pages.forEach((p, i) => { for (const m of p.matchAll(/§§([a-z0-9-]+)§§/g)) if (!pageOf[m[1]]) pageOf[m[1]] = i + 1; });
  await page.evaluate(([map, pg]) => {
    document.querySelectorAll('.toc-page').forEach((el) => { el.textContent = map[el.dataset.id] || ''; });
    // čísla strán pri voľbách a krížových odkazoch (ako v knihe-hre)
    document.querySelectorAll('.ch-page').forEach((el) => { const n = map[el.dataset.id]; el.textContent = n ? ` · ${pg} ${n}` : ''; });
    document.querySelectorAll('.pdf-marker').forEach((el) => el.remove());
  }, [pageOf, t(UI.pageShort, lang)]);
  const out = path.join(DIST, 'downloads', `krizova-prirucka-${lang}.pdf`);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  await page.pdf({ ...opts, path: out });
  await page.close();
  return { out, pages: pages.length - 1, found: CHAPTERS.filter((c) => pageOf[c.id]).length };
}
function buildEpub(lang, chs, cover) {
  const strip = (s) => s.replace(/[\p{Extended_Pictographic}\u{1F1E6}-\u{1F1FF}\uFE0F\u200D]/gu, '').replace(/<span class="ch-label">([^<]*)<\/span>/g, '<span class="ch-label">$1</span> ');
  const body = chs.map((c) => strip(c.html.replace(/<div class="table-wrap">|<\/table><\/div>/g, (m) => (m.startsWith('</') ? '</table>' : '')))).join('\n');
  const src = path.join(ROOT, 'tools/.tmp', `epub-${lang}.html`);
  write(src, `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><title>${esc(t(BOOK_TITLE, lang))}</title></head><body>${body}</body></html>`);
  const out = path.join(DIST, 'downloads', `krizova-prirucka-${lang}.epub`);
  const r = spawnSync('pandoc', ['-f', 'html', '-t', 'epub3', src, '-o', out, '--toc', '--toc-depth=2', '--split-level=1',
    '--css', path.join(ROOT, 'src/css/epub.css'), '--epub-cover-image', cover,
    '--metadata', `title=${t(BOOK_TITLE, lang)}`, '--metadata', `subtitle=${t(BOOK_SUBTITLE, lang)}`, '--metadata', `lang=${lang}`,
    '--metadata', `date=${EDITION}`, '--metadata', 'author=Krízová príručka'], { encoding: 'utf8' });
  if (r.status !== 0) throw new Error(r.stderr);
  if (r.stderr.trim()) warn('pandoc epub: ' + r.stderr.trim().split('\n').slice(0, 3).join(' | '));
  return out;
}

// ---------- Service worker ----------
function listFiles(dir, base = dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
    const p = path.join(dir, d.name);
    return d.isDirectory() ? listFiles(p, base) : [path.relative(base, p).split(path.sep).join('/')];
  });
}
function buildServiceWorker() {
  const files = listFiles(DIST).filter((f) => !f.startsWith('downloads/') && f !== 'sw.js' && !f.endsWith('.map') && !f.endsWith('.txt') && !f.startsWith('.'));
  const hash = crypto.createHash('sha1');
  for (const f of files) hash.update(fs.readFileSync(path.join(DIST, f)));
  const version = hash.digest('hex').slice(0, 10);
  const sw = read(path.join(ROOT, 'src/sw.js')).replace('__VERSION__', version).replace('__PRECACHE__', JSON.stringify(files));
  write(path.join(DIST, 'sw.js'), sw);
  return { version, count: files.length };
}

// ---------- Hlavný beh ----------
async function main() {
  const t0 = Date.now();
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
    buildBook(lang, chs);
    buildSite(lang, chs);
    console.log(`✓ ${lang}: ${chs.length} kapitol, web`);
  }
  await withBrowser(async (browser) => {
    await renderIcons(browser);
    for (const lang of BUILD_LANGS) {
      if (!NO_PDF) { const r = await buildPdf(browser, lang); console.log(`✓ PDF ${lang}: ${r.pages} strán, kapitoly nájdené ${r.found}/${CHAPTERS.length}`); }
      if (!NO_EPUB) { const cover = await renderCover(browser, lang); buildEpub(lang, books[lang], cover); console.log(`✓ EPUB ${lang}`); }
    }
  });
  const sw = buildServiceWorker();
  console.log(`✓ service worker ${sw.version}, ${sw.count} súborov na offline`);
  if (warnings.size) console.log('Upozornenia:\n - ' + [...warnings].join('\n - '));
  console.log(`Hotovo za ${((Date.now() - t0) / 1000).toFixed(1)} s`);
}
main().catch((e) => { console.error(e); process.exit(1); });
