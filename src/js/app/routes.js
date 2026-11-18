// Zoznam obrazoviek aplikácie a ich poradie v menu.
// nav: kľúč textu v strings.js (nav.*), ico: ikona z icons.js, bare: bez hlavičky a menu (úvodná inštruktáž)
export const ROUTES = {
  '': { load: () => import('./views/home.js'), nav: 'home', ico: 'home' },
  teraz: { load: () => import('./views/now.js'), nav: 'now', ico: 'bolt' },
  kniha: { load: () => import('./views/book.js'), nav: 'book', ico: 'book' },
  mapa: { load: () => import('./views/map.js'), nav: 'map', ico: 'pin' },
  trasy: { load: () => import('./views/routes.js'), nav: 'routes', ico: 'route' },
  plan: { load: () => import('./views/plan.js'), nav: 'plan', ico: 'flag' },
  profil: { load: () => import('./views/profile.js'), nav: 'profile', ico: 'user' },
  zasoby: { load: () => import('./views/supplies.js'), nav: 'supplies', ico: 'box' },
  energia: { load: () => import('./views/energy.js'), nav: 'energy', ico: 'battery' },
  batohy: { load: () => import('./views/bags.js'), nav: 'bags', ico: 'bag' },
  rodina: { load: () => import('./views/family.js'), nav: 'family', ico: 'family' },
  karty: { load: () => import('./views/cards.js'), nav: 'cards', ico: 'cards' },
  zoznamy: { load: () => import('./views/lists.js'), nav: 'lists', ico: 'list' },
  krajiny: { load: () => import('./views/countries.js'), nav: 'countries', ico: 'globe' },
  kryty: { load: () => import('./views/shelters.js'), nav: 'shelters', ico: 'shield' },
  tlac: { load: () => import('./views/print.js'), nav: 'print', ico: 'print' },
  pomoc: { load: () => import('./views/help.js'), nav: 'help', ico: 'help' },
  nastavenia: { load: () => import('./views/settings.js'), nav: 'settings', ico: 'settings' },
  'o-aplikacii': { load: () => import('./views/about.js'), nav: 'about', ico: 'info' },
  viac: { load: () => import('./views/more.js'), nav: 'more', ico: 'menu' },
  uvod: { load: () => import('./views/onboarding.js'), nav: 'welcome', ico: 'home', bare: true },
  instalacia: { load: () => import('./views/install.js'), nav: 'install', ico: 'mobile', bare: true },
};
// Bočné menu (počítač) po skupinách; obrazovka „Viac“ používa skupiny 2–4
export const NAV_GROUPS = [
  ['', 'teraz', 'kniha', 'mapa', 'trasy'],
  ['plan', 'profil', 'zasoby', 'energia', 'batohy', 'rodina'],
  ['karty', 'zoznamy', 'krajiny', 'kryty'],
  ['tlac', 'pomoc', 'nastavenia', 'o-aplikacii'],
];
// Spodné menu (mobil)
export const TABS = ['', 'teraz', 'kniha', 'mapa', 'viac'];
// Obrazovky, pri ktorých je v spodnom menu zvýraznené „Viac“
export const UNDER_MORE = new Set([...NAV_GROUPS.slice(1).flat(), 'trasy', 'viac']);
