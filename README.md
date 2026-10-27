# Krízová príručka

**Verzia beta 2.0 (27. 10. 2026)**

Príručka pre domácnosti: ako sa pripraviť, ako konať a ako sa zotaviť pri živelných pohromách, výpadkoch energií, epidémiách a ďalších krízach. Projekt má tri výstupy v troch jazykoch (slovenčina, čeština, angličtina):

1. **Interaktívna kniha-hra.** Má 36 kapitol a rozcestník podľa krízy a potreby (*urob hneď / naplánuj / vedieť*). Vychádza ako HTML, PDF a EPUB.
   - Rozhodovacie body v kapitolách („Rozhodni sa“) vedú na ďalšiu vhodnú kapitolu alebo sekciu. V PDF majú čísla strán.
   - Profil čitateľa (deti, seniori, zvieratá, byt alebo dom, auto…) zvýrazní voľby „pre teba“ a na konci kapitoly odporučí ďalšie čítanie.
   - Kniha si pamätá prečítané kapitoly a ponúka návrat na poslednú voľbu.
   - Šesť príbehových scenárov sa na webe hrá interaktívne a v tlači ako číslované odseky (§).
2. **Aplikácia (plánovač).** Z profilu domácnosti zostaví osobný plán, zásoby a nákupný zoznam s rozpočtom, energie podľa scenárov, batohy, rodinný plán, mapu krytov, únikové trasy a tlač.
3. **Webstránka.** Obsahuje všetok obsah knihy, karty „Okamžite urob“, kontrolné zoznamy, prehľad 35 európskych krajín, knižnicu zdrojov, mapu a súbory na stiahnutie.

Všetko je statický web bez servera. Funguje ako inštalovateľná PWA a aj bez internetu. Údaje používateľa zostávajú iba v jeho zariadení.

Súčasťou je aj **offline mapa** a samostatný **prehľad úkrytov CO na Slovensku**:

- Offline mapa nepotrebuje internet ani služby tretích strán. Obsahuje Európu z Natural Earth, Slovensko podrobne a hlavné cesty susedných krajín z OpenStreetMap. Funguje v nej vyhľadávanie obcí a ulíc, výpočet trás a dôležité miesta vrátane úkrytov zo zoznamov miest.
- Prehľad úkrytov je na webe (`sk/kryty-slovensko.html`) aj ako PDF.

## Vyskúšanie bez inštalácie

1. Rozbaľ `Krizova-prirucka-beta-2.0.zip`.
2. V priečinku `Krizova-prirucka-beta-2.0` otvor dvojklikom súbor **`OTVOR-PRIRUCKU.html`**.

Príručka sa otvorí v prehliadači priamo z disku, bez servera a bez inštalácie (podrobnosti sú v `NAVOD.txt`). Bez internetu fungujú kniha, zoznamy, plánovač aj offline mapa s vyhľadávaním a trasami. Online mapové podklady a služby sú len voliteľný doplnok. Rovnaký priečinok môžeš skopírovať aj na USB kľúč.

Balík na stiahnutie zostaví `npm run package` (po `npm run build`). Vznikne `vystupy/Krizova-prirucka-beta-2.0.zip` s celým webom, aplikáciou, offline mapou, knihou v PDF a EPUB, prehľadom úkrytov a zdrojovým kódom.

## Štruktúra

