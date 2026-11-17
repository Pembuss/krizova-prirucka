// Súbory na stiahnutie (PDF, EPUB, návod, offline balík). Zoznam vytvorí build do assets/downloads.js
// (window.KP_DOWNLOADS) – obyčajný skript, ktorý funguje aj pri otvorení z disku.
const D = () => (typeof window !== 'undefined' && window.KP_DOWNLOADS) || null;
export const downloads = D;
// { file, size, pages } alebo null
export const bookFile = (lang, kind = 'pdf') => D()?.book?.[lang]?.[kind] || null;
export const manualFile = (lang) => D()?.manual?.[lang] || D()?.manual?.en || null;
export const sheltersFile = () => D()?.shelters || null;
export const offlinePackage = () => D()?.offline || null;
export const fmtSize = (bytes, lang = 'sk') => {
  const mb = bytes / 1e6;
  return `${mb >= 10 ? Math.round(mb) : mb.toFixed(1).replace('.', lang === 'en' ? '.' : ',')} MB`;
};
