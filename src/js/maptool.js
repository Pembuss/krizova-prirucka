// Webstránka „Mapa a trasy“: rovnaké moduly ako v aplikácii (profil sa zdieľa cez lokálne úložisko).
import { setLang } from './app/core.js';
import { render as renderMap } from './app/views/map.js';
import { render as renderRoutes } from './app/views/routes.js';

const host = document.querySelector('[data-map-tool]');
if (host) {
  setLang(document.body.dataset.lang || 'sk');
  const a = document.createElement('div');
  const b = document.createElement('div');
  host.append(a, b);
  renderMap(a, [], { standalone: true });
  renderRoutes(b, [], { standalone: true });
}