| Cesta | Obsah |
|---|---|
| `content/{sk,cs,en}/*.md` | Kapitoly knihy (Markdown, pandoc). V každom jazyku sú rovnaké súbory, ID sekcií `{#…}` aj zástupné značky `{{…}}`. |
| `src/data/` | Spoločné dáta v troch jazykoch: krízy a postupy, položky zásob, kontrolné zoznamy, krajiny, zdroje, jadrové elektrárne, štruktúra knihy, texty webu. |
| `src/data/scenarios.js` | Príbehové scenáre (uzly, voľby, hodnotenie ✔/✖, tipy s odkazmi do knihy). |
| `src/data/reader.js` | Značky profilu čitateľa (`if-kids`, `if-pets`…) a odporúčané sekcie. |
| `src/js/book.js` | Kniha na webe: profil čitateľa, zvýraznenie volieb, odporúčania, prečítané kapitoly, prehrávač scenárov. |
| `src/js/map/` | Mapa a trasy. `offline.js` kreslí vektorové dlaždice a popisy. `offdata.js` rieši vyhľadávanie, spätné určenie adresy, dôležité miesta a toky. `router.js` počíta trasy offline (A*). `picker.js` je výber miesta, `tiles.js` prepína podklady. `geo.js` volá online služby (Photon, Nominatim, Overpass, OSRM) iba ako doplnok. |
| `src/mapdata/` | Offline mapové dáta (vygenerované, stav 27. 10. 2026). Patria sem dlaždice `3-…`, `6-…`, `9-…` a `12-….js`, ďalej `labels.js` (popisy), `gaz.js` (obce a ulice), `poi.js` (dôležité miesta a úkryty CO), `route.js` (cestná sieť), `rivers.js` a `countries.js`. |
| `tools/mapdata/` | Skripty (Python, pyosmium, shapely) na nové vygenerovanie offline mapy z OSM a Natural Earth – pozri nižšie. |
| `content/extra/kryty-slovensko.md`, `src/data/shelters-sk.js` | Samostatný prehľad úkrytov CO na Slovensku: text, údaje MV SR podľa krajov a zverejnené údaje miest. |
| `src/data/version.js` | Označenie verzie, ktoré sa zobrazuje v aplikácii, na webe a v knihe. |
| `src/js/calc.js` | Výpočty: kalórie a voda podľa veku, nákupný zoznam, rozpočet, rizikový profil, energie. |
| `src/js/app/` | Aplikácia: smerovač, sprievodca profilom, pohľady a tlačové dokumenty. Build ich zabalí (esbuild) do `assets/js/app.js`, aby fungovali aj z disku. |
| `src/css/`, `src/img/` | Štýly webu, aplikácie a tlače, logo. |
| `src/sw.js` | Šablóna service workera (offline). |
| `tools/build.mjs`, `tools/render.mjs` | Build všetkých výstupov. |
| `research/notes.md` | Overené fakty z rešerše s odkazmi na zdroje. |
| `SPECIFIKACIA.md` | Rozhodnutia z úvodného dotazníka. |
| `dist/` | Výstup buildu. Nie je v gite. |

## Požiadavky na build

- Node.js 20 alebo novší (`npm install` doinštaluje esbuild, Leaflet a Playwright).
- `pandoc` 3.x na prevod Markdown → HTML a HTML → EPUB.
- `pdftotext` (balík poppler-utils) na číslovanie strán v obsahu PDF.
- Chromium cez Playwright na PDF, ikony a obálku EPUB.
- Písma: *Inter* a *Noto Color Emoji* (Debian/Ubuntu: `fonts-inter`, `fonts-noto-color-emoji`).

```bash
npm install
npx playwright install chromium   # iba prvýkrát
npm run build                     # všetko: web, aplikácia, PDF, EPUB (asi 30 s)
npm run build:web                 # rýchlo, bez PDF a EPUB
npm run serve                     # http://localhost:8080
```

Voľby buildu:

- `--no-pdf` a `--no-epub` vynechajú PDF a EPUB.
- `--lang=sk` zostaví iba jeden jazyk.

Build zlyhá, ak niektorému jazyku chýba kapitola. Upozornenia (napríklad z pandocu) vypíše na konci.

## Nasadenie

### A) GitHub Pages cez GitHub Actions (odporúčané)

1. Vytvor repozitár na GitHube a nahraj doň projekt:
   ```bash
   git remote add origin https://github.com/<owner>/<repo>.git
   git push -u origin main
   ```
2. V repozitári otvor **Settings → Pages → Build and deployment → Source** a zvoľ **GitHub Actions**.
3. Workflow `.github/workflows/pages.yml` pri každom pushi do `main` zostaví všetky výstupy a nasadí ich. Stránka bude na `https://<owner>.github.io/<repo>/`.

Všetky cesty sú relatívne, takže web funguje aj v podadresári repozitára.

### B) Akýkoľvek statický hosting

Spusti `npm run build` a obsah priečinka `dist/` nahraj na ľubovoľný webový server (Netlify, Cloudflare Pages, vlastný server). Pre offline režim musí server bežať cez **HTTPS**.

Pri ručnom nasadení na vetvu `gh-pages` je v `dist/` pripravený súbor `.nojekyll`.

## Offline mapa

Mapa sa kreslí v prehliadači z vektorových dlaždíc v `assets/map/`. Súbory sú obyčajné skripty (`KPMAP_ADD(…)`), preto sa dajú načítať aj pri otvorení z disku. Mapa nepotrebuje server ani internet.

