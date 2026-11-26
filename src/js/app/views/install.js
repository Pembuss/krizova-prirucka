// Inštalácia do telefónu alebo počítača (PWA).
// Pri prvom otvorení na webe ponúkne „Nainštalovať do telefónu“ (hlavná voľba) alebo „Pokračovať v prehliadači“.
// Adresy: #/instalacia (voľba) · #/instalacia/navod[/<ios|android|desktop|inapp>] · #/instalacia/hotovo
import { store } from '../store.js';
import { t, esc, LANG, switchLang, toast } from '../core.js';
import { icon } from '../icons.js';
import { LANGS as LANG_INFO } from '../../../data/ui.js';
import { platform, isStandalone, isWeb, canPrompt, promptInstall } from '../install.js';
import { rerender } from '../main.js';

const PLATFORMS = [['ios', 'inst.pIos', 'mobile'], ['android', 'inst.pAndroid', 'mobile'], ['desktop', 'inst.pDesktop', 'monitor'], ['inapp', 'inst.pInapp', 'globe']];
const STEPS = {
  ios: ['inst.ios1', 'inst.ios2', 'inst.ios3'],
  android: ['inst.and1', 'inst.and2', 'inst.and3'],
  desktop: ['inst.pc1', 'inst.pc2', 'inst.pc3'],
  inapp: ['inst.inapp1', 'inst.inapp2', 'inst.inapp3'],
};
// {share}, {dots}, {add} v texte → ikona, ako ju používateľ uvidí v prehliadači
const ICON_OF = { share: 'share', dots: 'dots', add: 'addbox' };
const rich = (key) => esc(t(key)).replace(/\{(share|dots|add)\}/g, (m, k) => `<span class="inst-ic">${icon(ICON_OF[k], 18)}</span>`);
const appUrl = () => location.href.split('#')[0].replace(/[?].*$/, '');
// kam pokračovať: pri prvom spustení na úvodnú inštruktáž, inak domov
const nextHref = () => (store.prefs.onboarded ? '#/' : '#/uvod');

