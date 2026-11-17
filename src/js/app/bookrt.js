// Kniha-hra v aplikácii: profil čitateľa, voľby „pre teba“, odporúčania, prečítané kapitoly,
// návrat na poslednú voľbu a prehrávač príbehových scenárov.
import { tagsFromProfile } from '../../data/reader.js';
import { store } from './store.js';

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
function load(key, def, st = localStorage) { try { return JSON.parse(st.getItem(key)) ?? def; } catch { return def; } }
function save(key, val, st = localStorage) { try { st.setItem(key, JSON.stringify(val)); } catch { /* súkromný režim */ } }
const fill = (s, vars) => s.replace(/\{(\w+)\}/g, (m, k) => vars[k] ?? m);
export const chHref = (ch, id) => `#/kniha/${ch}${id && id !== ch ? '/' + id : ''}`;

function nearestNppKm(loc, list) {
  if (loc?.lat == null) return null;
  const rad = Math.PI / 180;
  let best = Infinity;
  for (const [la, lo] of list) {
    const d = 2 * 6371 * Math.asin(Math.sqrt(Math.sin(((la - loc.lat) * rad) / 2) ** 2 + Math.cos(loc.lat * rad) * Math.cos(la * rad) * Math.sin(((lo - loc.lon) * rad) / 2) ** 2));
    best = Math.min(best, d);
  }
  return best;
}

// ---- Profil čitateľa ----
export function readerProfile(D) {
  const profile = store.profile;
  const hasProfile = store.state.wizardDone && profile?.members?.length;
  let reader = load('kp.reader', null);
  if (!reader && hasProfile) reader = { tags: tagsFromProfile(profile, nearestNppKm(profile.location, D.npp)), src: 'app' };
  return reader || { tags: [], src: 'manual' };
}
export const readMap = () => load('kp.read', {});
export function markRead(ch) { const r = readMap(); r[ch] = Date.now(); save('kp.read', r); }
export function resetRead() { save('kp.read', {}); }

// Výber značiek čitateľa (domácnosť s deťmi, v byte, bez auta…)
export function readerEditor(host, D, onChange) {
  const S = D.s;
  let reader = readerProfile(D);
  const has = (t) => reader.tags.includes(t);
  const draw = () => {
    host.innerHTML = `<div class="tagchips" role="group" aria-label="${esc(S.personalise)}">${D.tags.map((x) => `<button type="button" class="chip" data-tag="${x.id}" aria-pressed="${has(x.id)}">${x.icon} ${esc(x.name)}</button>`).join('')}</div>
${store.state.wizardDone ? `<p><button type="button" class="btn btn-ghost btn-sm" data-from-app>${esc(S.fromApp)}</button></p>` : ''}`;
  };
  draw();
  host.addEventListener('click', (e) => {
    const b = e.target.closest('[data-tag]');
    if (b) {
      const id = b.dataset.tag;
      reader.tags = has(id) ? reader.tags.filter((x) => x !== id) : [...reader.tags, id];
      // protichodné značky
      const pairs = { car: 'nocar', nocar: 'car', flat: 'house', house: 'flat' };
      if (has(id) && pairs[id]) reader.tags = reader.tags.filter((x) => x !== pairs[id]);
      reader.src = 'manual';
      save('kp.reader', reader);
      draw(); onChange?.(reader);
    }
    if (e.target.closest('[data-from-app]')) {
      reader = { tags: tagsFromProfile(store.profile, nearestNppKm(store.profile.location, D.npp)), src: 'app' };
      save('kp.reader', reader);
      draw(); onChange?.(reader);
    }
  });
}

// ---- Voľby „pre teba“ v texte kapitoly ----
export function applyChoices(root, D) {
  const reader = readerProfile(D);
  const has = (t) => reader.tags.includes(t);
  $$('.choices a[data-if]', root).forEach((a) => {
    const tags = a.dataset.if.split(' ');
    const match = tags.some(has);
    a.classList.toggle('match', match);
    a.classList.toggle('dim', !match && reader.tags.length > 0);
    let badge = $('.you', a);
    if (match && !badge) { badge = document.createElement('span'); badge.className = 'you'; badge.textContent = '✓ ' + D.s.forYou; a.querySelector('.ch-t')?.after(badge); }
    if (!match && badge) badge.remove();
  });
}

