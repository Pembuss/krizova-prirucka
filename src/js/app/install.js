// Inštalácia aplikácie do telefónu alebo počítača (PWA): zariadenie, stav a natívne inštalačné okno.
import { store } from './store.js';

const W = typeof window !== 'undefined' ? window : {};
const mm = (q) => typeof matchMedia === 'function' && matchMedia(q).matches;

// Beží ako nainštalovaná aplikácia (spustená z ikony na ploche)?
export const isStandalone = () => ['standalone', 'fullscreen', 'minimal-ui'].some((m) => mm(`(display-mode: ${m})`)) || W.navigator?.standalone === true;
// Nainštalovať sa dá len web (https alebo lokálny server), nie kópia otvorená z disku
// (W.__KP_SHOT: snímky obrazoviek pre návod – tools/manual.mjs nastaví zariadenie, napr. 'android')
export const isWeb = () => !!W.__KP_SHOT || location.protocol === 'https:' || ['localhost', '127.0.0.1'].includes(location.hostname);

// ios · ios-other (Chrome, Firefox, Edge na iPhone) · android · desktop · inapp (prehliadač vo Facebooku, Instagrame…)
export function platform() {
  if (W.__KP_SHOT) return W.__KP_SHOT;
  const ua = navigator.userAgent || '';
  if (/FBAN|FBAV|FB_IAB|Instagram|Messenger|Line\/|LinkedInApp|Snapchat|musical_ly|TikTok|Twitter/i.test(ua)) return 'inapp';
  const ios = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  if (ios) return /CriOS|FxiOS|EdgiOS|OPiOS/.test(ua) ? 'ios-other' : 'ios';
  if (/Android/.test(ua)) return 'android';
  return 'desktop';
}

// Ponuka „Nainštalovať / Pokračovať v prehliadači“ pri prvom otvorení na webe
export const offerOnFirstRun = () => isWeb() && !isStandalone() && !store.prefs.installChoice && !store.prefs.onboarded;
// Pripomienka na domovskej obrazovke pre toho, kto zvolil prehliadač
export const showInstallHint = () => isWeb() && !isStandalone() && store.prefs.installChoice === 'browser' && !store.prefs.installHintOff && !store.prefs.installed;

// Natívne inštalačné okno (Chrome, Edge, Samsung Internet) – udalosť beforeinstallprompt zachytí main.js
export const canPrompt = () => !!W._installPrompt;
export async function promptInstall() {
  const p = W._installPrompt;
  if (!p) return 'unavailable';
  W._installPrompt = null;
  p.prompt();
  const { outcome } = await p.userChoice;
  if (outcome === 'accepted') { store.prefs.installed = true; store.savePrefs(); }
  return outcome;
}
