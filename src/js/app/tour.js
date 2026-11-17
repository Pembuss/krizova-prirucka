// Prehliadka so šípkami: zvýrazní prvok, ukáže bublinu s vysvetlením, Ďalej / Späť / Ukončiť.
import { store } from './store.js';
import { t, esc } from './core.js';

const visible = (el) => { if (!el) return false; const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden'; };
const pickEl = (sels) => sels.map((s) => document.querySelector(s)).find(visible);

// Kroky prehliadky domovskej obrazovky (prvky, ktoré nie sú vidieť, sa preskočia)
const STEPS = [
  { sel: ['[data-tour="crisis"]'], k: 'crisis' },
  { sel: ['[data-tour="tiles"]'], k: 'tiles' },
  { sel: ['[data-tour="ready"]'], k: 'ready' },
  { sel: ['#app-tabs', '#app-nav'], k: 'menu' },
  { sel: ['[data-look-menu]'], k: 'look' },
  { sel: ['#app-lang'], k: 'lang' },
  { sel: ['.hdr-112'], k: 'call' },
];

let active = null;
export function startTour() {
  endTour();
  const steps = STEPS.map((s) => ({ ...s, el: pickEl(s.sel) })).filter((s) => s.el);
  if (!steps.length) return;
  const hole = document.createElement('div');
  hole.className = 'tour-hole';
  const tip = document.createElement('div');
  tip.className = 'tour-tip';
  tip.setAttribute('role', 'dialog');
  tip.setAttribute('aria-modal', 'true');
  const shade = document.createElement('div');
  shade.className = 'tour-shade';
  shade.style.pointerEvents = 'auto';
  document.body.append(shade, hole, tip);
  let i = 0;
  const place = () => {
    const s = steps[i];
    const r = s.el.getBoundingClientRect();
    const pad = 6;
    Object.assign(hole.style, { top: `${r.top - pad}px`, left: `${r.left - pad}px`, width: `${r.width + pad * 2}px`, height: `${r.height + pad * 2}px` });
    const tw = tip.offsetWidth, th = tip.offsetHeight, vw = window.innerWidth, vh = window.innerHeight;
    const below = r.bottom + pad + 14 + th < vh;
    const top = below ? r.bottom + pad + 14 : Math.max(8, r.top - pad - 14 - th);
    const left = Math.min(Math.max(12, r.left + r.width / 2 - tw / 2), vw - tw - 12);
    Object.assign(tip.style, { top: `${top}px`, left: `${left}px` });
    const arrow = tip.querySelector('.tt-arrow');
    const ax = Math.min(Math.max(16, r.left + r.width / 2 - left - 8), tw - 32);
    Object.assign(arrow.style, below ? { top: '-9px', bottom: '', left: `${ax}px`, transform: 'rotate(45deg)' } : { bottom: '-9px', top: '', left: `${ax}px`, transform: 'rotate(225deg)' });
  };
  const show = () => {
    const s = steps[i];
    const r = s.el.getBoundingClientRect();
    if (r.top < 60 || r.bottom > window.innerHeight - 80) s.el.scrollIntoView({ block: 'center' });
    tip.innerHTML = `<span class="tt-arrow" aria-hidden="true"></span><h2 id="tt-h">${esc(t(`tour.${s.k}`))}</h2><p>${esc(t(`tour.${s.k}Text`))}</p>
<div class="tt-nav"><span class="tt-count">${i + 1} / ${steps.length}</span>${i ? `<button type="button" class="btn btn-ghost btn-sm" data-tt="prev">${esc(t('c.back'))}</button>` : `<button type="button" class="btn btn-ghost btn-sm" data-tt="end">${esc(t('tour.skip'))}</button>`}<button type="button" class="btn btn-sm" data-tt="next">${esc(i < steps.length - 1 ? t('tour.next') : t('tour.done'))}</button></div>`;
    tip.setAttribute('aria-labelledby', 'tt-h');
    place();
    tip.querySelector('[data-tt="next"]').focus({ preventScroll: true });
  };
  const go = (d) => { i += d; if (i >= steps.length || i < 0) { endTour(true); return; } show(); };
  tip.addEventListener('click', (e) => {
    const b = e.target.closest('[data-tt]');
    if (!b) return;
    if (b.dataset.tt === 'next') go(1);
    else if (b.dataset.tt === 'prev') go(-1);
    else endTour(true);
  });
  shade.addEventListener('click', () => go(1));
  const onKey = (e) => {
    if (e.key === 'Escape') endTour(true);
    else if (e.key === 'ArrowRight') go(1);
    else if (e.key === 'ArrowLeft' && i) go(-1);
    else if (e.key === 'Tab') { // fokus zostáva v bubline
      const f = [...tip.querySelectorAll('button')];
      const k = f.indexOf(document.activeElement);
      e.preventDefault();
      f[(k + (e.shiftKey ? -1 : 1) + f.length) % f.length]?.focus();
    }
  };
  const onMove = () => place();
  document.addEventListener('keydown', onKey);
  window.addEventListener('resize', onMove);
  window.addEventListener('scroll', onMove, { passive: true });
  window.addEventListener('hashchange', () => endTour(), { once: true });
  active = { remove: () => { shade.remove(); hole.remove(); tip.remove(); document.removeEventListener('keydown', onKey); window.removeEventListener('resize', onMove); window.removeEventListener('scroll', onMove); } };
  show();
}
export function endTour(done) {
  if (active) { active.remove(); active = null; }
  if (done) { store.prefs.tourDone = true; store.savePrefs(); }
}
// Spustí prehliadku na domovskej obrazovke (odkiaľkoľvek)
export function requestTour() {
  sessionStorage.setItem('kp.tour', '1');
  if (location.hash === '#/' || location.hash === '' || location.hash === '#') window.dispatchEvent(new HashChangeEvent('hashchange'));
  else location.hash = '#/';
}
