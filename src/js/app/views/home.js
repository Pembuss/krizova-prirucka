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
import { showInstallHint } from '../install.js';
import { backupDue } from '../store.js';

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

// Domov D: zvislý dátum a zväzok kariet (hodiny, miesto, pripravenosť, rýchle akcie)
const timeText = () => new Date().toLocaleTimeString(LANG, { hour: '2-digit', minute: '2-digit', hour12: false });
function homeD(s) {
  const now = new Date();
  const month = now.toLocaleDateString(LANG, { month: 'long' });
  const dayLine = `${now.toLocaleDateString(LANG, { weekday: 'long' })} ${now.getDate()}`;
  const place = (s.p.location?.label || '').split(',')[0].trim();
  const cards = [
    ['#/teraz', 'bolt', 'home.crisisNow', 'home.crisisSub', 'd-urgent', 'crisis'],
    ['#/plan', 'flag', 'home.tPrepare', 'home.tPrepareSub', 'd-c1'],
    ['#/kniha', 'book', 'nav.book', 'home.tBookSub', 'd-c2'],
    ['#/mapa', 'pin', 'home.tMap', 'home.tMapSub', 'd-c3'],
    ['#/rodina', 'family', 'nav.family', 'home.tFamilySub', 'd-c4'],
  ];
  return `<div class="home-d">
<div class="d-date" aria-hidden="true"><span class="d-month">${esc(month)}</span><span class="d-day">${esc(dayLine)}</span></div>
<div class="d-stack">
<div class="d-tab d-clock" data-clock role="timer" aria-label="${esc(t('home.dClock'))}">${timeText()}</div>
<a class="d-tab d-place" href="${place ? '#/mapa' : '#/profil'}"><span class="d-ic">${icon('pin', 26)}</span><span class="d-lab">${esc(place || t('home.dPlace'))}</span></a>
${cards.map(([h, i, a, b, c, tour]) => `<a class="d-tab ${c}" href="${h}"${tour ? ` data-tour="${tour}"` : ''}><span class="d-ic">${icon(i, 26)}</span><span class="d-lab">${esc(t(a))}<small>${esc(t(b))}</small></span></a>`).join('')}
<a class="d-tab d-ready" href="${s.done ? '#/plan' : '#/profil'}" data-tour="ready"><span class="d-ic">${icon('check', 26)}</span><span class="d-lab">${esc(t('home.readiness'))}<small>${esc(s.done ? (s.next ? s.next.text : t('home.allDone')) : t('home.startWizard'))}</small></span><b>${s.r.pct} %</b><span class="ready-bar" role="meter" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${s.r.pct}"><span style="width:${s.r.pct}%"></span></span></a>
<a class="d-tab d-call" href="tel:112"><span class="d-ic">${icon('phone', 26)}</span><span class="d-lab">${esc(t('home.call112'))}</span></a>
</div>
<p class="d-foot muted">${esc(t('c.disclaimer'))}</p>
</div>`;
}