// ---- Návrat na poslednú voľbu (ako prst vložený do knihy-hry) ----
export function rememberChoices(root, ch, title) {
  $$('.choices a', root).forEach((a) => a.addEventListener('click', () => {
    const nav = a.closest('.choices');
    save('kp.back', { href: chHref(ch, nav.id), ch, title }, sessionStorage);
  }));
}
export function backPillHtml(D, ch, anchor) {
  const back = load('kp.back', null, sessionStorage);
  if (!back || (back.ch === ch && (anchor || '').startsWith('volba-'))) return '';
  return `<div class="back-pill no-print"><a href="${esc(back.href)}" data-back-pill>↩ ${esc(D.s.back)}<small>${esc(back.title)}</small></a><button type="button" data-back-close aria-label="×">×</button></div>`;
}
export function bindBackPill(root) {
  root.addEventListener('click', (e) => {
    if (e.target.closest('[data-back-pill]') || e.target.closest('[data-back-close]')) {
      sessionStorage.removeItem('kp.back');
      if (e.target.closest('[data-back-close]')) e.target.closest('.back-pill')?.remove();
    }
  });
}

// ---- Odporúčania na konci kapitoly ----
export function recommendHtml(D, ch) {
  const reader = readerProfile(D);
  const read = readMap();
  const tagById = Object.fromEntries(D.tags.map((x) => [x.id, x]));
  const items = [];
  const seen = new Set();
  const push = (id, why) => {
    const sec = D.sections[id];
    if (!sec || seen.has(id) || sec.ch === ch || read[sec.ch]) return;
    seen.add(id);
    items.push({ href: chHref(sec.ch, id), text: `${sec.label ? sec.label + ' › ' : ''}${sec.text}`, why });
  };
  for (const tg of reader.tags) for (const id of D.rec[tg] || []) push(id, `${tagById[tg]?.icon || ''} ${tagById[tg]?.name || ''}`);
  const crisis = D.crisisOf[ch];
  const sc = crisis && D.scen[crisis];
  const played = load('kp.scen', {});
  const list = items.slice(0, 4);
  if (sc && !played[sc.id]) list.unshift({ href: chHref('scenare', 'scenar-' + sc.id), text: sc.title, why: '🎲' });
  if (!list.length) return '';
  return `<aside class="recommend no-print"><h2>🧭 ${esc(D.s.recTitle)}</h2><ul>${list.map((x) => `<li><a href="${esc(x.href)}">${esc(x.text)}</a> <small class="muted">${esc(x.why)}</small></li>`).join('')}</ul></aside>`;
}

