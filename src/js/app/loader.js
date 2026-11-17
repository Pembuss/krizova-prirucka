// Načítanie dátových skriptov z priečinka assets/ cez <script> – funguje aj pri otvorení z disku (file://).
const SCRIPT_URL = typeof document !== 'undefined' && document.currentScript ? document.currentScript.src : '';
// Bundle je v assets/js/, dáta v assets/
export const ASSETS = SCRIPT_URL ? new URL('../', SCRIPT_URL).href : 'assets/';
const loading = {};
export function loadAsset(path) {
  if (loading[path]) return loading[path];
  loading[path] = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = ASSETS + path;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => { delete loading[path]; s.remove(); reject(new Error('asset ' + path)); };
    document.head.appendChild(s);
  });
  return loading[path];
}
