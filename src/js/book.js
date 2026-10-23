// Kniha-hra na webe: profil čitateľa, voľby „pre teba“, odporúčania, prečítané kapitoly,
// návrat na poslednú voľbu a prehrávač príbehových scenárov.
import { tagsFromProfile } from '../data/reader.js';

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
function load(key, def, store = localStorage) { try { return JSON.parse(store.getItem(key)) ?? def; } catch { return def; } }
function save(key, val, store = localStorage) { try { store.setItem(key, JSON.stringify(val)); } catch { /* súkromný režim */ } }
const fill = (s, vars) => s.replace(/\{(\w+)\}/g, (m, k) => vars[k] ?? m);

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

export function initBook() {
  const dataEl = document.getElementById('book-data');
  if (!dataEl) return;
  const D = JSON.parse(dataEl.textContent);
  const S = D.s;
  const tagById = Object.fromEntries(D.tags.map((x) => [x.id, x]));
  const profile = load('kp.profile', null);
  const appTags = () => tagsFromProfile(profile, nearestNppKm(profile?.location, D.npp));
  let reader = load('kp.reader', null);
  if (!reader && profile?.members) reader = { tags: appTags(), src: 'app' };
  reader ||= { tags: [], src: 'manual' };
  const has = (t) => reader.tags.includes(t);

  // ---- Prečítané kapitoly ----
  const read = load('kp.read', {});
  if (D.ch) { read[D.ch] = Date.now(); save('kp.read', read); }
  $$('.book-toc a').forEach((a) => {
    const id = (a.getAttribute('href') || '').replace(/^.*\//, '').replace(/\.html.*$/, '');
    if (read[id]) a.classList.add('read');
  });

  // ---- Editor profilu čitateľa ----
  function editorHtml() {
    return `<div class="tagchips" role="group" aria-label="${esc(S.personalise)}">${D.tags.map((x) => `<button type="button" class="chip" data-tag="${x.id}" aria-pressed="${has(x.id)}">${x.icon} ${esc(x.name)}</button>`).join('')}</div>
${profile?.members ? `<p><button type="button" class="btn btn-ghost btn-sm" data-from-app>👪 ${esc(S.fromApp)}</button></p>` : ''}`;
  }
  function bindEditor(host, after) {
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
        $$('[data-tag]', host).forEach((c) => c.setAttribute('aria-pressed', String(has(c.dataset.tag))));
        applyChoices(); renderRecommend(); after?.();
      }
      if (e.target.closest('[data-from-app]')) {
        reader = { tags: appTags(), src: 'app' };
        save('kp.reader', reader);
        $$('[data-tag]', host).forEach((c) => c.setAttribute('aria-pressed', String(has(c.dataset.tag))));
        applyChoices(); renderRecommend(); after?.();
      }
    });
  }
  const summary = () => (reader.tags.length ? reader.tags.map((x) => `<span class="rtag">${tagById[x]?.icon || ''} ${esc(tagById[x]?.name || x)}</span>`).join('') : `<span class="muted">${esc(S.none)}</span>`);

  // Lišta v kapitole
  const bar = $('[data-reader-bar]');
  if (bar) {
    const drawBar = () => {
      bar.innerHTML = `<div class="rb-row"><span class="rb-title">🎯 ${esc(reader.tags.length ? S.readingAs : S.personalise)}:</span> <span class="rb-tags">${summary()}</span> <button type="button" class="btn btn-ghost btn-sm" data-rb-edit aria-expanded="false">${esc(S.edit)}</button></div><div class="rb-editor" hidden><p class="small muted">${esc(S.personaliseHint)}</p>${editorHtml()}<button type="button" class="btn btn-sm" data-rb-done>${esc(S.done)}</button></div>`;
      bindEditor($('.rb-editor', bar), () => { $('.rb-tags', bar).innerHTML = summary(); });
    };
    drawBar();
    bar.addEventListener('click', (e) => {
      if (e.target.closest('[data-rb-edit]') || e.target.closest('[data-rb-done]')) {
        const ed = $('.rb-editor', bar);
        ed.hidden = !ed.hidden;
        $('[data-rb-edit]', bar).setAttribute('aria-expanded', String(!ed.hidden));
      }
    });
  }
  // Panel na úvodnej stránke knihy
  const panel = $('[data-reader-panel]');
  if (panel) {
    const total = D.order.length;
    const drawPanel = () => {
      const n = D.order.filter((id) => read[id]).length;
      panel.innerHTML = `<h2>🎯 ${esc(S.personalise)}</h2><p class="muted">${esc(S.personaliseHint)}</p>${editorHtml()}
<p class="progress-line"><strong>${esc(S.read)}:</strong> ${n} ${esc(S.of)} ${total} <span class="meter" aria-hidden="true"><span style="width:${Math.round((n / total) * 100)}%"></span></span>${n ? ` <button type="button" class="btn btn-ghost btn-sm" data-reset-read>${esc(S.resetRead)}</button>` : ''}</p>`;
    };
    drawPanel();
    bindEditor(panel);
    panel.addEventListener('click', (e) => {
      if (e.target.closest('[data-reset-read]')) { save('kp.read', {}); for (const k of Object.keys(read)) delete read[k]; $$('.book-toc a.read').forEach((a) => a.classList.remove('read')); drawPanel(); }
    });
  }

  // ---- Voľby: zvýraznenie „pre teba“ ----
  function applyChoices() {
    $$('.choices a[data-if]').forEach((a) => {
      const tags = a.dataset.if.split(' ');
      const match = tags.some(has);
      a.classList.toggle('match', match);
      a.classList.toggle('dim', !match && reader.tags.length > 0);
      let badge = $('.you', a);
      if (match && !badge) { badge = document.createElement('span'); badge.className = 'you'; badge.textContent = '✓ ' + S.forYou; a.querySelector('.ch-t')?.after(badge); }
      if (!match && badge) badge.remove();
    });
  }
  applyChoices();

  // ---- Návrat na poslednú voľbu (ako prst vložený do knihy-hry) ----
  $$('.choices a').forEach((a) => a.addEventListener('click', () => {
    const nav = a.closest('.choices');
    const page = location.pathname.split('/').pop();
    save('kp.back', { href: `${page}#${nav.id}`, page, title: D.titles[D.ch] || document.title }, sessionStorage);
  }));
  const back = load('kp.back', null, sessionStorage);
  const here = location.pathname.split('/').pop();
  if (back && (back.page !== here || !location.hash.startsWith('#volba-'))) {
    const pill = document.createElement('div');
    pill.className = 'back-pill no-print';
    pill.innerHTML = `<a href="${esc(back.href)}">↩ ${esc(S.back)}<small>${esc(back.title)}</small></a><button type="button" aria-label="×">×</button>`;
    pill.addEventListener('click', (e) => { sessionStorage.removeItem('kp.back'); if (e.target.closest('button')) pill.remove(); });
    document.body.append(pill);
  }

  // ---- Odporúčania na konci kapitoly ----
  const rec = $('[data-recommend]');
  function renderRecommend() {
    if (!rec) return;
    const items = [];
    const seen = new Set();
    const push = (id, why) => {
      const sec = D.sections[id];
      if (!sec || seen.has(id) || sec.ch === D.ch || read[sec.ch]) return;
      seen.add(id);
      items.push({ href: `${sec.ch}.html${sec.ch === id ? '' : '#' + id}`, text: `${sec.label ? sec.label + ' › ' : ''}${sec.text}`, why });
    };
    for (const t of reader.tags) for (const id of D.rec[t] || []) push(id, `${tagById[t]?.icon || ''} ${tagById[t]?.name || ''}`);
    const crisis = D.crisisOf[D.ch];
    const sc = crisis && D.scen[crisis];
    const played = load('kp.scen', {});
    const list = items.slice(0, 4);
    if (sc && !played[sc.id]) list.unshift({ href: `scenare.html#scenar-${sc.id}`, text: sc.title, why: '🎲' });
    if (!list.length) { rec.hidden = true; return; }
    rec.hidden = false;
    rec.innerHTML = `<h2>🧭 ${esc(S.recTitle)}</h2><ul>${list.map((x) => `<li><a href="${esc(x.href)}">${esc(x.text)}</a> <small class="muted">${esc(x.why)}</small></li>`).join('')}</ul>`;
  }
  renderRecommend();

  // ---- Prehrávač scenárov ----
  const scEl = document.getElementById('scenario-data');
  if (scEl) initPlayer(JSON.parse(scEl.textContent), S);
}

function initPlayer(list, S) {
  const results = load('kp.scen', {});
  for (const sc of list) {
    const host = document.querySelector(`[data-player="${sc.id}"]`);
    const paper = document.querySelector(`[data-gamebook="${sc.id}"]`);
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
      const others = list.filter((x) => x.id !== sc.id).map((x) => `<a href="#scenar-${x.id}">${esc(x.icon)} ${esc(x.title)}</a>`).join(' · ');
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
