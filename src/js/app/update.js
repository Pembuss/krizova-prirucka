// Aktualizácia nainštalovanej aplikácie: kontrola novej verzie, ponuka „Aktualizovať“, oprava (znovu stiahnuť súbory).
// Service worker (sw.js) novú verziu stiahne sám a aktivuje; stránka však beží so starým kódom, kým sa nenačíta znova.
// Neobnovujeme automaticky – v kríze by to mohlo prerušiť čítanie postupu. Používateľovi sa ponúkne tlačidlo.
import { VERSION } from '../../data/version.js';

const CAN = typeof navigator !== 'undefined' && 'serviceWorker' in navigator && location.protocol.startsWith('http');
let reg = null, ready = false;
const hadController = CAN && !!navigator.serviceWorker.controller;
const HOUR = 36e5;
let lastCheck = 0;

export const updateSupported = () => CAN;
export const updateReady = () => ready;
export const appVersion = () => VERSION;

function markReady() {
  if (ready) return;
  ready = true;
  window.dispatchEvent(new Event('kp-update-ready'));
}

export function initUpdates() {
  if (!CAN) return;
  // nový service worker prevzal riadenie (pri prvej inštalácii sa to ignoruje)
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (hadController) markReady(); });
  navigator.serviceWorker.ready.then((r) => { reg = r; check(); }).catch(() => {});
  // pri návrate do aplikácie (z plochy, z iného okna) najviac raz za hodinu
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && Date.now() - lastCheck > HOUR) check(); });
}

// 'latest' | 'ready' | 'offline' | 'error' | 'unsupported'
export async function checkForUpdate() {
  if (!CAN) return 'unsupported';
  if (ready) return 'ready';
  if (navigator.onLine === false) return 'offline';
  try {
    reg = reg || (await navigator.serviceWorker.getRegistration());
    if (!reg) return 'unsupported';
    lastCheck = Date.now();
    await reg.update();
    const w = reg.installing || reg.waiting;
    if (w && w.state !== 'activated') {
      // počkaj, kým sa nová verzia stiahne a aktivuje (najviac 2 minúty)
      await new Promise((resolve) => {
        const done = () => { if (w.state === 'activated' || w.state === 'redundant') { w.removeEventListener('statechange', done); resolve(); } };
        w.addEventListener('statechange', done);
        setTimeout(resolve, 120000);
        done();
      });
    }
    if (ready || w?.state === 'activated') { markReady(); return 'ready'; }
    return 'latest';
  } catch { return 'error'; }
}
const check = () => checkForUpdate();

export const applyUpdate = () => location.reload();

// Oprava: zmaže uložené súbory aplikácie a odhlási service worker, potom stránku načíta nanovo z webu.
// Údaje používateľa (localStorage) sa nedotknú. Potrebuje internet.
export async function repairApp() {
  if (CAN) {
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.all(regs.map((r) => r.unregister()));
  }
  if (typeof caches !== 'undefined') {
    for (const k of await caches.keys()) if (k.startsWith('kp-core-')) await caches.delete(k);
  }
  location.reload();
}