export function render(el, [mode = '', force]) {
  const detected = platform();
  const dev = PLATFORMS.some(([id]) => id === force) ? force : detected === 'ios-other' ? 'ios' : detected;
  const mobile = dev !== 'desktop';
  const firstRun = !store.prefs.onboarded;
  const langChips = `<div class="chips inst-langs" role="group" aria-label="${esc(t('c.language'))}">${LANG_INFO.map((l) => `<button type="button" class="chip" data-lang="${l.id}" aria-pressed="${l.id === LANG}" title="${esc(l.name)}">${l.short}</button>`).join('')}</div>`;
  const backBtn = `<button type="button" class="btn btn-ghost btn-sm" data-back>${icon('back', 18)} ${esc(t('c.back'))}</button>`;
  const footer = `<p class="small muted" style="text-align:center;margin:0">${icon('phone', 16)} ${esc(t('onb.emergency'))}</p>`;
  let body;

  if (mode === 'hotovo') {
    body = `<div class="onb-top">${backBtn}</div>
<div style="text-align:center">${icon('check', 64)}</div>
<h1>${esc(t('inst.done'))}</h1><p class="lead">${esc(t('inst.doneLead'))}</p>
${dev === 'ios' ? `<p class="box tip small">${esc(t('inst.iosNote'))}</p>` : ''}
<div class="onb-actions"><a class="btn btn-ghost btn-block" href="${nextHref()}" data-continue>${icon('globe', 20)} ${esc(t('inst.browser'))}</a></div>`;
  } else if (mode === 'navod') {
    const steps = STEPS[dev].map((k, i) => `<li><span class="n">${i + 1}</span><span>${rich(k)}</span></li>`).join('');
    body = `<div class="onb-top">${firstRun ? `<a class="btn btn-ghost btn-sm" href="#/instalacia">${icon('back', 18)} ${esc(t('c.back'))}</a>` : backBtn}${firstRun ? langChips : ''}</div>
<h1>${esc(t('inst.howTitle'))}</h1>
<button type="button" class="btn btn-block btn-lg" data-onetap ${canPrompt() && dev !== 'ios' && dev !== 'inapp' ? '' : 'hidden'}>${icon('download', 22)} ${esc(t('inst.oneTap'))}</button>
<div><p class="small" style="margin:0 0 .2rem"><strong>${esc(t('inst.device'))}</strong></p>
<div class="chips" role="group">${PLATFORMS.map(([id, k, ic]) => `<a class="chip inst-dev" href="#/instalacia/navod/${id}" ${id === dev ? 'aria-current="true"' : ''}>${icon(ic, 18)} ${esc(t(k))}</a>`).join('')}</div></div>
<ol class="onb-steps inst-steps">${steps}</ol>
${dev === 'inapp' ? `<div class="inst-copy"><input type="text" readonly value="${esc(appUrl())}" aria-label="URL"><button type="button" class="btn btn-sm" data-copy>${icon('copy', 18)} ${esc(t('inst.copy'))}</button></div>` : ''}
${dev === 'ios' ? `<p class="small muted">${rich('inst.iosOther')}</p><p class="box tip small">${esc(t('inst.iosNote'))}</p>` : ''}
${dev === 'android' ? `<p class="small muted">${esc(t('inst.andOther'))}</p>` : ''}
${dev !== 'inapp' ? `<p>${esc(t('inst.last'))}</p>` : ''}
<div class="onb-actions"><a class="btn btn-ghost btn-block" href="${nextHref()}" data-browser>${icon('globe', 20)} ${esc(t('inst.browser'))}</a></div>`;
  } else {
    const installed = isStandalone();
    body = `<div class="onb-top">${firstRun ? langChips : backBtn}</div>
<div class="inst-hero"><img src="assets/img/logo.svg" width="64" height="64" alt=""><div><h1>${esc(t('app.title'))}</h1></div></div>
<p class="lead">${esc(t('inst.lead'))}</p>
<ul class="inst-benefits">
<li>${icon(mobile ? 'mobile' : 'monitor', 24)}<span>${esc(t('inst.b1'))}</span></li>
<li>${icon('offline', 24)}<span>${esc(t('inst.b2'))}</span></li>
<li>${icon('check', 24)}<span>${esc(t('inst.b3'))}</span></li>
</ul>
${!isWeb() ? `<p class="box note small">${esc(t('inst.local'))}</p>` : ''}
<div class="onb-actions">
${installed ? `<p class="box tip">${icon('check', 20)} ${esc(t('inst.installed'))}</p><a class="btn btn-block" href="${nextHref()}">${esc(t('onb.next'))} ${icon('next', 20)}</a>`
    : `<button type="button" class="btn btn-block btn-lg" data-install>${icon(mobile ? 'mobile' : 'monitor', 22)} ${esc(t(mobile ? 'inst.install' : 'inst.installPc'))}</button>
<a class="btn btn-ghost btn-block" href="${nextHref()}" data-browser>${icon('globe', 20)} ${esc(t('inst.browser'))}</a>`}
</div>
<p class="small muted" style="margin:0">${esc(t('inst.note'))}</p>
<p class="small inst-status" data-sw-status aria-live="polite"></p>`;
  }
  el.innerHTML = `<div class="onb inst"><div class="onb-inner">${body}${footer}</div></div>`;

  // stav ukladania na offline (service worker sa zaregistroval hneď pri otvorení)
  const st = el.querySelector('[data-sw-status]');
  if (st && isWeb() && 'serviceWorker' in navigator) {
    st.textContent = t('inst.saving');
    navigator.serviceWorker.ready.then(() => { if (st.isConnected) st.textContent = '✓ ' + t('inst.saved'); });
  }

  const choose = (v) => { if (!store.prefs.installChoice || v === 'browser') { store.prefs.installChoice = v; store.savePrefs(); } };
  const install = async () => {
    choose('install');
    const r = await promptInstall();
    location.hash = r === 'accepted' ? '#/instalacia/hotovo' : '#/instalacia/navod';
  };
  el.addEventListener('click', async (e) => {
    const l = e.target.closest('[data-lang]');
    if (l) { await switchLang(l.dataset.lang); rerender(); return; }
    if (e.target.closest('[data-install]')) { install(); return; }
    if (e.target.closest('[data-onetap]')) { install(); return; }
    if (e.target.closest('[data-browser]')) choose('browser');
    if (e.target.closest('[data-back]')) { if (history.length > 1) history.back(); else location.hash = '#/'; }
    if (e.target.closest('[data-copy]')) {
      const inp = el.querySelector('.inst-copy input');
      try { await navigator.clipboard.writeText(inp.value); } catch { inp.select(); document.execCommand?.('copy'); }
      toast(t('inst.copied'));
    }
  });
  // natívne okno môže byť k dispozícii až neskôr (Chrome ho ponúkne po chvíli používania)
  const onReady = () => { const b = el.querySelector('[data-onetap]'); if (b && dev !== 'ios' && dev !== 'inapp') b.hidden = false; };
  const onInstalled = () => { if (el.isConnected && mode !== 'hotovo') location.hash = '#/instalacia/hotovo'; };
  window.addEventListener('kp-installable', onReady);
  window.addEventListener('kp-installed', onInstalled);
  return () => { window.removeEventListener('kp-installable', onReady); window.removeEventListener('kp-installed', onInstalled); };
}
