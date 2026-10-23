# Krízová príručka

Príručka pre domácnosti: ako sa pripraviť, ako konať a ako sa zotaviť pri živelných pohromách, výpadkoch energií, epidémiách a ďalších krízach. Projekt má tri výstupy v troch jazykoch (slovenčina, čeština, angličtina):

1. **Interaktívna kniha-hra.** Má 36 kapitol a rozcestník podľa krízy a potreby (*urob hneď / naplánuj / vedieť*). Vychádza ako HTML, PDF a EPUB.
   - Rozhodovacie body v kapitolách („Rozhodni sa“) vedú na ďalšiu vhodnú kapitolu alebo sekciu. V PDF majú čísla strán.
   - Profil čitateľa (deti, seniori, zvieratá, byt alebo dom, auto…) zvýrazní voľby „pre teba“ a na konci kapitoly odporučí ďalšie čítanie.
   - Kniha si pamätá prečítané kapitoly a ponúka návrat na poslednú voľbu.
   - Šesť príbehových scenárov sa na webe hrá interaktívne a v tlači ako číslované odseky (§).
2. **Aplikácia (plánovač).** Z profilu domácnosti zostaví osobný plán, zásoby a nákupný zoznam s rozpočtom, energie podľa scenárov, batohy, rodinný plán, mapu krytov, únikové trasy a tlač.
3. **Webstránka.** Obsahuje všetok obsah knihy, karty „Okamžite urob“, kontrolné zoznamy, prehľad 35 európskych krajín, knižnicu zdrojov, mapu a súbory na stiahnutie.

Všetko je statický web bez servera. Funguje ako inštalovateľná PWA a aj bez internetu. Údaje používateľa zostávajú iba v jeho zariadení.

## Vyskúšanie bez inštalácie

1. Rozbaľ `Krizova-prirucka.zip`.
2. V priečinku `Krizova-prirucka` otvor dvojklikom súbor **`OTVOR-PRIRUCKU.html`**.

Príručka sa otvorí v prehliadači priamo z disku, bez servera a bez inštalácie (podrobnosti sú v `NAVOD.txt`). Kniha, zoznamy a plánovač fungujú aj bez internetu. Mapa, vyhľadanie adresy a trasy internet potrebujú. Rovnaký priečinok môžeš skopírovať aj na USB kľúč.

Balík vznikne tak, že po `npm run build` premenuješ priečinok `dist/` na `Krizova-prirucka` a zabalíš ho do ZIP.

## Štruktúra

| Cesta | Obsah |
|---|---|
| `content/{sk,cs,en}/*.md` | Kapitoly knihy (Markdown, pandoc). V každom jazyku sú rovnaké súbory, ID sekcií `{#…}` aj zástupné značky `{{…}}`. |
| `src/data/` | Spoločné dáta v troch jazykoch: krízy a postupy, položky zásob, kontrolné zoznamy, krajiny, zdroje, jadrové elektrárne, štruktúra knihy, texty webu. |
| `src/data/scenarios.js` | Príbehové scenáre (uzly, voľby, hodnotenie ✔/✖, tipy s odkazmi do knihy). |
| `src/data/reader.js` | Značky profilu čitateľa (`if-kids`, `if-pets`…) a odporúčané sekcie. |
| `src/js/book.js` | Kniha na webe: profil čitateľa, zvýraznenie volieb, odporúčania, prečítané kapitoly, prehrávač scenárov. |
| `src/js/map/` | Mapa a trasy: vyhľadávanie (Nominatim, Photon), výber miesta na mape (`picker.js`), mapové podklady s automatickým prepínaním (`tiles.js`), Overpass a OSRM. |
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

## Externé služby

Pri plánovaní (keď je internet) aplikácia a mapa používajú bezplatné služby OpenStreetMap:

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
  - vytvor `content/<jazyk>/` so všetkými 35 kapitolami.

Zástupné značky v Markdowne (napríklad `{{checklist:goBagAdult}}`, `{{now:flood}}` alebo `{{foodMatrix:family4}}`) sa pri builde nahradia tabuľkami a zoznamami z dát. Kniha, web a aplikácia tak používajú rovnaké čísla.

## Kontrola pred vydaním

- `npm run build` prebehne bez upozornení a PDF hlási „kapitoly nájdené 35/35“.
- Web, kniha a aplikácia vo všetkých troch jazykoch sa načítajú bez chýb v konzole.
- Po prvej návšteve funguje web aj aplikácia v režime offline (DevTools → Network → Offline).
- Náhľad tlače (A4) pre karty, zoznamy, kapitolu knihy a dokumenty z aplikácie (Tlač) je v poriadku.
- Údaje o krytoch, sirénach a číslach sú overené na oficiálnych stránkach – sú aktuálne k októbru 2026.

## Súkromie

Profil domácnosti, plán a zoznamy sa ukladajú iba v `localStorage` prehliadača. Export do súboru je voliteľne šifrovaný (AES-GCM, kľúč z hesla cez PBKDF2). Na externé služby sa posielajú iba súradnice alebo hľadaný text potrebné na mapu a trasy.

## Licencie

- Mapové podklady © prispievatelia OpenStreetMap ([ODbL](https://opendatacommons.org/licenses/odbl/)).
- [Leaflet](https://leafletjs.com/) (BSD-2-Clause).
- Smerovanie: OSRM / FOSSGIS.
- Texty príručky web uvádza ako voľne šíriteľné na nekomerčné účely s uvedením zdroja. Konečnú licenciu (napríklad CC BY-NC 4.0 pre texty a MIT pre kód) určí vlastník projektu.

**Príručka nenahrádza pokyny úradov.** V skutočnej kríze vždy platia pokyny obce, integrovaného záchranného systému a orgánov krízového riadenia.
