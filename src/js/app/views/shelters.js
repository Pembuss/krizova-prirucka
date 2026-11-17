// Úkryty CO na Slovensku: počty podľa krajov, zverejnené zoznamy miest a alternatívy (podklad MV SR, po slovensky).
import { t, esc, LANG } from '../core.js';
import { icon } from '../icons.js';
import { loadAsset } from '../loader.js';
import { sheltersFile, fmtSize } from '../downloads.js';
import { printHtml } from '../printdocs.js';

export const keepScroll = true;
const jump = (id) => { const x = id && document.getElementById(id); if (x) x.scrollIntoView({ block: 'start' }); else window.scrollTo(0, 0); };
export function update(el, [anchor]) { jump(anchor); return true; }
export async function render(el, [anchor]) {
  const pdf = sheltersFile();
  el.innerHTML = `<div class="wrap" style="max-width:900px">
<div class="page-head"><h1>${esc(t('nav.shelters'))}</h1></div>
${LANG !== 'sk' ? `<p class="box note small">${esc(t('shel.onlySk'))}</p>` : ''}
<div class="btn-row"><a class="btn" href="#/mapa">${icon('pin', 20)} ${esc(t('shel.onMap'))}</a>
${pdf ? `<a class="btn btn-ghost" href="${esc(pdf.file)}" download>${icon('download', 20)} PDF <small>${esc(fmtSize(pdf.size, LANG))}</small></a>` : ''}
<button class="btn btn-ghost" data-print>${icon('print', 20)} ${esc(t('c.print'))}</button>
<a class="btn btn-ghost" href="#/krajiny">${icon('globe', 20)} ${esc(t('nav.countries'))}</a></div>
<div class="reader-content shelter-overview" lang="sk" data-body><p class="muted">${esc(t('c.loading'))}</p></div>
</div>`;
  const body = el.querySelector('[data-body]');
  try {
    await loadAsset('extra/kryty-sk.js');
    body.innerHTML = (window.KP_EXTRA?.['kryty-sk'] || '').replace(/href="#([^"/][^"]*)"/g, 'href="#/kryty/$1"');
    jump(anchor);
  } catch { body.innerHTML = `<p class="error">${esc(t('book.loadErr'))}</p>`; }
  el.addEventListener('click', (e) => { if (e.target.closest('[data-print]')) printHtml(`<div class="shelter-overview">${body.innerHTML}</div>`); });
}
