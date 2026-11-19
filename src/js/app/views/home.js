// Domovská obrazovka – iné rozloženie pre každý vzhľad (A dlaždice, B veľké tlačidlá, C kniha).
import { store } from '../store.js';
import { t, esc, LANG } from '../core.js';
import { buildTasks, readiness } from '../tasks.js';
import { activeTheme } from '../theme.js';
import { icon } from '../icons.js';
import { showInstallHint } from '../install.js';
import { backupDue } from '../store.js';

function state() {
  const p = store.profile;
  const tasks = buildTasks(p);
  const r = readiness(tasks, store.state);
  const next = tasks.find((x) => !(x.auto || store.state.tasksDone[x.id]));
  const name = (p.members || [])[0]?.name || '';
  return { p, r, next, name, done: store.state.wizardDone };
}




// Domov 1 (Zemité karty): zvislý dátum a zväzok kariet (hodiny, miesto, pripravenosť, rýchle akcie)
const timeText = () => new Date().toLocaleTimeString(LANG, { hour: '2-digit', minute: '2-digit', hour12: false });
function homeA(s) {
  const now = new Date();
  const month = now.toLocaleDateString(LANG, { month: 'long' });
  const dayLine = `${now.toLocaleDateString(LANG, { weekday: 'long' })} ${now.getDate()}`;
  const place = (s.p.location?.label || '').split(',')[0].trim();
  const cards = [
    ['#/teraz', 'bolt', 'home.crisisNow', 'home.crisisSub', 'a-urgent', 'crisis'],
    ['#/plan', 'flag', 'home.tPrepare', 'home.tPrepareSub', 'a-c1'],
    ['#/kniha', 'book', 'nav.book', 'home.tBookSub', 'a-c2'],
    ['#/mapa', 'pin', 'home.tMap', 'home.tMapSub', 'a-c3'],
    ['#/rodina', 'family', 'nav.family', 'home.tFamilySub', 'a-c4'],
  ];
  return `<div class="home-a">
<div class="a-date" aria-hidden="true"><span class="a-month">${esc(month)}</span><span class="a-day">${esc(dayLine)}</span></div>
<div class="a-stack">
<div class="a-tab a-clock" data-clock role="timer" aria-label="${esc(t('home.dClock'))}">${timeText()}</div>
<a class="a-tab a-place" href="${place ? '#/mapa' : '#/profil'}"><span class="a-ic">${icon('pin', 26)}</span><span class="a-lab">${esc(place || t('home.dPlace'))}</span></a>
${cards.map(([h, i, a, b, c, tour]) => `<a class="a-tab ${c}" href="${h}"${tour ? ` data-tour="${tour}"` : ''}><span class="a-ic">${icon(i, 26)}</span><span class="a-lab">${esc(t(a))}<small>${esc(t(b))}</small></span></a>`).join('')}
<a class="a-tab a-ready" href="${s.done ? '#/plan' : '#/profil'}" data-tour="ready"><span class="a-ic">${icon('check', 26)}</span><span class="a-lab">${esc(t('home.readiness'))}<small>${esc(s.done ? (s.next ? s.next.text : t('home.allDone')) : t('home.startWizard'))}</small></span><b>${s.r.pct} %</b><span class="ready-bar" role="meter" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${s.r.pct}"><span style="width:${s.r.pct}%"></span></span></a>
<a class="a-tab a-call" href="tel:112"><span class="a-ic">${icon('phone', 26)}</span><span class="a-lab">${esc(t('home.call112'))}</span></a>
</div>
<p class="a-foot muted">${esc(t('c.disclaimer'))}</p>
</div>`;
}