| Úroveň dát | Priblíženie | Obsah |
|---|---|---|
| dz 3 | 0–5 | Európa (Natural Earth): štáty, hranice, moria, jazerá, rieky, veľké cesty |
| dz 6 | 6–8 | Európa (NE) a hlavné cesty a rieky strednej Európy (OSM) |
| dz 9 | 9–11 | Stredná Európa: SK, CZ, AT, PL (juh), UA (západ) – cesty po II. triedu, železnice, rieky; Slovensko podrobnejšie. Maďarsko je vo verzii beta 2.0 len z Natural Earth (server Overpass bol pri tvorbe dát nedostupný); `hu_overpass.py` ho doplní. |
| dz 12 | 12–18 | Slovensko podrobne: všetky cesty a ulice, spevnené poľné cesty, vody, lesy, zástavba, parky |

Offline fungujú aj tieto časti mapy:

- **Vyhľadávanie** (`gaz.js`): obce a časti SK a okolia, ulice SK, mestá Európy.
- **Spätné určenie adresy a štátu** (`countries.js`).
- **Dôležité miesta** (`poi.js`): kryty a úkryty CO zo zoznamov miest, nemocnice, lekárne, hasiči, polícia, obecné úrady, pitná voda, podzemné garáže, defibrilátory a čerpacie stanice.
- **Kontrola vodného toku pri dome** (`rivers.js`).
- **Výpočet trás** (`route.js`) autom, pešo a na bicykli. Cestná sieť obsahuje Slovensko a hlavné cesty susedov. Trasa má alternatívy, pokyny a riziká na trase (mosty, rieky, tunely).

Online podklady a služby (nižšie) sú len voliteľné. Prepínajú sa v mape ikonou vrstiev. Cieľ mimo offline siete vypočíta OSRM, ak je internet.

### Nové vygenerovanie mapových dát

Potrebuješ Python 3.11+ s balíkmi `osmium` a `shapely`, asi 10 GB RAM a 6 GB miesta na disku. Postup:

