// Načíta preklady PL a HU pre build (t() v src/data/ui.js ich hľadá v globalThis.KP_I18N).
import pl from '../src/i18n/pl/index.js';
import hu from '../src/i18n/hu/index.js';

globalThis.KP_I18N = { pl, hu };
globalThis.KP_I18N_MISS = new Set();
export const I18N = globalThis.KP_I18N;
