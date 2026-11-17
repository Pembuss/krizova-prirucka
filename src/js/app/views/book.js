// Kniha v aplikácii.
// #/kniha – úvod: stiahnutie PDF/EPUB, rozcestník, prispôsobenie, obsah
// #/kniha/hladat/<výraz> – vyhľadávanie v celej knihe
// #/kniha/<kapitola>[/<kotva>] – čítačka
import { t, tp, T, esc, LANG } from '../core.js';
import { icon } from '../icons.js';
import { CRISES } from '../../../data/crises.js';
import { LANGS as LANG_INFO } from '../../../data/ui.js';
import { bookIndex, chapterHtml, allChapters, bookLang, BOOK_LANGS } from '../bookdata.js';
import { bookFile, fmtSize } from '../downloads.js';
import { readerEditor, readerProfile, applyChoices, rememberChoices, backPillHtml, bindBackPill, recommendHtml, initPlayers, bindChecklists, markRead, readMap, chHref } from '../bookrt.js';
import { printHtml } from '../printdocs.js';

export const keepScroll = true;
let cur = null; // { ch, el }

export async function render(el, [ch, anchor]) {
  el.innerHTML = `<div class="book-wrap"><p class="muted">${esc(t('c.loading'))}</p></div>`;
  let idx;
  try { idx = await bookIndex(LANG); } catch { el.innerHTML = `<div class="book-wrap"><p class="error">${esc(t('book.loadErr'))}</p></div>`; return; }
  cur = null;
  if (!ch) return home(el, idx);
  if (ch === 'hladat') return search(el, idx, anchor || '');
  if (!idx.chapters.some((c) => c.id === ch)) return home(el, idx);
  return reader(el, idx, ch, anchor);
}
// tá istá kapitola, iná kotva → len posun
export function update(el, [ch, anchor]) {
  if (!cur || ch !== cur.ch || ch === 'hladat') return false;
  // návrat na voľbu v tej istej kapitole: tlačidlo „Späť na voľbu“ sa obnoví
  el.querySelector('.back-pill')?.remove();
  el.querySelector('.reader')?.insertAdjacentHTML('beforeend', backPillHtml(cur.D, ch, anchor));
  scrollToAnchor(anchor);
  return true;
}

const langNote = () => (bookLang(LANG) !== LANG ? `<p class="box note small">${esc(t('book.notTranslated'))}</p>` : '');
const chName = (c) => `${c.short ? c.short + ' · ' : ''}${c.title}`;

// ---------- Na stiahnutie ----------
export function downloadsHtml(current = LANG) {
  const rows = LANG_INFO.filter((l) => bookFile(l.id, 'pdf') || bookFile(l.id, 'epub'));
  if (!rows.length) return `<p class="muted small">${esc(t('book.noPdf'))}</p>`;
  rows.sort((a, b) => (a.id === current ? -1 : b.id === current ? 1 : 0));
  return `<div class="dl-grid">${rows.map((l) => {
    const pdf = bookFile(l.id, 'pdf'), epub = bookFile(l.id, 'epub');
    return `<div class="dl-row"><span class="dl-lang">${esc(l.name)}${pdf?.pages ? `<small class="muted">${esc(t('book.pages', { n: pdf.pages }))}</small>` : ''}</span>
${pdf ? `<a class="btn btn-sm${l.id === current ? '' : ' btn-ghost'}" href="${esc(pdf.file)}" download>${icon('download', 18)} PDF <small>${esc(fmtSize(pdf.size, LANG))}</small></a>` : ''}
${epub ? `<a class="btn btn-sm btn-ghost" href="${esc(epub.file)}" download>EPUB <small>${esc(fmtSize(epub.size, LANG))}</small></a>` : ''}
${l.unverified ? `<span class="unverified">${esc(t('c.unverified'))}</span>` : ''}</div>`;
  }).join('')}</div>`;
}

// ---------- Obsah ----------
function tocHtml(idx, current = '') {
  const read = readMap();
  return `<div class="toc-parts">${idx.parts.map((p) => `<section class="toc-part"><h3>${esc(p.name)}</h3><ol>${idx.chapters.filter((c) => c.part === p.id).map((c) => `<li><a href="${chHref(c.id)}"${c.id === current ? ' aria-current="page"' : ''}${read[c.id] ? ' class="read"' : ''}><span class="no">${esc(c.num || '')}</span><span>${esc(c.title)}</span></a></li>`).join('')}</ol></section>`).join('')}</div>`;
}

