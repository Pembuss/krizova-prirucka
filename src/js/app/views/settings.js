// Nastavenia: jazyk, vzhľad, záloha a obnova, offline režim, vymazanie údajov.
import { VERSION, VERSION_DATE } from '../../../data/version.js';
import { store, exportData, importData, download } from '../store.js';
import { t, esc, LANG, setLang, toast, $ } from '../core.js';

const LOCAL = location.protocol === 'file:';

export function render(el) {
  const pr = store.prefs;
  const draw = () => {
    el.innerHTML = `<div class="wrap narrow">
<h1>${esc(t('set.title'))}</h1>
<section class="card"><h2 class="card-h">${esc(t('set.language'))}</h2>
<div class="chips">${[['sk', 'Slovenčina'], ['cs', 'Čeština'], ['en', 'English']].map(([l, n]) => `<button type="button" class="chip" data-lang="${l}" aria-pressed="${l === LANG}">${n}</button>`).join('')}</div>
<h2 class="card-h">${esc(t('set.theme'))}</h2>
<div class="chips">${[['', 'theme.auto'], ['light', 'theme.light'], ['dark', 'theme.dark']].map(([v, k]) => `<button type="button" class="chip" data-theme="${v}" aria-pressed="${(pr.theme || '') === v}">${esc(t(k))}</button>`).join('')}</div>
<h2 class="card-h">${esc(t('set.size'))}</h2>
<div class="chips">${[['', 'size.normal'], ['l', 'size.l'], ['xl', 'size.xl']].map(([v, k]) => `<button type="button" class="chip" data-size="${v}" aria-pressed="${(pr.size || '') === v}">${esc(t(k))}</button>`).join('')}</div>
<label class="check-row"><input type="checkbox" data-contrast ${pr.contrast ? 'checked' : ''}><span>${esc(t('set.contrast'))}</span></label></section>
<section class="card"><h2 class="card-h">${esc(t('set.data'))}</h2><p class="muted">${esc(t('set.privacy'))}</p>
<div class="btn-row"><button class="btn" data-export>⬇️ ${esc(t('set.export'))}</button><button class="btn btn-ghost" data-export-enc>🔒 ${esc(t('set.exportEnc'))}</button>
<label class="btn btn-ghost">⬆️ ${esc(t('set.import'))}<input type="file" accept=".json,application/json" data-import hidden></label></div>
<button class="btn btn-ghost danger" data-reset>🗑️ ${esc(t('set.reset'))}</button></section>
<section class="card"><h2 class="card-h">${esc(t('set.offline'))}</h2><p id="sw-status" class="muted">…</p>
<div class="btn-row">${LOCAL ? '' : `<button class="btn btn-ghost" data-docs>💾 ${esc(t('set.saveDocs'))}</button>`}<button class="btn btn-ghost" data-install hidden>📲 ${esc(t('set.install'))}</button></div><p id="docs-status" class="muted" aria-live="polite"></p></section>
<section class="card"><h2 class="card-h">${esc(t('set.about'))}</h2><p>${esc(t('c.disclaimer'))}</p>
<p><a href="../${LANG}/o-projekte.html">${esc(t('nav.web'))}</a> · <a href="../${LANG}/kniha/index.html">${esc(t('nav.book'))}</a></p>
<p><strong>${esc(t('set.version'))}:</strong> ${esc(VERSION)} (${esc(VERSION_DATE)})</p>
<p class="muted small">${esc(t('set.mapData'))}</p>
<p class="muted small">© OpenStreetMap contributors (ODbL) · Natural Earth (public domain) · Leaflet (BSD-2) · OSRM / FOSSGIS</p></section>
</div>`;
    swStatus();
    if (window._installPrompt) $('[data-install]', el).hidden = false;
  };
  const applyPrefs = () => {
    store.savePrefs();
    const d = document.documentElement;
    for (const k of ['theme', 'size', 'contrast']) { if (pr[k]) d.dataset[k] = pr[k]; else delete d.dataset[k]; }
  };
  async function swStatus() {
    const out = $('#sw-status');
    if (LOCAL) { out.textContent = '✓ ' + t('set.offlineLocal'); return; }
    if (!('serviceWorker' in navigator) || !location.protocol.startsWith('http')) { out.textContent = t('set.offlineOff'); return; }
    const reg = await navigator.serviceWorker.getRegistration('../').catch(() => null);
    if (!reg?.active) { out.textContent = t('set.offlineOff'); return; }
    const ch = new MessageChannel();
    ch.port1.onmessage = (e) => { out.textContent = t('set.offlineOn', { v: e.data.version }); };
    reg.active.postMessage({ type: 'version' }, [ch.port2]);
  }
  draw();
  el.addEventListener('click', async (e) => {
    const l = e.target.closest('[data-lang]');
    if (l) { setLang(l.dataset.lang); const u = new URL(location.href); u.searchParams.set('lang', l.dataset.lang); history.replaceState(null, '', u); location.reload(); }
    const th = e.target.closest('[data-theme]'); if (th) { pr.theme = th.dataset.theme || undefined; applyPrefs(); draw(); }
    const sz = e.target.closest('[data-size]'); if (sz) { pr.size = sz.dataset.size || undefined; applyPrefs(); draw(); }
    if (e.target.closest('[data-export]')) download(`krizova-prirucka-zaloha-${new Date().toISOString().slice(0, 10)}.json`, await exportData());
    if (e.target.closest('[data-export-enc]')) {
      const pw = prompt(t('set.passwordPrompt'));
      if (pw) download(`krizova-prirucka-zaloha-sifrovana-${new Date().toISOString().slice(0, 10)}.json`, await exportData(pw));
    }
    if (e.target.closest('[data-reset]') && confirm(t('set.resetConfirm'))) { store.reset(); toast(t('c.saved')); location.hash = '#/'; }
    if (e.target.closest('[data-docs]')) {
      const reg = await navigator.serviceWorker?.getRegistration('../').catch(() => null);
      if (!reg?.active) { $('#docs-status').textContent = t('set.offlineOff'); return; }
      const urls = ['sk', 'cs', 'en'].flatMap((x) => [`../downloads/krizova-prirucka-${x}.pdf`, `../downloads/krizova-prirucka-${x}.epub`]).map((u) => new URL(u, location.href).href);
      const ch = new MessageChannel();
      ch.port1.onmessage = (ev) => { $('#docs-status').textContent = `${ev.data.done}/${ev.data.total}${ev.data.finished ? ' ✓' : ''}`; };
      reg.active.postMessage({ type: 'cache-docs', urls }, [ch.port2]);
      ['sk', 'cs', 'en'].forEach((x) => reg.active.postMessage({ type: 'cache-lang', lang: x }));
    }
    if (e.target.closest('[data-install]') && window._installPrompt) { window._installPrompt.prompt(); window._installPrompt = null; }
  });
  el.addEventListener('change', async (e) => {
    if (e.target.matches('[data-contrast]')) { pr.contrast = e.target.checked ? 'high' : undefined; applyPrefs(); }
    if (e.target.matches('[data-import]')) {
      const file = e.target.files[0];
      if (!file) return;
      const text = await file.text();
      try {
        let pw;
        if (JSON.parse(text).enc) pw = prompt(t('set.passwordAsk'));
        await importData(text, pw);
        toast(t('set.importOk'));
        location.hash = '#/';
      } catch { toast(t('set.importErr'), 4000); }
    }
  });
}