1. Stiahni extrakty OSM, napríklad z [download.openstreetmap.fr](https://download.openstreetmap.fr/extracts/europe/):
   - `slovakia`, `czech_republic`, `austria`, `poland`, `ukraine`;
   - Maďarsko cez Overpass skriptom `tools/mapdata/hu_overpass.py`.
2. Stiahni vrstvy Natural Earth 10m (GeoJSON).
3. Spusti skripty v tomto poradí:
   1. `extract_sk.py`, `extract_nb.py` (+ `hu_overpass.py`) – výber údajov z OSM;
   2. `shelters_src.py` – zoznamy úkrytov miest;
   3. `build_tiles.py` – dlaždice;
   4. `build_labels.py` – popisy a názvy ulíc;
   5. `build_gaz.py` – vyhľadávanie, miesta, toky;
   6. `build_graph.py` – cestná sieť;
   7. `finalize.py` – index a hranice štátov.
4. Výsledok skopíruj do `src/mapdata/`.

Zdrojový archív v balíku `zdrojovy-kod/` mapové dáta neobsahuje, aby sa veľkosť balíka nezdvojnásobila. Rovnaké súbory nájdeš v balíku v priečinku `assets/map/` – na build ich skopíruj do `src/mapdata/`.

Cesty k vstupom sú na začiatku skriptov.

## Externé služby (voliteľné, s internetom)

Keď je internet, aplikácia a mapa môžu navyše použiť bezplatné služby OpenStreetMap:

| Služba | Na čo | Podmienky |
|---|---|---|
| tile.openstreetmap.org | mapové dlaždice (len na webe – pri otvorení z disku server bez hlavičky Referer vracia „Access blocked“) | [Tile Usage Policy](https://operations.osmfoundation.org/policies/tiles/). Pri veľkej návštevnosti treba vlastný server alebo komerčného poskytovateľa. |
| tile.openstreetmap.fr (HOT), tile.openstreetmap.de, tile.opentopomap.org | ďalšie mapové podklady; z disku sa predvolene používa humanitárna mapa HOT, prepínač je vpravo hore v mape | podmienky jednotlivých prevádzkovateľov |
| photon.komoot.io | vyhľadanie adresy a návrhy počas písania (z disku ako prvé, inak záloha za Nominatim) | verejná služba Komoot, primeraná záťaž |
| nominatim.openstreetmap.org | vyhľadanie adresy | [Usage Policy](https://operations.osmfoundation.org/policies/nominatim/), najviac 1 požiadavka za sekundu |
| overpass-api.de (+ 3 záložné) | kryty, nemocnice, voda, rizikové miesta na trase | verejné inštancie, občas preťažené – aplikácia prepína medzi nimi |
| routing.openstreetmap.de, router.project-osrm.org | únikové trasy autom, pešo a na bicykli | demo servery FOSSGIS / OSRM, nie na veľkú záťaž |

Adresy služieb sú v `src/js/map/geo.js`. Pri verejnom nasadení s väčšou návštevnosťou ich odporúčam nahradiť vlastnými inštanciami alebo platenými službami.

## Rozhodovacie body v kapitolách

Voľba sa v Markdowne píše ako blok `choices`. Cieľom je ľubovoľné `{#id}` v knihe. Trieda `if-…` označí voľbu pre konkrétnu domácnosť (zoznam značiek je v `src/data/reader.js`):

```markdown
::: choices
**Čo sa deje práve teraz?**

- [Voda stúpa a som ešte doma](#povodne-stupa)
- [Nemáme auto – ako odísť](#evakuacia-pesi){.if-nocar}
:::
```

Build ku každej voľbe doplní číslo a názov cieľovej kapitoly a sekcie a v PDF aj číslo strany. Sekcie „Kam ďalej“ (`…-dalej`) sa zobrazia ako voľby automaticky.

## Úpravy obsahu

- **Text kapitoly:** uprav `content/<jazyk>/<kapitola>.md` a pri zmene štruktúry aj ostatné dva jazyky. Build upozorní na odkazy na neexistujúce sekcie a na rozdiely v zástupných značkách oproti slovenčine.
- **Postupy pri krízach a karty „Okamžite urob“:** `src/data/crises.js`.
- **Zoznamy, položky a ceny:** `src/data/checklists.js` a `src/data/items.js`.
- **Krajiny:** `src/data/countries.js` (čísla, sirény, kryty, odkazy na mapy).
- **Kapitoly a rozcestník:** `src/data/book.js`.
- **Nový jazyk:**
  - pridaj stĺpec do `L(...)` v dátach a do `src/js/app/strings.js`;
  - doplň `LANGS` v `src/data/ui.js`;
  - vytvor `content/<jazyk>/` so všetkými 36 kapitolami.

Zástupné značky v Markdowne (napríklad `{{checklist:goBagAdult}}`, `{{now:flood}}` alebo `{{foodMatrix:family4}}`) sa pri builde nahradia tabuľkami a zoznamami z dát. Kniha, web a aplikácia tak používajú rovnaké čísla.

## Kontrola pred vydaním

- `npm run build` prebehne bez upozornení a PDF hlási „kapitoly nájdené 36/36“.
- Offline mapa, vyhľadanie a trasy fungujú pri otvorení z disku bez internetu (DevTools → Network → Offline).
- Web, kniha a aplikácia vo všetkých troch jazykoch sa načítajú bez chýb v konzole.
- Po prvej návšteve funguje web aj aplikácia v režime offline (DevTools → Network → Offline).
- Náhľad tlače (A4) pre karty, zoznamy, kapitolu knihy a dokumenty z aplikácie (Tlač) je v poriadku.
- Údaje o krytoch, sirénach a číslach sú overené na oficiálnych stránkach – sú aktuálne k októbru 2026.

## Súkromie

Profil domácnosti, plán a zoznamy sa ukladajú iba v `localStorage` prehliadača. Export do súboru je voliteľne šifrovaný (AES-GCM, kľúč z hesla cez PBKDF2). Na externé služby sa posielajú iba súradnice alebo hľadaný text potrebné na mapu a trasy.

## Licencie

- Mapové údaje © prispievatelia OpenStreetMap ([ODbL](https://opendatacommons.org/licenses/odbl/)). Offline mapa v `src/mapdata/` je odvodená databáza OSM (ODbL) a Natural Earth (public domain).
- Zoznamy úkrytov CO: zverejnené údaje miest Nitra, Banská Bystrica, Trenčín, Žilina, Bratislava-Petržalka a Okresného úradu Michalovce (zdroj je uvedený pri každom bode).
- [Leaflet](https://leafletjs.com/) (BSD-2-Clause).
- Smerovanie: OSRM / FOSSGIS.
- Texty príručky web uvádza ako voľne šíriteľné na nekomerčné účely s uvedením zdroja. Konečnú licenciu (napríklad CC BY-NC 4.0 pre texty a MIT pre kód) určí vlastník projektu.

**Príručka nenahrádza pokyny úradov.** V skutočnej kríze vždy platia pokyny obce, integrovaného záchranného systému a orgánov krízového riadenia.
