// Domovská obrazovka – iné rozloženie pre každý vzhľad (A dlaždice, B veľké tlačidlá, C kniha).
import { store } from '../store.js';
import { t, T, esc, LANG } from '../core.js';
import { riskProfile } from '../../calc.js';
import { crisisById, CRISES } from '../../../data/crises.js';
import { buildTasks, readiness } from '../tasks.js';
import { activeTheme } from '../theme.js';
import { icon } from '../icons.js';
import { VERSION } from '../../../data/version.js';
import { LANGS as LANG_INFO } from '../../../data/ui.js';
import { bookFile, fmtSize } from '../downloads.js';

function state() {
  const p = store.profile;
  const tasks = buildTasks(p);
  const r = readiness(tasks, store.state);
  const risk = riskProfile(p);
  const next = tasks.find((x) => !(x.auto || store.state.tasksDone[x.id]));
  const name = (p.members || [])[0]?.name || '';
  return { p, r, risk, next, name, done: store.state.wizardDone };
}

const readyCard = (s) => `<section class="ready-card" aria-label="${esc(t('home.readiness'))}" data-tour="ready">
  <div class="rc-top"><span>${esc(t('home.readiness'))}</span><b>${s.r.pct} %</b></div>
  <div class="ready-bar" role="meter" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${s.r.pct}"><span style="width:${s.r.pct}%"></span></div>
  <span class="small muted">${s.done ? (s.next ? `${esc(t('home.nextStep'))}: ${esc(s.next.text)}` : esc(t('home.allDone'))) : esc(t('home.intro'))}</span>
  <a class="btn btn-sm ${s.done ? 'btn-ghost' : ''}" href="${s.done ? '#/plan' : '#/profil'}">${esc(s.done ? t('home.openPlan') : t('home.startWizard'))}</a>
</section>`;

function homeA(s) {
  const tiles = [
    ['#/plan', 'list', 'home.tPrepare', 'home.tPrepareSub'],
    ['#/kniha', 'book', 'nav.book', 'home.tBookSub'],
    ['#/mapa', 'pin', 'home.tMap', 'home.tMapSub'],
    ['#/rodina', 'family', 'nav.family', 'home.tFamilySub'],
  ];
  const top = s.risk.list.slice(0, 4);
  return `<div class="home-a">
<div class="greet"><p>${esc(s.name ? t('home.helloName', { name: s.name }) : t('home.hello'))}</p><h1>${esc(t('home.question'))}</h1></div>
<a class="crisis-cta" href="#/teraz" data-tour="crisis"><span class="cta-ico">${icon('bolt', 28)}</span><span class="cta-text"><strong>${esc(t('home.crisisNow'))}</strong><span class="sub">${esc(t('home.crisisSub'))}</span></span>${icon('next', 22)}</a>
<div class="tile-grid" data-tour="tiles">${tiles.map(([h, i, a, b]) => `<a class="tile" href="${h}">${icon(i, 26)}<strong>${esc(t(a))}</strong><small>${esc(t(b))}</small></a>`).join('')}</div>
${readyCard(s)}
${top.length ? `<section><h2 class="section-title">${esc(t('home.topRisks'))}</h2><div class="risk-chips">${top.map((x) => { const c = crisisById(x.id); return `<a class="risk-chip" href="#/teraz/${x.id}">${c.icon} ${esc(T(c.name))}</a>`; }).join('')}</div></section>` : ''}
<p class="small muted">${esc(t('c.disclaimer'))}</p>
</div>`;
}

function homeB(s) {
  const items = [
    ['#/plan', 'list', 'home.bPrepare'],
    ['#/kniha', 'download', 'home.bBook'],
    ['#/mapa', 'pin', 'home.bMap'],
    ['#/rodina', 'family', 'nav.family'],
    ['#/pomoc', 'help', 'nav.help'],
  ];
  return `<div class="home-b">
<p class="status">${icon('check', 18)} ${esc(t('home.offlineReady'))}</p>
<a class="big-crisis" href="#/teraz" data-tour="crisis">${icon('bolt', 40)}<strong>${esc(t('home.crisisNow'))}</strong><span>${esc(t('home.crisisSubB'))}</span></a>
<ul class="big-list" data-tour="tiles">${items.map(([h, i, k]) => `<li><a href="${h}">${icon(i, 28)}<span>${esc(t(k))}</span>${icon('next', 22)}</a></li>`).join('')}</ul>
<section class="ready-card" data-tour="ready"><div class="rc-top"><span>${esc(t('home.readiness'))}</span><b>${s.r.pct} %</b></div><div class="ready-bar"><span style="width:${s.r.pct}%"></span></div>
<a class="btn btn-sm btn-ghost" href="${s.done ? '#/plan' : '#/profil'}">${esc(s.done ? t('home.openPlan') : t('home.startWizard'))}</a></section>
<a class="big-call" href="tel:112">${icon('phone', 26)} ${esc(t('home.call112'))}</a>
</div>`;
}

