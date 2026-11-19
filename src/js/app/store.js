// Lokálne úložisko profilu a stavu (iba v zariadení), export a import (voliteľne šifrovaný).
const KEY_PROFILE = 'kp.profile';
const KEY_STATE = 'kp.state';
const KEY_PREFS = 'kp.prefs';

export const uid = () => Math.random().toString(36).slice(2, 10);

export function defaultProfile() {
  return {
    v: 1,
    location: { lat: null, lon: null, label: '', country: 'SK', setting: 'town' },
    risks: { river: false, slope: false, forest: false, chemical: false },
    members: [{ id: uid(), name: '', age: 35, sex: '', diet: {}, meds: [], conditions: '', allergies: '', mobility: 'full', powerDevice: '' }],
    pets: [],
    housing: { type: 'flat', floor: 2, elevatorDependent: false, basement: 'cellar', garden: false },
    utilities: { heating: 'gas', cooking: 'gas', water: 'public', altCooking: false, altHeating: false, backupPower: [] },
    shelter: { option: 'unknown', address: '', minutes: '', lat: null, lon: null },
    mobility: { car: 'petrol', bike: false, publicTransport: true, walkKm: 10, destinations: [] },
    supplies: { currentDays: 0, targetDays: 7, budgetMonthly: 60, waterNorm: 'nordic', hygieneWater: true, heat: false },
    concerns: [],
    family: { meet1: '', meet2: '', meet2time: '', meet3: '', outName: '', outPhone: '', contacts: [], radio: '', pmr: '', checkin: '', school: '', pickup: '', valves: '', homeShelter: '', assembly: '', notes: '' },
    places: [],
    routes: [],
  };
}
export function defaultState() {
  return { tasksDone: {}, checks: {}, prices: {}, have: {}, inventory: [], wizardDone: false, overpass: {}, nowChecks: {} };
}

function load(key, fallback) {
  try { const v = JSON.parse(localStorage.getItem(key)); return v ?? fallback; } catch { return fallback; }
}
function save(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); return true; } catch { return false; }
}
// Doplní chýbajúce kľúče z predvolieb (pre staršie uložené verzie).
function merge(def, val) {
  if (Array.isArray(def)) return Array.isArray(val) ? val : def;
  if (def && typeof def === 'object') {
    const out = { ...def };
    for (const k of Object.keys(val || {})) out[k] = k in def ? merge(def[k], val[k]) : val[k];
    return out;
  }
  return val === undefined ? def : val;
}

export const store = {
  profile: merge(defaultProfile(), load(KEY_PROFILE, {})),
  state: merge(defaultState(), load(KEY_STATE, {})),
  prefs: load(KEY_PREFS, {}),
  listeners: new Set(),
  saveProfile() { save(KEY_PROFILE, this.profile); this.emit(); },
  saveState() { if (!save(KEY_STATE, this.state)) { this.state.overpass = {}; save(KEY_STATE, this.state); } this.emit(); },
  savePrefs() { save(KEY_PREFS, this.prefs); },
  on(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); },
  emit() { for (const fn of this.listeners) fn(); },
  reset() {
    this.profile = defaultProfile(); this.state = defaultState();
    localStorage.removeItem(KEY_PROFILE); localStorage.removeItem(KEY_STATE);
    this.emit();
  },
};

// ---------- Export / import ----------
const b64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)));
const unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
async function deriveKey(password, salt) {
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: 250000, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}
// Ďalšie údaje používateľa mimo profilu: profil čitateľa knihy, prečítané kapitoly, odškrtnutia, priebeh scenárov
const EXTRA_KEYS = ['kp.reader', 'kp.read', 'kp.checks', 'kp.scen'];
const readExtra = () => Object.fromEntries(EXTRA_KEYS.map((k) => [k, load(k, null)]).filter(([, v]) => v != null));
export async function exportData(password) {
  const payload = JSON.stringify({ app: 'krizova-prirucka', v: 1, exported: new Date().toISOString(), profile: store.profile, state: { ...store.state, overpass: {} }, extra: readExtra() });
  if (!password) return payload;
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt);
  const data = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(payload));
  return JSON.stringify({ app: 'krizova-prirucka', enc: 'AES-GCM/PBKDF2-SHA256', v: 1, salt: b64(salt), iv: b64(iv), data: b64(data) });
}
export async function importData(text, password) {
  let obj = JSON.parse(text);
  if (obj.enc) {
    if (!password) throw new Error('password');
    const key = await deriveKey(password, unb64(obj.salt));
    const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(obj.iv) }, key, unb64(obj.data));
    obj = JSON.parse(new TextDecoder().decode(plain));
  }
  if (obj.app !== 'krizova-prirucka' || !obj.profile) throw new Error('format');
  store.profile = merge(defaultProfile(), obj.profile);
  store.state = merge(defaultState(), obj.state || {});
  store.saveProfile(); store.saveState();
  for (const k of EXTRA_KEYS) if (obj.extra && obj.extra[k] != null) save(k, obj.extra[k]);
}

// Záloha pre telefón: ponuka „Zdieľať“ (Súbory, Disk, e-mail, správa); inak stiahnutie súboru.
// Vráti 'shared' | 'downloaded' | 'cancelled'. Dátum poslednej zálohy sa uloží do nastavení.
export async function saveBackup(password) {
  const text = await exportData(password);
  const name = `krizova-prirucka-zaloha${password ? '-sifrovana' : ''}-${new Date().toISOString().slice(0, 10)}.json`;
  let how = 'downloaded';
  try {
    const file = new File([text], name, { type: 'application/json' });
    if (navigator.canShare?.({ files: [file] })) { await navigator.share({ files: [file], title: name }); how = 'shared'; }
  } catch (e) {
    if (e?.name === 'AbortError') return 'cancelled';
  }
  if (how === 'downloaded') download(name, text);
  store.prefs.lastBackup = Date.now();
  store.savePrefs();
  return how;
}
// Prehliadač smie údaje stránky po dlhšom nepoužívaní zmazať; nainštalovaná aplikácia o trvalé uloženie môže požiadať
export async function keepStorage() {
  try {
    if (!navigator.storage?.persist) return null;
    return (await navigator.storage.persisted()) || (await navigator.storage.persist());
  } catch { return null; }
}
// Pripomienka zálohy: nikdy nezálohované (3 dni po vyplnení profilu) alebo záloha staršia ako 30 dní
export function backupDue() {
  const pr = store.prefs, now = Date.now(), DAY = 864e5;
  if (!store.state.wizardDone || (pr.backupSnooze || 0) > now) return false;
  if (!pr.backupFirstSeen) { pr.backupFirstSeen = now; store.savePrefs(); }
  return now - (pr.lastBackup || pr.backupFirstSeen) > (pr.lastBackup ? 30 : 3) * DAY;
}
export function download(filename, text, type = 'application/json') {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