// ---------- Úvod knihy ----------
function home(el, idx) {
  const D = idx.D;
  const read = readMap();
  const nRead = idx.chapters.filter((c) => read[c.id]).length;
  const startCh = idx.chapters[0];
  el.innerHTML = `<div class="book-wrap">
<div class="page-head"><h1>${esc(idx.title)}</h1></div>
<p class="lead">${esc(idx.subtitle)}</p>
${langNote()}
<form class="search-box" data-search role="search">${icon('search', 20)}<label class="visually-hidden" for="book-q">${esc(t('book.search'))}</label><input id="book-q" type="search" placeholder="${esc(t('home.searchPh'))}" autocomplete="off"></form>
<div class="btn-row"><a class="btn" href="${chHref(startCh.id)}">${icon('book', 20)} ${esc(nRead ? t('book.continue') : t('book.start'))}</a><a class="btn btn-ghost" href="${chHref('scenare')}">${icon('dice', 20)} ${esc(t('book.stories'))}</a></div>
${nRead ? `<p class="small muted">${esc(t('book.readCount', { n: nRead, total: idx.chapters.length }))} · <button type="button" class="linklike" data-reset-read>${esc(D.s.resetRead)}</button></p>` : ''}

<h2 class="section-title">${icon('download', 20)} ${esc(t('book.downloadTitle'))}</h2>
<p class="small muted">${esc(t('book.downloadLead'))}</p>
${downloadsHtml()}

<h2 class="section-title">🧭 ${esc(t('book.signpost'))}</h2>
<section data-signpost>
<p class="small muted">${esc(t('book.signpostLead'))}</p>
<div class="chips" role="group" aria-label="${esc(t('book.signpost'))}">${CRISES.map((c) => `<button type="button" class="chip" data-crisis="${c.id}" aria-pressed="false">${c.icon} ${esc(T(c.name))}</button>`).join('')}</div>
<h3 class="small">${esc(t('book.situation'))}</h3>
<div class="chips" role="group">${idx.situations.map((s) => `<button type="button" class="chip" data-situation="${s.id}" aria-pressed="false">${s.icon} ${esc(s.name)}</button>`).join('')}</div>
<div class="chips needs" role="group" hidden><button type="button" class="chip" data-need="now" aria-pressed="true">⚡ ${esc(t('book.needNow'))}</button><button type="button" class="chip" data-need="plan" aria-pressed="false">🗓️ ${esc(t('book.needPlan'))}</button><button type="button" class="chip" data-need="know" aria-pressed="false">📘 ${esc(t('book.needKnow'))}</button></div>
<div data-signpost-out aria-live="polite"></div>
</section>

<h2 class="section-title">🎯 ${esc(D.s.personalise)}</h2>
<p class="small muted">${esc(D.s.personaliseHint)}</p>
<div data-reader-editor></div>

<h2 class="section-title">${icon('list', 20)} ${esc(t('book.contents'))}</h2>
${tocHtml(idx)}
</div>`;
  readerEditor(el.querySelector('[data-reader-editor]'), D);
  bindSearch(el);
  // rozcestník
  const sp = el.querySelector('[data-signpost]');
  const out = sp.querySelector('[data-signpost-out]');
  let sel = null, need = 'now';
  const byId = Object.fromEntries(idx.chapters.map((c) => [c.id, c]));
  const draw = () => {
    if (!sel) return;
    const ids = sel.type === 'crisis' ? (D.paths[sel.id]?.[need] || []) : (idx.situations.find((s) => s.id === sel.id)?.chapters || []);
    out.innerHTML = `<ol class="path">${ids.filter((id) => byId[id]).map((id) => `<li><a href="${chHref(id)}">${esc(chName(byId[id]))}</a></li>`).join('')}</ol>
${sel.type === 'crisis' ? `<p><a class="btn btn-sm btn-urgent" href="#/teraz/${sel.id}">${icon('bolt', 18)} ${esc(t('book.toNow'))}</a></p>` : ''}`;
  };
  sp.addEventListener('click', (e) => {
    const b = e.target.closest('[data-crisis],[data-situation]');
    if (b) {
      sp.querySelectorAll('[data-crisis],[data-situation]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      sel = b.dataset.crisis ? { type: 'crisis', id: b.dataset.crisis } : { type: 'situation', id: b.dataset.situation };
      sp.querySelector('.needs').hidden = sel.type !== 'crisis';
      draw();
      out.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
    const n = e.target.closest('[data-need]');
    if (n) { sp.querySelectorAll('[data-need]').forEach((x) => x.setAttribute('aria-pressed', String(x === n))); need = n.dataset.need; draw(); }
  });
  el.addEventListener('click', (e) => {
    if (e.target.closest('[data-reset-read]')) { localStorage.removeItem('kp.read'); home(el, idx); }
  });
  window.scrollTo(0, 0);
}

function bindSearch(el) {
  el.addEventListener('submit', (e) => {
    if (!e.target.matches('[data-search]')) return;
    e.preventDefault();
    const q = e.target.querySelector('input').value.trim();
    if (q) location.hash = `#/kniha/hladat/${encodeURIComponent(q)}`;
  });
}

// ---------- Vyhľadávanie ----------
const fold = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const decode = (s) => s.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
function segments(html) {
  // rozdelí kapitolu podľa nadpisov s id; text bez značiek
  const out = [];
  const re = /<h([1-4])[^>]*\sid="([^"]+)"[^>]*>([\s\S]*?)<\/h\1>/g;
  let last = 0, head = null, m;
  const push = (end) => { const text = decode(html.slice(last, end).replace(/<span class="(?:ch-page|pref)[^"]*">[\s\S]*?<\/span>/g, '').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim(); if (text) out.push({ id: head?.id, title: head?.title || '', text }); };
  while ((m = re.exec(html))) { push(m.index); head = { id: m[2], title: decode(m[3].replace(/<span class="ch-label">[\s\S]*?<\/span>/, '').replace(/<[^>]+>/g, '')).trim() }; last = m.index; }
  push(html.length);
  return out;
}
const hl = (text, q) => {
  const f = fold(text), i = f.indexOf(q);
  if (i < 0) return esc(text);
  return `${esc(text.slice(0, i))}<mark>${esc(text.slice(i, i + q.length))}</mark>${esc(text.slice(i + q.length))}`;
};
async function search(el, idx, query) {
  el.innerHTML = `<div class="book-wrap">
<a class="back-link" href="#/kniha">${icon('back', 18)} ${esc(idx.title)}</a>
<div class="page-head"><h1>${esc(t('book.search'))}</h1></div>
<form class="search-box" data-search role="search">${icon('search', 20)}<label class="visually-hidden" for="book-q">${esc(t('book.search'))}</label><input id="book-q" type="search" value="${esc(query)}" autocomplete="off"></form>
<div data-results aria-live="polite"><p class="muted">${esc(t('c.loading'))}</p></div></div>`;
  bindSearch(el);
  const out = el.querySelector('[data-results]');
  const q = fold(query.trim());
  if (q.length < 2) { out.innerHTML = `<p class="muted">${esc(t('book.searchShort'))}</p>`; return; }
  const chs = await allChapters(LANG);
  const hits = [];
  for (const c of chs) {
    for (const s of segments(c.html)) {
      const f = fold(s.text);
      let i = f.indexOf(q);
      if (i < 0) continue;
      let count = 0;
      for (let j = i; j >= 0; j = f.indexOf(q, j + q.length)) count++;
      const a = Math.max(0, i - 70), b = Math.min(s.text.length, i + q.length + 90);
      const snip = (a ? '…' : '') + s.text.slice(a, b) + (b < s.text.length ? '…' : '');
      hits.push({ c, s, count, snip, title: fold(s.title).includes(q) });
    }
  }
  hits.sort((x, y) => (y.title - x.title) || (y.count - x.count));
  sessionStorage.setItem('kp.hl', query.trim());
  out.innerHTML = hits.length
    ? `<p class="small muted">${esc(tp('book.found', hits.length))}</p><ul class="search-results">${hits.slice(0, 60).map((h) => `<li><a href="${chHref(h.c.id, h.s.id)}"><strong>${hl(h.s.title || h.c.title, q)}</strong><small class="muted">${esc(chName(h.c))}</small><span class="small">${hl(h.snip, q)}</span></a></li>`).join('')}</ul>`
    : `<p>${esc(t('book.notFound'))}</p>`;
}
// zvýrazní hľadaný výraz v kapitole (po prechode z výsledkov)
function highlight(root, query) {
  const q = fold(query);
  if (q.length < 2) return null;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) if (fold(walker.currentNode.nodeValue).includes(q)) nodes.push(walker.currentNode);
  let first = null;
  for (const n of nodes.slice(0, 80)) {
    const f = fold(n.nodeValue);
    const frag = document.createDocumentFragment();
    let pos = 0;
    for (let i = f.indexOf(q); i >= 0; i = f.indexOf(q, i + q.length)) {
      frag.append(n.nodeValue.slice(pos, i));
      const mk = document.createElement('mark');
      mk.textContent = n.nodeValue.slice(i, i + q.length);
      frag.append(mk);
      first ||= mk;
      pos = i + q.length;
    }
    frag.append(n.nodeValue.slice(pos));
    n.replaceWith(frag);
  }
  return first;
}

// ---------- Čítačka ----------
function scrollToAnchor(anchor) {
  const target = anchor && document.getElementById(anchor);
  if (target) {
    const top = target.getBoundingClientRect().top + window.scrollY - (document.querySelector('.app-header')?.offsetHeight || 0) - 12;
    window.scrollTo({ top, behavior: 'auto' });
    target.classList.add('flash');
    setTimeout(() => target.classList.remove('flash'), 1600);
  } else window.scrollTo(0, 0);
}
function rewrite(html, idx) {
  // odkazy #kotva → #/kniha/<kapitola>/<kotva> (mapu kotiev dodá index)
  return html.replace(/href="#([^"/][^"]*)"/g, (m, id) => {
    const ch = idx.anchors?.[id] || (idx.chapters.some((c) => c.id === id) ? id : null);
    return ch ? `href="${chHref(ch, id)}"` : m;
  });
}
async function reader(el, idx, ch, anchor) {
  const D = idx.D;
  const i = idx.chapters.findIndex((c) => c.id === ch);
  const c = idx.chapters[i], prev = idx.chapters[i - 1], next = idx.chapters[i + 1];
  let html = await chapterHtml(LANG, ch);
  if (html == null) { el.innerHTML = `<div class="book-wrap"><p class="error">${esc(t('book.loadErr'))}</p></div>`; return; }
  html = rewrite(html, idx);
  const reader = readerProfile(D);
  const tagById = Object.fromEntries(D.tags.map((x) => [x.id, x]));
  const summary = reader.tags.length ? reader.tags.map((x) => `<span class="rtag">${tagById[x]?.icon || ''} ${esc(tagById[x]?.name || x)}</span>`).join(' ') : `<span class="muted">${esc(D.s.none)}</span>`;
  el.innerHTML = `<div class="reader">
<div class="reader-top">
<a class="hdr-btn" href="#/kniha" aria-label="${esc(t('book.contents'))}" title="${esc(t('book.contents'))}">${icon('back', 22)}</a>
<span class="grow"></span>
<button type="button" class="btn btn-ghost btn-sm" data-toc aria-expanded="false">${icon('list', 18)} ${esc(t('book.chapters'))}</button>
<button type="button" class="btn btn-ghost btn-sm" data-print-ch aria-label="${esc(t('c.print'))}">${icon('print', 18)}</button>
</div>
${langNote()}
<div class="reader-bar no-print"><div class="rb-row"><span class="rb-title">🎯 ${esc(reader.tags.length ? D.s.readingAs : D.s.personalise)}:</span> <span class="rb-tags">${summary}</span> <button type="button" class="btn btn-ghost btn-sm" data-rb-edit aria-expanded="false">${esc(D.s.edit)}</button></div>
<div class="rb-editor" hidden><p class="small muted">${esc(D.s.personaliseHint)}</p><div data-reader-editor></div><button type="button" class="btn btn-sm" data-rb-done>${esc(D.s.done)}</button></div></div>
<article class="reader-content book-main" data-chapter="${esc(ch)}">${html}</article>
<div data-recommend>${recommendHtml(D, ch)}</div>
<nav class="reader-pager" aria-label="${esc(t('book.chapters'))}">
${prev ? `<a class="prev" href="${chHref(prev.id)}"><small class="muted">← ${esc(t('book.prev'))}</small>${esc(prev.title)}</a>` : ''}
${next ? `<a class="next" href="${chHref(next.id)}"><small class="muted">${esc(t('book.next'))} →</small>${esc(next.title)}</a>` : ''}
</nav>
${backPillHtml(D, ch, anchor)}
</div>
<div class="toc-drawer" hidden><button type="button" class="td-back" data-toc-close aria-label="${esc(t('c.close'))}"></button><div class="td-panel" role="dialog" aria-label="${esc(t('book.chapters'))}">
<div class="reader-top"><strong class="grow">${esc(t('book.chapters'))}</strong><button type="button" class="btn btn-ghost btn-sm" data-toc-close>${icon('close', 18)}</button></div>${tocHtml(idx, ch)}</div></div>`;
  cur = { ch, el, D };
  markRead(ch);
  const art = el.querySelector('.reader-content');
  applyChoices(art, D);
  rememberChoices(art, ch, c.title);
  bindBackPill(el);
  bindChecklists(art, 'kniha/' + ch);
  if (ch === 'scenare' && idx.scenarios) initPlayers(art, idx.scenarios, D.s);
  // profil čitateľa – úprava priamo v kapitole
  const editor = el.querySelector('.rb-editor');
  readerEditor(el.querySelector('[data-reader-editor]'), D, (r) => {
    applyChoices(art, D);
    el.querySelector('[data-recommend]').innerHTML = recommendHtml(D, ch);
    el.querySelector('.rb-tags').innerHTML = r.tags.length ? r.tags.map((x) => `<span class="rtag">${tagById[x]?.icon || ''} ${esc(tagById[x]?.name || x)}</span>`).join(' ') : `<span class="muted">${esc(D.s.none)}</span>`;
  });
  const drawer = el.querySelector('.toc-drawer');
  const tocBtn = el.querySelector('[data-toc]');
  const setDrawer = (open) => { drawer.hidden = !open; tocBtn.setAttribute('aria-expanded', String(open)); if (open) drawer.querySelector('[aria-current]')?.scrollIntoView({ block: 'center' }); };
  el.addEventListener('click', (e) => {
    if (e.target.closest('[data-rb-edit]')) { editor.hidden = !editor.hidden; e.target.closest('[data-rb-edit]').setAttribute('aria-expanded', String(!editor.hidden)); }
    if (e.target.closest('[data-rb-done]')) { editor.hidden = true; el.querySelector('[data-rb-edit]').setAttribute('aria-expanded', 'false'); }
    if (e.target.closest('[data-toc]')) setDrawer(drawer.hidden);
    if (e.target.closest('[data-toc-close]') || e.target.closest('.toc-drawer a')) setDrawer(false);
    if (e.target.closest('[data-print-ch]')) printHtml(`<div class="book-main">${art.innerHTML}</div>`);
  });
  const onKey = (e) => { if (e.key === 'Escape' && !drawer.hidden) setDrawer(false); };
  document.addEventListener('keydown', onKey);
  const q = sessionStorage.getItem('kp.hl');
  sessionStorage.removeItem('kp.hl');
  const mark = q ? highlight(art, q) : null;
  if (anchor) scrollToAnchor(anchor);
  else if (mark) mark.scrollIntoView({ block: 'center' });
  else window.scrollTo(0, 0);
  return () => { document.removeEventListener('keydown', onKey); cur = null; };
}

// pre ostatné obrazovky (krajiny, zdroje): kapitola bez nadpisu, s odkazmi do knihy
export async function chapterBody(ch) {
  const idx = await bookIndex(LANG);
  const html = await chapterHtml(LANG, ch);
  return html == null ? '' : rewrite(html.replace(/<h1[\s\S]*?<\/h1>/, ''), idx);
}
export { BOOK_LANGS, bookIndex };