function homeC(s) {
  const langs = LANG_INFO.filter((l) => bookFile(l.id, 'pdf'));
  const pdfLang = langs.some((l) => l.id === LANG) ? LANG : langs[0]?.id;
  const pdf = pdfLang && bookFile(pdfLang, 'pdf');
  const top = s.risk.list.slice(0, 4).map((x) => x.id);
  const chips = (top.length ? top : ['flood', 'blackout', 'fire', 'chemical']).map((id) => crisisById(id)).filter(Boolean);
  return `<div class="home-c">
<header style="display:flex;justify-content:space-between;align-items:flex-start;gap:1rem">
  <div><h1>${esc(t('app.title'))}</h1><p class="sub">${esc(t('home.cSub'))} · ${esc(VERSION)}</p></div>
  <a class="hdr-btn" href="#/pomoc" aria-label="${esc(t('nav.help'))}">${icon('help', 22)}</a>
</header>
<form class="search-box" data-search role="search">${icon('search', 20)}<label class="visually-hidden" for="home-q">${esc(t('book.search'))}</label><input id="home-q" type="search" placeholder="${esc(t('home.searchPh'))}" autocomplete="off"></form>
<section class="now-panel" data-tour="crisis"><h2>${esc(t('home.cNow'))}</h2>
<div class="now-chips">${chips.map((c) => `<a href="#/teraz/${c.id}">${c.icon} ${esc(T(c.name))}</a>`).join('')}<a class="more" href="#/teraz">${esc(t('home.cMore', { n: CRISES.length }))}</a></div></section>
<section class="book-card" data-tour="tiles"><div class="book-cover" aria-hidden="true">${esc(t('app.title'))}</div>
<div class="bc-body"><span class="bc-title">${esc(t('home.cBook'))}</span>
${pdf ? `<span class="small muted">${esc(t('home.cBookMeta', { pages: pdf.pages || '–', size: fmtSize(pdf.size, LANG) }))}</span>
<div class="lang-pick" role="group" aria-label="${esc(t('book.pdfLang'))}">${langs.map((l) => `<button type="button" data-pdf-lang="${l.id}" aria-pressed="${l.id === pdfLang}">${l.short}</button>`).join('')}</div>
<a class="btn btn-sm" data-pdf-link href="${esc(pdf.file)}" download>${icon('download', 18)} ${esc(t('book.downloadPdf'))}</a>` : `<p class="small muted">${esc(t('book.noPdf'))}</p>`}
<a class="small" href="#/kniha">${esc(t('home.cRead'))} →</a></div></section>
<nav class="mini-grid" aria-label="${esc(t('home.tPrepare'))}">
<a href="#/zasoby">${icon('box', 26)}${esc(t('nav.supplies'))}</a><a href="#/mapa">${icon('pin', 26)}${esc(t('home.cShelters'))}</a><a href="#/rodina">${icon('family', 26)}${esc(t('home.cFamily'))}</a></nav>
${readyCard(s)}
</div>`;
}

export function render(el) {
  const s = state();
  const look = activeTheme();
  el.innerHTML = look === 'b' ? homeB(s) : look === 'c' ? homeC(s) : homeA(s);
  el.addEventListener('submit', (e) => {
    if (!e.target.matches('[data-search]')) return;
    e.preventDefault();
    const q = e.target.querySelector('input').value.trim();
    if (q) location.hash = `#/kniha/hladat/${encodeURIComponent(q)}`;
  });
  el.addEventListener('click', (e) => {
    const b = e.target.closest('[data-pdf-lang]');
    if (!b) return;
    const f = bookFile(b.dataset.pdfLang, 'pdf');
    el.querySelectorAll('[data-pdf-lang]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    const a = el.querySelector('[data-pdf-link]');
    if (a && f) a.href = f.file;
  });
}
