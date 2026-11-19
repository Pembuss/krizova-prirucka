// Nastavenia: vzhľad, jazyk, Kríza teraz, moje údaje (záloha), offline (kniha, balík ZIP, inštalácia), pomoc.
import { VERSION, VERSION_DATE } from '../../../data/version.js';
import { LANGS as LANG_INFO } from '../../../data/ui.js';
import { store, importData, saveBackup, keepStorage } from '../store.js';
import { t, esc, LANG, switchLang, toast, $ } from '../core.js';
import { icon } from '../icons.js';
import { chosenTheme, autoDark, setTheme, setAutoDark, applyTheme } from '../theme.js';
import { downloads, offlinePackage, fmtSize } from '../downloads.js';
import { requestTour } from '../tour.js';
import { isStandalone } from '../install.js';
import { updateSupported, updateReady, checkForUpdate, applyUpdate, repairApp, appVersion } from '../update.js';
import { rerender } from '../main.js';

const LOCAL = location.protocol === 'file:';
const LOOKS = [['a', 'look.a', 'look.aDesc'], ['b', 'look.b', 'look.bDesc'], ['c', 'look.c', 'look.cDesc'], ['d', 'look.d', 'look.dDesc']];

export const keepScroll = true;
export function render(el, [section] = []) {
  const pr = store.prefs;
  const pkg = offlinePackage();
  const draw = () => {
    const cur = chosenTheme();
    el.innerHTML = `<div class="wrap narrow">
<div class="page-head"><h1>${esc(t('set.title'))}</h1></div>

<section class="card"><h2 class="card-h">${icon('palette', 22)} ${esc(t('set.theme'))}</h2>
<fieldset class="look-cards" style="border:0;margin:0;padding:0"><legend class="visually-hidden">${esc(t('set.theme'))}</legend>
${LOOKS.map(([id, n, d]) => `<label class="look-card"><input type="radio" name="look" value="${id}" ${id === cur ? 'checked' : ''}><span class="look-prev look-prev-${id}" aria-hidden="true"><i></i><i></i><i></i></span><span class="rc-main"><strong>${esc(t(n))}</strong><small class="muted" style="display:block">${esc(t(d))}</small></span></label>`).join('')}
</fieldset>
<label class="check-row"><input type="checkbox" data-auto ${autoDark() ? 'checked' : ''}><span>${esc(t('look.auto'))}<small class="muted" style="display:block">${esc(t('look.autoSub'))}</small></span></label>
<h3 class="card-h">${esc(t('set.size'))}</h3>
<div class="chips">${[['', 'size.normal'], ['l', 'size.l'], ['xl', 'size.xl']].map(([v, k]) => `<button type="button" class="chip" data-size="${v}" aria-pressed="${(pr.size || '') === v}">${esc(t(k))}</button>`).join('')}</div></section>

<section class="card"><h2 class="card-h">${icon('globe', 22)} ${esc(t('set.language'))}</h2>
<div class="chips">${LANG_INFO.map((l) => `<button type="button" class="chip" data-lang="${l.id}" aria-pressed="${l.id === LANG}">${esc(l.name)}</button>`).join('')}</div>
${LANG_INFO.find((l) => l.id === LANG)?.unverified ? `<p class="unverified">${esc(t('c.unverifiedLong'))}</p>` : ''}</section>

<section class="card"><h2 class="card-h">${icon('bolt', 22)} ${esc(t('nav.now'))}</h2>
<p class="small muted">${esc(t('set.nowMode'))}</p>
<div class="chips">${[['steps', 'now.showSteps'], ['list', 'now.showAll']].map(([v, k]) => `<button type="button" class="chip" data-nowmode="${v}" aria-pressed="${(pr.nowMode || 'steps') === v}">${esc(t(k))}</button>`).join('')}</div></section>

<section class="card" id="backup-card"><h2 class="card-h">${icon('shield', 22)} ${esc(t('set.data'))}</h2><p class="muted">${esc(t('set.privacy'))}</p>
<p class="small ${pr.lastBackup ? '' : 'backup-none'}" data-backup-status>${pr.lastBackup ? '✓ ' + esc(t('set.lastBackup', { date: new Date(pr.lastBackup).toLocaleDateString(LANG) })) : esc(t('set.noBackup'))}</p>
<p class="small muted" data-storage-status></p>
<p class="small muted">${esc(t('set.backupHint'))}</p>
<div class="btn-row"><button class="btn" data-export>${icon('download', 20)} ${esc(t('set.export'))}</button><button class="btn btn-ghost" data-export-enc>🔒 ${esc(t('set.exportEnc'))}</button>
<label class="btn btn-ghost">⬆️ ${esc(t('set.import'))}<input type="file" accept=".json,application/json" data-import hidden></label></div>
<button class="btn btn-ghost danger" data-reset>🗑️ ${esc(t('set.reset'))}</button></section>

<section class="card" id="update-card"><h2 class="card-h">${icon('download', 22)} ${esc(t('set.update'))}</h2>
<p class="small muted">${esc(t('set.version'))}: <strong>${esc(appVersion())}</strong> (${esc(VERSION_DATE)})</p>
${updateSupported() ? `<p id="upd-status" class="small" aria-live="polite">${updateReady() ? '✓ ' + esc(t('set.updateReady')) : esc(t('set.updateNote'))}</p>
<div class="btn-row"><button class="btn ${updateReady() ? '' : 'btn-ghost'}" data-upd-main>${icon('download', 20)} ${esc(t(updateReady() ? 'upd.apply' : 'set.updateCheck'))}</button><button class="btn btn-ghost" data-repair>🔧 ${esc(t('set.repair'))}</button></div>
<p class="small muted">${esc(t('set.repairNote'))}</p>` : `<p class="small">${esc(t('set.updateNa'))}</p>`}</section>

<section class="card"><h2 class="card-h">${icon('check', 22)} ${esc(t('set.offline'))}</h2><p id="sw-status" class="muted">…</p>
<div class="btn-row">${LOCAL ? '' : `<button class="btn btn-ghost" data-docs>💾 ${esc(t('set.saveDocs'))}</button>`}${LOCAL || isStandalone() ? '' : `<a class="btn btn-ghost" href="#/instalacia/navod">${icon('mobile', 20)} ${esc(t('set.install'))}</a>`}</div>
${!LOCAL && isStandalone() ? `<p class="small">✓ ${esc(t('inst.installed'))}</p>` : ''}
<p id="docs-status" class="muted small" aria-live="polite"></p>
<h3 class="card-h">${esc(t('set.zip'))}</h3>
<p class="small muted">${esc(t('set.zipLead'))}</p>
${pkg && !LOCAL ? `<button class="btn" data-zip>${icon('download', 20)} ${esc(t('set.zipBtn'))} <small>${esc(fmtSize(pkg.size, LANG))}</small></button><p id="zip-status" class="muted small" aria-live="polite"></p>` : `<p class="small">${esc(LOCAL ? t('set.offlineLocal') : t('set.zipNone'))}</p>`}
</section>

<section class="card"><h2 class="card-h">${icon('help', 22)} ${esc(t('nav.help'))}</h2>
<div class="btn-row"><button class="btn btn-ghost" data-tour-start>${icon('play', 20)} ${esc(t('help.tour'))}</button><button class="btn btn-ghost" data-intro>${icon('flag', 20)} ${esc(t('help.intro'))}</button><a class="btn btn-ghost" href="#/pomoc">${icon('help', 20)} ${esc(t('help.faq'))}</a></div></section>

<section class="card"><h2 class="card-h">${icon('info', 22)} ${esc(t('set.about'))}</h2><p>${esc(t('c.disclaimer'))}</p>
<p><strong>${esc(t('set.version'))}:</strong> ${esc(VERSION)} (${esc(VERSION_DATE)}) · <a href="#/o-aplikacii">${esc(t('nav.about'))}</a></p></section>
</div>`;
    swStatus();
    storageStatus();
  };
  async function storageStatus() {
    const out = $('[data-storage-status]', el);
    if (!out) return;
    const ok = await keepStorage();
    if (out.isConnected && ok !== null) out.textContent = ok ? '🔒 ' + t('set.storageOk') : '⚠️ ' + t('set.storageNo');
  }
  async function swStatus() {
    const out = $('#sw-status', el);
    if (LOCAL) { out.textContent = '✓ ' + t('set.offlineLocal'); return; }
    if (!('serviceWorker' in navigator) || !location.protocol.startsWith('http')) { out.textContent = t('set.offlineOff'); return; }
    const reg = await navigator.serviceWorker.getRegistration().catch(() => null);
    if (!reg?.active) { out.textContent = t('set.offlineOff'); return; }
    const ch = new MessageChannel();
    ch.port1.onmessage = (e) => { if (out.isConnected) out.textContent = '✓ ' + t('set.offlineOn', { v: e.data.version }); };
    reg.active.postMessage({ type: 'version' }, [ch.port2]);
  }
  const keep = (fn) => { const y = window.scrollY; fn(); window.scrollTo(0, y); };
  draw();
  window.scrollTo(0, 0);
  if (section === 'zaloha') setTimeout(() => $('#backup-card', el)?.scrollIntoView({ block: 'start' }), 50);
  window.addEventListener('kp-update-ready', () => { if (el.isConnected) keep(draw); }, { once: true });
  el.addEventListener('click', async (e) => {
    const l = e.target.closest('[data-lang]');
    if (l) { await switchLang(l.dataset.lang); rerender(); return; }
    const sz = e.target.closest('[data-size]');
    if (sz) { pr.size = sz.dataset.size || undefined; store.savePrefs(); applyTheme(); keep(draw); }
    const nm = e.target.closest('[data-nowmode]');
    if (nm) { pr.nowMode = nm.dataset.nowmode; store.savePrefs(); keep(draw); }
    const bk = async (pw) => { const r = await saveBackup(pw); if (r !== 'cancelled') { toast(t('set.backupDone')); keep(draw); } };
    if (e.target.closest('[data-export]')) bk();
    if (e.target.closest('[data-export-enc]')) {
      const pw = prompt(t('set.passwordPrompt'));
      if (pw) bk(pw);
    }
    const um = e.target.closest('[data-upd-main]');
    if (um) {
      if (updateReady()) { applyUpdate(); return; }
      const st = $('#upd-status', el);
      um.disabled = true; st.textContent = t('set.updateChecking');
      const r = await checkForUpdate();
      um.disabled = false;
      if (r === 'ready') { keep(draw); return; }
      st.textContent = r === 'latest' ? '✓ ' + t('set.updateLatest', { v: appVersion() }) : t(r === 'offline' ? 'set.updateOffline' : 'set.updateErr');
    }
    if (e.target.closest('[data-repair]') && confirm(t('set.repairConfirm'))) {
      if (navigator.onLine === false) { toast(t('set.updateOffline'), 4000); return; }
      repairApp();
    }
    if (e.target.closest('[data-reset]') && confirm(t('set.resetConfirm'))) { store.reset(); toast(t('c.saved')); location.hash = '#/'; }
    if (e.target.closest('[data-docs]')) {
      const st = $('#docs-status', el);
      const reg = await navigator.serviceWorker?.getRegistration().catch(() => null);
      if (!reg?.active) { st.textContent = t('set.offlineOff'); return; }
      const D = downloads();
      const files = Object.values(D?.book || {}).flatMap((x) => [x.pdf, x.epub]).filter(Boolean).map((f) => f.file);
      if (D?.shelters) files.push(D.shelters.file);
      Object.values(D?.manual || {}).forEach((f) => files.push(f.file));
      const urls = files.map((u) => new URL(u, location.href).href);
      const ch = new MessageChannel();
      ch.port1.onmessage = (ev) => { st.textContent = `${ev.data.done}/${ev.data.total}${ev.data.finished ? ' ✓' : ''}`; };
      reg.active.postMessage({ type: 'cache-docs', urls }, [ch.port2]);
    }
    if (e.target.closest('[data-zip]')) downloadZip(pkg, $('#zip-status', el), e.target.closest('[data-zip]'));
    if (e.target.closest('[data-tour-start]')) requestTour();
    if (e.target.closest('[data-intro]')) { store.prefs.onboarded = false; store.savePrefs(); location.hash = '#/uvod'; }
  });
  el.addEventListener('change', async (e) => {
    if (e.target.name === 'look') setTheme(e.target.value);
    if (e.target.matches('[data-auto]')) { setAutoDark(e.target.checked); keep(draw); }
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

// Offline balík: na webe je rozdelený na časti do 10 MB – stiahnu sa a spoja do jedného ZIP
async function downloadZip(pkg, status, btn) {
  btn.disabled = true;
  try {
    const chunks = [];
    let got = 0;
    for (const part of pkg.parts) {
      const r = await fetch(part.file);
      if (!r.ok) throw new Error(r.status);
      chunks.push(await r.blob());
      got += part.size;
      status.textContent = `${t('set.zipProgress')} ${Math.round((got / pkg.size) * 100)} %`;
    }
    const url = URL.createObjectURL(new Blob(chunks, { type: 'application/zip' }));
    const a = document.createElement('a');
    a.href = url; a.download = pkg.name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    status.textContent = '✓ ' + t('set.zipDone');
  } catch {
    status.textContent = t('set.zipErr');
  } finally { btn.disabled = false; }
}