// ---- Prehrávač scenárov (v kapitole „scenare“) ----
export function initPlayers(root, list, S) {
  const results = load('kp.scen', {});
  for (const sc of list) {
    const host = root.querySelector(`[data-player="${sc.id}"]`);
    const paper = root.querySelector(`[data-gamebook="${sc.id}"]`);
    if (!host) continue;
    // verzia na papier je na obrazovke zbalená, v tlači a PDF zostáva celá
    if (paper) {
      paper.classList.add('collapsed');
      const tg = document.createElement('button');
      tg.type = 'button'; tg.className = 'btn btn-ghost btn-sm gb-toggle no-print';
      tg.textContent = '📖 ' + S.paper;
      tg.addEventListener('click', () => { const c = paper.classList.toggle('collapsed'); tg.textContent = (c ? '📖 ' + S.paper : '✕ ' + S.hidePaper); });
      paper.before(tg);
    }
    const intro = () => {
      const r = results[sc.id];
      host.innerHTML = `<div class="sc-card"><button type="button" class="btn" data-play>${esc(r ? S.replay : S.play)}</button>${r ? ` <span class="badge">✓ ${esc(S.played)}: ${r.good}/${r.total}</span>` : ''}</div>`;
    };
    let cur, path;
    const node = (id) => sc.nodes[id];
    const show = () => {
      const n = node(cur);
      const step = path.filter((x) => x.decision).length + 1;
      const verdict = n.v ? `<p class="pl-v ${n.v}">${n.v === 'good' ? '✔ ' + esc(S.good) : '✖ ' + esc(S.bad)}</p>` : '';
      const tip = n.tip ? `<p class="pl-tip">💡 ${esc(n.tip.text)} ${n.tip.href ? `<a href="${esc(n.tip.href)}">→ ${esc(n.tip.ref || '')}</a>` : ''}</p>` : '';
      if (n.end) { host.innerHTML = `<div class="player end">${verdict}<p class="pl-text">${esc(n.text)}</p>${tip}${resultHtml()}</div>`; finish(); return; }
      const choices = n.choices.map((c, i) => `<button type="button" class="pl-choice" data-to="${c.to}" data-i="${i}">${esc(c.text || S.cont)} →</button>`).join('');
      host.innerHTML = `<div class="player"><p class="pl-step">${esc(sc.icon)} ${esc(S.step)} ${step}</p>${verdict}<p class="pl-text">${esc(n.text)}</p>${tip}<div class="pl-choices">${choices}</div></div>`;
      host.querySelector('.pl-choice')?.focus({ preventScroll: true });
    };
    const resultHtml = () => {
      const g = path.filter((x) => x.v === 'good').length;
      const b = path.filter((x) => x.v === 'bad');
      const total = g + b.length;
      const ratio = total ? g / total : 1;
      const msg = ratio >= 0.85 ? S.resGreat : ratio >= 0.5 ? S.resOk : S.resBad;
      const tips = b.map((x) => node(x.id).tip).filter(Boolean);
      const others = list.filter((x) => x.id !== sc.id).map((x) => `<a href="${chHref('scenare', 'scenar-' + x.id)}">${esc(x.icon)} ${esc(x.title)}</a>`).join(' · ');
      return `<div class="pl-result"><h3>${esc(S.resultTitle)}</h3><p class="pl-score">${esc(fill(S.result, { g, n: total }))}</p><p>${esc(msg)}</p>
${tips.length ? `<h4>${esc(S.learn)}</h4><ul>${tips.map((tp) => `<li>${esc(tp.text)} ${tp.href ? `<a href="${esc(tp.href)}">→ ${esc(tp.ref || '')}</a>` : ''}</li>`).join('')}</ul>` : ''}
<h4>${esc(S.prepare)}</h4><ul class="pl-prep">${sc.prepare.map((x) => `<li>☐ ${esc(x)}</li>`).join('')}</ul>
<p><button type="button" class="btn" data-play>${esc(S.replay)}</button></p><p class="small">${esc(S.other)}: ${others}</p></div>`;
    };
    const finish = () => {
      const g = path.filter((x) => x.v === 'good').length;
      const total = path.filter((x) => x.v).length;
      results[sc.id] = { good: g, total, ts: Date.now() };
      save('kp.scen', results);
    };
    host.addEventListener('click', (e) => {
      if (e.target.closest('[data-play]')) { cur = 'start'; path = []; show(); host.scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
      const c = e.target.closest('[data-to]');
      if (c) {
        const from = node(cur);
        cur = c.dataset.to;
        path.push({ id: cur, v: node(cur).v, decision: from.choices.length > 1 });
        show();
      }
    });
    intro();
  }
}

// Kontrolné zoznamy v texte (☐) – odškrtávanie s uložením
export function bindChecklists(root, keyPrefix) {
  const checks = load('kp.checks', {});
  $$('ul.checklist', root).forEach((ul, listIdx) => {
    const block = ul.closest('[data-persist]') || ul.closest('.checklist-block');
    const key = block?.dataset.persist || block?.id || `${keyPrefix}#${listIdx}`;
    const state = checks[key] || [];
    $$('li', ul).forEach((li, i) => {
      const cb = $('.cb', li);
      if (!cb) return;
      li.tabIndex = 0;
      li.setAttribute('role', 'checkbox');
      const set = (on) => { li.classList.toggle('done', on); cb.textContent = on ? '☑' : '☐'; li.setAttribute('aria-checked', String(on)); };
      set(!!state[i]);
      const toggle = () => {
        const s = checks[key] || [];
        s[i] = !s[i];
        checks[key] = s;
        save('kp.checks', checks);
        set(s[i]);
      };
      li.addEventListener('click', (e) => { if (e.target.closest('a')) return; toggle(); });
      li.addEventListener('keydown', (e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); toggle(); } });
    });
  });
}