// Domov 2 (Dlaždice): mriežka dlaždíc (štýl Metro) – veľké tenké hodiny, Kríza teraz, rýchle akcie, pripravenosť
function homeB(s) {
  const now = new Date();
  const dateLine = now.toLocaleDateString(LANG, { weekday: 'long', day: 'numeric', month: 'long' });
  const place = (s.p.location?.label || '').split(',')[0].trim();
  const tiles = [
    ['#/plan', 'flag', 'home.tPrepare', 'home.tPrepareSub', 'b-fill'],
    ['#/kniha', 'book', 'nav.book', 'home.tBookSub', ''],
    ['#/mapa', 'pin', 'home.tMap', 'home.tMapSub', ''],
    ['#/rodina', 'family', 'nav.family', 'home.tFamilySub', 'b-fill'],
  ];
  return `<div class="home-b"><div class="b-grid">
<div class="b-tile b-wide b-clock"><span class="b-time" data-clock role="timer" aria-label="${esc(t('home.dClock'))}">${timeText()}</span><span class="b-date">${esc(dateLine)}</span>
<a class="b-place" href="${place ? '#/mapa' : '#/profil'}">${icon('pin', 16)} ${esc(place || t('home.dPlace'))}</a></div>
<a class="b-tile b-wide b-urgent" href="#/teraz" data-tour="crisis"><span class="b-lab">${esc(t('home.crisisNow'))}<small>${esc(t('home.crisisSub'))}</small></span>${icon('bolt', 44)}</a>
${tiles.map(([h, i, a, b, c], k) => `<a class="b-tile ${c}" href="${h}"${k === 0 ? ' data-tour="tiles"' : ''}>${icon(i, 30)}<span class="b-lab">${esc(t(a))}<small>${esc(t(b))}</small></span></a>`).join('')}
<a class="b-tile b-wide b-ready" href="${s.done ? '#/plan' : '#/profil'}" data-tour="ready"><span class="b-pct">${s.r.pct}<small style="font-size:1.2rem"> %</small></span><span class="b-lab">${esc(t('home.readiness'))}<small>${esc(s.done ? (s.next ? s.next.text : t('home.allDone')) : t('home.startWizard'))}</small></span>${icon('next', 22)}<span class="ready-bar" role="meter" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${s.r.pct}"><span style="width:${s.r.pct}%"></span></span></a>
<div class="b-mini">
<a class="b-tile b-call" href="tel:112">${icon('phone', 24)}<span class="b-lab">${esc(t('home.call112'))}</span></a>
<a class="b-tile" href="#/pomoc">${icon('help', 24)}<span class="b-lab">${esc(t('nav.help'))}</span></a>
<a class="b-tile" href="#/nastavenia">${icon('settings', 24)}<span class="b-lab">${esc(t('nav.settings'))}</span></a>
</div></div>
<p class="b-foot muted">${esc(t('c.disclaimer'))}</p></div>`;
}

export function render(el) {
  const s = state();
  const look = activeTheme();
  // pripomienka inštalácie pre toho, kto pri prvom otvorení zvolil prehliadač
  const hint = showInstallHint() ? `<div class="install-hint" role="note">${icon('mobile', 22)}<span>${esc(t('inst.hint'))}</span><a class="btn btn-sm" href="#/instalacia/navod">${esc(t('inst.hintBtn'))}</a><button type="button" class="hint-x" data-hint-off aria-label="${esc(t('c.close'))}">${icon('close', 18)}</button></div>` : '';
  // pripomienka zálohy údajov (nikdy nezálohované, alebo záloha staršia ako 30 dní)
  const bkHint = !hint && backupDue() ? `<div class="install-hint" role="note">${icon('shield', 22)}<span>${esc(t('bk.hint'))}</span><a class="btn btn-sm" href="#/nastavenia/zaloha">${esc(t('bk.hintBtn'))}</a><button type="button" class="hint-x" data-bk-off aria-label="${esc(t('c.close'))}">${icon('close', 18)}</button></div>` : '';
  el.innerHTML = hint + bkHint + (look === 'b' ? homeB(s) : homeA(s));
  el.addEventListener('click', (e) => {
    if (e.target.closest('[data-bk-off]')) { store.prefs.backupSnooze = Date.now() + 14 * 864e5; store.savePrefs(); el.querySelector('.install-hint')?.remove(); return; }
    if (e.target.closest('[data-hint-off]')) { store.prefs.installHintOff = true; store.savePrefs(); el.querySelector('.install-hint')?.remove(); return; }
  });
  // živé hodiny
  const clock = el.querySelector('[data-clock]');
  if (!clock) return undefined;
  const id = setInterval(() => { if (clock.isConnected) clock.textContent = timeText(); }, 15000);
  return () => clearInterval(id);
}
