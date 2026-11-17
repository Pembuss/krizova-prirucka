// Kniha v aplikácii: index (kapitoly, rozcestník, profil čitateľa, scenáre) a kapitoly v HTML.
// Build ich ukladá do assets/book/<jazyk>/ ako skripty KP_BOOK_INDEX(...) a KP_BOOK_CHAPTER(...).
import { loadAsset } from './loader.js';

/* global __BOOK_LANGS__ */
// jazyky, v ktorých je kniha zostavená (doplní build)
export const BOOK_LANGS = typeof __BOOK_LANGS__ !== 'undefined' ? __BOOK_LANGS__ : ['sk', 'cs', 'en'];
const W = window;
const B = W.__kpbook || (W.__kpbook = { idx: {}, ch: {} });
W.KP_BOOK_INDEX = (lang, d) => { B.idx[lang] = d; };
W.KP_BOOK_CHAPTER = (lang, id, html) => { (B.ch[lang] ||= {})[id] = html; };

// Jazyk knihy: zvolený, ak je preložená, inak angličtina
export const bookLang = (lang) => (BOOK_LANGS.includes(lang) ? lang : BOOK_LANGS.includes('en') ? 'en' : BOOK_LANGS[0]);

export async function bookIndex(lang) {
  const l = bookLang(lang);
  if (!B.idx[l]) await loadAsset(`book/${l}/index.js`);
  return B.idx[l];
}
export async function chapterHtml(lang, id) {
  const l = bookLang(lang);
  if (!B.ch[l]?.[id]) await loadAsset(`book/${l}/${id}.js`);
  return B.ch[l]?.[id] ?? null;
}
// Všetky kapitoly naraz (vyhľadávanie)
export async function allChapters(lang) {
  const idx = await bookIndex(lang);
  await Promise.all(idx.chapters.map((c) => chapterHtml(lang, c.id).catch(() => null)));
  return idx.chapters.map((c) => ({ ...c, html: B.ch[bookLang(lang)]?.[c.id] || '' }));
}