// Domov E: mriežka dlaždíc (štýl Metro) – veľké tenké hodiny, Kríza teraz, rýchle akcie, pripravenosť
function homeE(s) {
  const now = new Date();
  const dateLine = now.toLocaleDateString(LANG, { weekday: 'long', day: 'numeric', month: 'long' });
  const place = (s.p.location?.label || '').split(',')[0].trim();
  const tiles = [
    ['#/plan', 'flag', 'home.tPrepare', 'home.tPrepareSub', 'e-fill'],
    ['#/kniha', 'book', 'nav.book', 'home.tBookSub', ''],
    ['#/mapa', 'pin', 'home.tMap', 'home.tMapSub', ''],
    ['#/rodina', 'family', 'nav.family', 'home.tFamilySub', 'e-fill'],
  ];
  return `<div class="home-e"><div class="e-grid">
<div class="e-tile e-wide e-clock"><span class="e-time" data-clock role="timer" aria-label="${esc(t('home.dClock'))}">${timeText()}</span><span class="e-date">${esc(dateLine)}</span>
<a class="e-place" href="${place ? '#/mapa' : '#/profil'}">${icon('pin', 16)} ${esc(place || t('home.dPlace'))}</a></div>
<a class="e-tile e-wide e-urgent" href="#/teraz" data-tour="crisis"><span class="e-lab">${esc(t('home.crisisNow'))}<small>${esc(t('home.crisisSub'))}</small></span>${icon('bolt', 44)}</a>
${tiles.map(([h, i, a, b, c], k) => `<a class="e-tile ${c}" href="${h}"${k === 0 ? ' data-tour="tiles"' : ''}>${icon(i, 30)}<span class="e-lab">${esc(t(a))}<small>${esc(t(b))}</small></span></a>`).join('')}
<a class="e-tile e-wide e-ready" href="${s.done ? '#/plan' : '#/profil'}" data-tour="ready"><span class="e-pct">${s.r.pct}<small style="font-size:1.2rem"> %</small></span><span class="e-lab">${esc(t('home.readiness'))}<small>${esc(s.done ? (s.next ? s.next.text : t('home.allDone')) : t('home.startWizard'))}</small></span>${icon('next', 22)}<span class="ready-bar" role="meter" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${s.r.pct}"><span style="width:${s.r.pct}%"></span></span></a>
<div class="e-mini">
<a class="e-tile e-call" href="tel:112">${icon('phone', 24)}<span class="e-lab">${esc(t('home.call112'))}</span></a>
<a class="e-tile" href="#/pomoc">${icon('help', 24)}<span class="e-lab">${esc(t('nav.help'))}</span></a>
<a class="e-tile" href="#/nastavenia">${icon('settings', 24)}<span class="e-lab">${esc(t('nav.settings'))}</span></a>
</div></div>
<p class="e-foot muted">${esc(t('c.disclaimer'))}</p></div>`;
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
  // pripomienka inštalácie pre toho, kto pri prvom otvorení zvolil prehliadač
  const hint = showInstallHint() ? `<div class="install-hint" role="note">${icon('mobile', 22)}<span>${esc(t('inst.hint'))}</span><a class="btn btn-sm" href="#/instalacia/navod">${esc(t('inst.hintBtn'))}</a><button type="button" class="hint-x" data-hint-off aria-label="${esc(t('c.close'))}">${icon('close', 18)}</button></div>` : '';
  // pripomienka zálohy údajov (nikdy nezálohované, alebo záloha staršia ako 30 dní)
  const bkHint = !hint && backupDue() ? `<div class="install-hint" role="note">${icon('shield', 22)}<span>${esc(t('bk.hint'))}</span><a class="btn btn-sm" href="#/nastavenia/zaloha">${esc(t('bk.hintBtn'))}</a><button type="button" class="hint-x" data-bk-off aria-label="${esc(t('c.close'))}">${icon('close', 18)}</button></div>` : '';
  el.innerHTML = hint + bkHint + (look === 'b' ? homeB(s) : look === 'c' ? homeC(s) : look === 'd' ? homeD(s) : look === 'e' ? homeE(s) : homeA(s));
  el.addEventListener('submit', (e) => {
    if (!e.target.matches('[data-search]')) return;
    e.preventDefault();
    const q = e.target.querySelector('input').value.trim();
    if (q) location.hash = `#/kniha/hladat/${encodeURIComponent(q)}`;
  });
  el.addEventListener('click', (e) => {
    if (e.target.closest('[data-bk-off]')) { store.prefs.backupSnooze = Date.now() + 14 * 864e5; store.savePrefs(); el.querySelector('.install-hint')?.remove(); return; }
    if (e.target.closest('[data-hint-off]')) { store.prefs.installHintOff = true; store.savePrefs(); el.querySelector('.install-hint')?.remove(); return; }
    const b = e.target.closest('[data-pdf-lang]');
    if (!b) return;
    const f = bookFile(b.dataset.pdfLang, 'pdf');
    el.querySelectorAll('[data-pdf-lang]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    const a = el.querySelector('[data-pdf-link]');
    if (a && f) a.href = f.file;
  });
  // živé hodiny vo vzhľade D
  const clock = el.querySelector('[data-clock]');
  if (!clock) return undefined;
  const id = setInterval(() => { if (clock.isConnected) clock.textContent = timeText(); }, 15000);
  return () => clearInterval(id);
}
