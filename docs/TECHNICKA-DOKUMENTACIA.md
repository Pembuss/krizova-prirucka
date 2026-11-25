# Technická dokumentácia – Krízová príručka beta 3.0

Dokument je pre toho, kto aplikáciu upravuje, prekladá alebo vydáva. Návod pre používateľov je v aplikácii (Pomoc → Návod k aplikácii) a jeho zdroj je v `content/navod/`.

## 1. Prehľad

Aplikácia je **statická jednostránková aplikácia** (SPA) bez servera a bez databázy:

- **Smerovanie cez `#`** (`#/kniha/povodne`). Funguje rovnako na webe aj pri otvorení súboru z disku (`file://`).
- **Jeden skript** `assets/js/app.js` zabalený cez esbuild ako IIFE, nie ES modul, aby fungoval aj z disku.
- **Dáta sa načítavajú cez `<script>`**, nie cez `fetch`: kniha, preklady a mapa sú súbory `.js`, ktoré volajú globálnu funkciu (`KP_BOOK_CHAPTER(…)`, `KPMAP_ADD(…)`). Prehliadač ich tak načíta aj z `file://`.
- **PWA:** na webe (HTTPS) sa zaregistruje service worker `sw.js` a aplikácia potom funguje offline.
- **Údaje používateľa** sú len v `localStorage`.

Zostavenie robí `tools/build.mjs`: Markdown → HTML (pandoc), kniha v aplikácii, PDF a EPUB (Chromium cez Playwright), návody, ikony, service worker.

## 2. Štruktúra projektu

| Cesta | Obsah |
|---|---|
| `content/<jazyk>/*.md` | 36 kapitol knihy v jazykoch `sk`, `cs`, `en`, `pl`, `hu`. Rovnaké súbory, ID sekcií `{#…}` aj zástupné značky `{{…}}` vo všetkých jazykoch. |
| `content/navod/<jazyk>.md` | návod k aplikácii (PDF), snímky `![popis](shot:<názov>)` |
| `content/extra/` | prehľad úkrytov CO na Slovensku (len SK) |
| `src/app/index.html` | kostra aplikácie (hlavička, menu, `<main id="view">`) |
| `src/js/app/main.js` | štart, smerovač, hlavička, spodné menu, prepínač vzhľadu a jazyka |
| `src/js/app/routes.js` | zoznam obrazoviek (`ROUTES`), poradie v menu (`NAV_GROUPS`, `TABS`) |
| `src/js/app/views/*.js` | obrazovky – každá exportuje `render(el, params)`, voliteľne `update()` a `keepScroll` |
| `src/js/app/core.js` | jazyk (`LANG`, `switchLang`), preklady `t()`, `tp()` (množné číslo), `T()` (text z dát), mena (`toLocal`, `fromLocal`, `money`), formuláre |
| `src/js/app/strings.js` | texty rozhrania: `'kľúč': [sk, cs, en]` (PL a HU sú v `src/i18n/`) |
| `src/js/app/store.js` | úložisko (`kp.profile`, `kp.state`, `kp.prefs`), záloha a obnova (aj šifrovaná) |
| `src/js/app/theme.js` | dva vzhľady (a – Zemité karty, b – Dlaždice), veľkosť písma |
| `src/js/app/tour.js` | prehliadka so šípkami (kroky sa viažu na `data-tour="…"`) |
| `src/js/app/install.js`, `views/install.js` | inštalácia do telefónu: zistenie zariadenia, natívne inštalačné okno, návody (`#/instalacia`) |
| `src/js/app/bookrt.js`, `bookdata.js` | čítačka knihy: profil čitateľa, voľby „pre teba“, odporúčania, prečítané kapitoly, prehrávač scenárov, zoznamy |
| `src/js/app/downloads.js` | zoznam súborov na stiahnutie (`window.KP_DOWNLOADS` z `assets/downloads.js`) |
| `src/js/app/printdocs.js`, `tasks.js` | tlačové dokumenty, kroky plánu |
| `src/js/calc.js` | výpočty: kalórie a voda, nákupný zoznam, rozpočet, rizikový profil, energie |
| `src/js/map/` | mapa: `offline.js` (vektorové dlaždice), `offdata.js` (vyhľadávanie, miesta), `router.js` (offline trasy A*), `picker.js`, `tiles.js`, `geo.js` (online služby) |
| `src/data/*.js` | spoločné dáta v tvare `L(sk, cs, en)`: krízy, položky, zoznamy, krajiny, kniha, scenáre, pomoc (FAQ), mena, verzia |
| `src/i18n/<pl,hu>/` | poľský a maďarský preklad rozhrania (`ui.js`) a dát (`data.js`) |
| `src/css/` | `theme.css` (vzhľady, písma), `app.css`, `site.css`, `print.css`, `book-print.css` (PDF knihy), `epub.css`, `manual.css` (PDF návodu) |
| `src/sw.js` | šablóna service workera |
| `src/mapdata/` | offline mapové dáta (vygenerované, stav 27. 10. 2026) |
| `tools/build.mjs` | build všetkého |
| `tools/render.mjs` | zástupné značky v Markdowne, označenie kapitol |
| `tools/manual.mjs` | snímky obrazoviek a HTML návodu |
| `tools/package.mjs` | offline balík ZIP (pre web po častiach, alebo celý balík so zdrojákmi) |
| `tools/test.mjs` | automatické testy |
| `tools/i18n*.mjs` | kontrola a zlučovanie prekladov |
| `tools/mapdata/` | skripty na vygenerovanie offline mapy (Python) |
| `deploy/netlify.toml` | nastavenia Netlify (kopíruje sa do vetvy `netlify`); hlavičky sú v `dist/_headers`, ktorý vytvára build |
| `.github/workflows/netlify.yml` | GitHub Actions: pri pushi build a testy, pri značke `v*` alebo ručnom spustení aj nasadenie |
| `dist/` | výstup buildu (nie je v gite) |

## 3. Build

### Požiadavky

- Node.js 20 alebo novší, `npm install` (esbuild, Leaflet, Playwright, písma @fontsource).
- `pandoc` 3.x.
- `poppler-utils`: `pdfinfo` (počet strán) a `pdftotext` (čísla strán v obsahu PDF).
- `zip` (offline balík).
- Chromium: `npx playwright install chromium`.
- Písma pre PDF: *Inter* a *Noto Color Emoji* (Debian/Ubuntu: `fonts-inter`, `fonts-noto-color-emoji`).

### Príkazy

| Príkaz | Čo urobí |
|---|---|
| `npm run build` | všetko: aplikácia, kniha v 5 jazykoch, PDF a EPUB, návody k aplikácii (asi 4 min) |
| `npm run build:web` | len aplikácia, bez PDF, EPUB a návodov (pár sekúnd) – na vývoj |
| `npm run build:manual` | len návody k aplikácii nad hotovým `dist/` (po úprave `content/navod/`) |
| `npm run package:web` | offline balík ZIP rozdelený na časti do `dist/downloads/offline/` |
| `npm run package` | balík na odovzdanie (aplikácia, PDF, EPUB, zdrojový kód) do `vystupy/` |
| `npm test` | testy (`--quick`: len slovenčina, bez balíka) |
| `npm run i18n` | koľko textov chýba v PL a HU |
| `npm run serve` | lokálny server na http://localhost:8080 |

Voľby `tools/build.mjs`:

- `--no-pdf`, `--no-epub`, `--no-manual` – vynechá dané výstupy.
- `--lang=sk` – zostaví iba jeden jazyk a nezmaže `dist/` (ostatné jazyky ostanú).
- `--manual-only` – len návody.
- `--refresh` – len `assets/downloads.js` a service worker (volá ho `package.mjs --web`).
- Premenná `KP_DIST=…` určí iný výstupný priečinok.

Build zlyhá, ak niektorému jazyku chýba kapitola. Upozornenia vypíše na konci: nefunkčné odkazy, rozdiely v zástupných značkách oproti slovenčine, chýbajúce preklady, súbory nad 10 MB.

### Čo vznikne v `dist/`

| Cesta | Obsah |
|---|---|
| `index.html`, `OTVOR-PRIRUCKU.html` | aplikácia (druhý súbor je pre offline balík) |
| `app/index.html` | presmerovanie zo starých odkazov (beta 2.0) |
| `assets/js/app.js` | zabalená aplikácia |
| `assets/book/<jazyk>/index.js`, `<kapitola>.js` | kniha v aplikácii (načíta sa po kapitolách) |
| `assets/i18n/<pl,hu>.js` | preklady rozhrania a dát |
| `assets/extra/kryty-sk.js` | prehľad úkrytov CO |
| `assets/map/` | offline mapa; cestná sieť `route.js` je rozdelená na `route-1.js`, `route-2.js`… |
| `assets/downloads.js` | zoznam súborov na stiahnutie s veľkosťou a počtom strán |
| `downloads/` | `krizova-prirucka-<jazyk>.pdf/.epub`, `navod-aplikacia-<jazyk>.pdf`, `prehlad-krytov-slovensko.pdf`, `offline/` (časti ZIP) |
| `print/<jazyk>.html` | celá kniha na jednej stránke (podklad PDF) |
| `sw.js`, `manifest.webmanifest` | PWA |

## 4. Ako aplikácia funguje

### Štart a smerovanie

1. `main.js` zistí jazyk: parameter `?lang=`, potom uložená voľba, potom jazyk prehliadača.
2. Pri PL a HU najprv načíta `assets/i18n/<jazyk>.js` (`ensureLang`).
3. Vykreslí obrazovku podľa adresy za `#/`. Prvé slovo je kľúč v `ROUTES`, ďalšie časti sú parametre (`#/teraz/blackout/2` → `teraz`, `['blackout', '2']`).
4. Pri prvom otvorení na webe presmeruje na **ponuku inštalácie** `#/instalacia`: „Nainštalovať do telefónu“ alebo „Pokračovať v prehliadači“. Potom nasleduje úvodná inštruktáž `#/uvod`. Nainštalovaná aplikácia (spustená z ikony na ploche, `display-mode: standalone`) a kópia otvorená z disku idú rovno na inštruktáž. Priamy odkaz na obrazovku (napr. `#/teraz/flood`) sa otvorí hneď.

### Inštalácia do telefónu

- `install.js` zistí, či aplikácia beží nainštalovaná (`isStandalone`), či ide o web (`isWeb`) a aké je zariadenie (`platform`): `ios`, `ios-other` (Chrome na iPhone), `android`, `desktop`, `inapp` (prehliadač vo Facebooku, Instagrame…).
- `main.js` zachytí udalosť `beforeinstallprompt` (Chrome, Edge, Samsung Internet). Tlačidlo „Nainštalovať“ potom otvorí natívne inštalačné okno. Kde okno nie je (iPhone, Firefox, vstavané prehliadače), ukáže sa návod krok za krokom s prepínačom zariadenia (`#/instalacia/navod/<zariadenie>`).
- Po inštalácii (`appinstalled`) sa zobrazí `#/instalacia/hotovo`.
- Voľba sa uloží do `prefs.installChoice` (`install` / `browser`). Kto zvolil prehliadač, uvidí na Domove pripomienku. Zavrie ju natrvalo (`prefs.installHintOff`).
- Inštaláciu ponúkajú aj Nastavenia a Pomoc. V nainštalovanej aplikácii sa neponúka.
- Manifest má snímky obrazoviek (`assets/img/screens/`, z návodu v slovenčine), s ktorými Chrome na Androide ukáže väčšie inštalačné okno.
- Na iPhone má aplikácia na ploche vlastné úložisko oddelené od Safari, preto sa inštalácia ponúka ešte pred úvodnou inštruktážou.

Obrazovka (`views/*.js`) exportuje `render(el, params)` a môže vrátiť funkciu na upratanie. Voliteľne exportuje `update(el, params)` (zmena parametrov bez prekreslenia, napr. skok v rámci kapitoly) a `keepScroll`.

**Pridanie obrazovky:**

1. Vytvor `views/nova.js`.
2. Pridaj ju do `ROUTES` v `routes.js` (kľúč, `nav`, ikona) a do `NAV_GROUPS`.
3. Doplň texty `nav.<nav>` a `sub.<nav>` do `strings.js` a prekladov.

### Vzhľady

`html[data-look="a|b"]` a `html[data-size=""|l|xl]` nastavuje `theme.js`. Vzhľad `a` (Zemité karty) je predvolený, `b` je Dlaždice. Neznáma hodnota (napr. zo staršej verzie) sa nahradí predvoleným. Štýly vzhľadov sú v `theme.css`: každý vzhľad je blok premenných (`:root[data-look="…"]`) a pár úprav tvaru komponentov. Každý vzhľad má vlastné rozloženie domovskej obrazovky (`views/home.js`: `homeA`, `homeB`). Nový vzhľad pridáš v `theme.js` (`THEMES`, `THEME_COLOR`, `THEME_NUM`), v `index.html` (zoznam v úvodnom skripte), v `LOOKS` v `settings.js` a `onboarding.js`, v `theme.css` (premenné, náhľad `.look-prev-…`, `.look-sw-…`) a v textoch `look.<id>` (strings.js a src/i18n).

### Úložisko v prehliadači

| Kľúč | Kde | Obsah |
|---|---|---|
| `kp.profile` | localStorage | profil domácnosti, miesta, trasy |
| `kp.state` | localStorage | stav plánu, zásob, odškrtnutia, `wizardDone` |
| `kp.prefs` | localStorage | jazyk, vzhľad, veľkosť písma, `onboarded`, `tourDone`, `nowMode`, `installChoice`, `installHintOff`, `installed`, `lastBackup`, `backupSnooze` |
| `kp.reader`, `kp.read` | localStorage | profil čitateľa knihy, prečítané kapitoly |
| `kp.scen`, `kp.checks` | localStorage | priebeh scenárov, odškrtnutia v zoznamoch knihy |
| `kp.back`, `kp.hl`, `kp.tour`, `kp.skipIntro` | sessionStorage | návrat na voľbu, zvýraznenie hľadaného slova, prehliadka, preskočenie inštruktáže |

Záloha (`exportData` v `store.js`) obsahuje `kp.profile`, `kp.state` a `extra`, voliteľne šifrované (AES-GCM, PBKDF2). Nastavenia (`kp.prefs`) v nej nie sú, pretože patria k zariadeniu.

### Service worker (`src/sw.js`)

- **Inštalácia:** uloží všetky súbory aplikácie. Zoznam `PRECACHE` doplní build ako dvojice `[súbor, kontrolný súčet]` a v cache je súbor pod adresou `súbor?v=súčet`. Pri novej verzii sa nezmenené súbory prekopírujú zo starej cache, takže sa stiahne len to, čo sa naozaj zmenilo. Šetrí to dáta používateľov aj kredity hostingu. Mapové dáta sa ukladajú len čiastočne (index, popisy, prehľadové dlaždice).
- **Načítanie:** súbory z vlastného webu sa berú najprv z cache. Čo v cache nie je, stiahne sa a uloží: `downloads/` do `kp-docs`, `assets/map/` do `kp-map-<dátum>`, ostatné do `kp-core-<verzia>`.
- **Nová verzia:** build vypočíta verziu z obsahu súborov. Pri zmene sa stiahne nový service worker a staré `kp-core-*` sa zmažú.
- **Mapové dáta** majú cache podľa dátumu dát (`MAPS` v `sw.js`). Po novom vygenerovaní mapy treba dátum zmeniť.
- **Dlaždice z internetu** (OSM a ďalšie) sa ukladajú do `kp-tiles`, najviac 4 000 kusov.
- **Správy z aplikácie:** `version` (verzia v Nastaveniach) a `cache-docs` (uloženie PDF a EPUB všetkých jazykov na offline).

Service worker sa posiela s `Cache-Control: no-cache`, aby sa nové verzie dostali k ľuďom hneď. Hlavičky zapisuje build do `dist/_headers` (funkcia `buildHeaders`) a tento súbor čítajú Netlify aj Cloudflare Pages.

### Kniha v aplikácii

Build prevedie kapitoly cez pandoc a prepíše odkazy na `#/kniha/<kapitola>/<id>`. Výsledok uloží ako `assets/book/<jazyk>/<kapitola>.js`. Index (`index.js`) obsahuje obsah, nadpisy pre vyhľadávanie, značky čitateľa, odporúčania a texty čítačky. Ak kniha v danom jazyku nie je, aplikácia zobrazí anglickú.

### Tabuľky na telefóne

Na obrazovke užšej ako 700 px sa každá tabuľka zobrazí ako zoznam kariet (riadok = karta), aby sa nemuselo posúvať do strán. `tables.js` doplní bunkám štítok stĺpca (`data-label` z hlavičky) a tabuľke triedu `stack`, vzhľad je v `app.css` (blok „Tabuľky na telefóne“). `MutationObserver` upraví aj tabuľky, ktoré sa načítajú neskôr (kapitola knihy, prekreslenie Zásob). Tlač sa nemení, pravidlá platia len pre obrazovku. Test `npm test` kontroluje šírku 360 px v 5 jazykoch. Zásoby majú vlastné kompaktné rozloženie karty (`table.shop`).

### Aktualizácia a záloha nainštalovanej aplikácie

- **Aktualizácia** (`update.js`): service worker novú verziu stiahne a aktivuje sám (`skipWaiting`), ale otvorená stránka beží so starým kódom. `main.js` preto po zmene riadiaceho workera (`controllerchange`) ukáže pás **Aktualizovať** a stránku obnoví až po ťuknutí, aby sa neprerušilo čítanie postupu v kríze. Kontrola prebehne pri štarte a pri návrate do aplikácie (najviac raz za hodinu). V Nastaveniach je ručná kontrola a **Opraviť aplikáciu** (zmaže `kp-core-*` cache a odhlási service worker, údaje v `localStorage` sa nedotknú).
- **Záloha** (`store.js`): `saveBackup()` použije Web Share API so súborom (Súbory, Disk, e-mail, správa), inak stiahne súbor. Záloha obsahuje profil, stav a `extra` (`kp.reader`, `kp.read`, `kp.checks`, `kp.scen`). Staršie zálohy bez `extra` sa dajú obnoviť. Dátum poslednej zálohy je v `prefs.lastBackup`. `backupDue()` riadi pripomienku na Domove (nikdy nezálohované 3 dni po vyplnení profilu, alebo záloha staršia ako 30 dní, odloženie o 14 dní).
- **Trvalé úložisko:** nainštalovaná aplikácia volá `navigator.storage.persist()` (`keepStorage`), aby prehliadač údaje po dlhšom nepoužívaní nezmazal. Stav ukazujú Nastavenia.

### Mena

Ceny sú v dátach v eurách. `src/data/currency.js` určuje menu a kurz pre jazyk: CZK, PLN 4,39 (NBP 6. 11. 2026), HUF 365 (MNB okt. 2026). `toLocal` a `fromLocal` prepočítavajú pri zobrazení a pri zadávaní rozpočtu. Kurzy aktualizuj pri každom vydaní.

## 5. Úpravy obsahu

### Kapitoly knihy

- Text: `content/<jazyk>/<kapitola>.md`. Pri zmene štruktúry (nová sekcia, voľba, zástupná značka) uprav všetky jazyky.
- Build upozorní na odkazy na neexistujúce sekcie a na rozdiely v zástupných značkách oproti slovenčine.
- Poradie kapitol, časti a rozcestník: `src/data/book.js`.

**Rozhodovacie body** sa píšu ako blok `choices`. Cieľom je ľubovoľné `{#id}` v knihe. Trieda `if-…` označí voľbu pre konkrétnu domácnosť (značky sú v `src/data/reader.js`):

```markdown
::: choices
**Čo sa deje práve teraz?**

- [Voda stúpa a som ešte doma](#povodne-stupa)
- [Nemáme auto – ako odísť](#evakuacia-pesi){.if-nocar}
:::
```

Build ku každej voľbe doplní číslo a názov cieľovej kapitoly a v PDF aj číslo strany. Sekcie „Kam ďalej“ (`…-dalej`) sa zobrazia ako voľby automaticky.

**Zástupné značky** (`{{checklist:goBagAdult}}`, `{{now:flood}}`, `{{foodMatrix:family4}}`…) build nahradí tabuľkami a zoznamami z dát. Kniha a aplikácia tak používajú rovnaké čísla.

### Dáta aplikácie

| Čo | Súbor |
|---|---|
| postupy pri krízach („Kríza teraz“, postupové karty) | `src/data/crises.js` |
| zoznamy, položky zásob a ceny | `src/data/checklists.js`, `src/data/items.js` |
| krajiny (čísla, sirény, úkryty, odkazy) | `src/data/countries.js` |
| príbehové scenáre | `src/data/scenarios.js` |
| časté otázky a „Čo je nové“ | `src/data/help.js` |
| texty rozhrania | `src/js/app/strings.js` |
| verzia a dátum vydania | `src/data/version.js` (a `package.json`) |
| úkryty CO na Slovensku | `content/extra/kryty-slovensko.md`, `src/data/shelters-sk.js` |

Texty v dátach sa píšu ako `L('slovensky', 'česky', 'English')`. Poľský a maďarský preklad sa k nim priradí podľa **anglického textu** cez `src/i18n/<jazyk>/data.js`. Keď zmeníš anglický text, preklad sa stratí a build ho nahlási ako chýbajúci (pozri časť 6).

### Návod k aplikácii

- Text je v `content/navod/<jazyk>.md`.
- Snímka sa vloží ako `![popis](shot:<názov>)`. Názvy snímok a obrazovky sú v `SHOTS` v `tools/manual.mjs`.
- Viac snímok vedľa seba:

  ```markdown
  ::: {.shots .wide}
  ![Prvá](shot:now-pick)

  ![Druhá](shot:now-step)
  :::
  ```

- Rámčeky: `::: tip`, `::: note`, `::: warn`.
- Snímky sa robia zo zostaveného `dist/` v telefónovom rozlíšení (390 × 780, 2×) pre každý jazyk zvlášť.
- Po úprave textu stačí `npm run build:manual`.

## 6. Preklady

| Jazyk | Rozhranie | Dáta | Kniha |
|---|---|---|---|
| SK, CS, EN | `strings.js` (stĺpce 1–3) | `L(sk, cs, en)` v `src/data/` | `content/<jazyk>/` |
| PL, HU | `src/i18n/<jazyk>/ui.js` | `src/i18n/<jazyk>/data.js` (kľúč = anglický text) | `content/<jazyk>/` |

- `npm run i18n` vypíše, koľko textov v PL a HU chýba. Skontroluje aj zástupné znaky `{n}` a neznáme kľúče. S voľbou `--write` uloží chýbajúce texty do `tools/.tmp/`.
- `node tools/i18n-merge.mjs list <kontext> [od] [do]` vypíše očíslované anglické texty na preklad.
- `node tools/i18n-merge.mjs merge <jazyk> <kontext> <súbor.tsv>` zlúči preklad (`číslo<TAB>preklad`) do `data.js`.
- Po zmene zdrojových textov zmaž `tools/.tmp/i18n-source.json`.
- Množné číslo: v `ui.js` pre PL je pole `[1, 2–4, 5+]`, pre HU stačí jeden tvar.
- **Neoverený preklad:** v `src/data/ui.js` má jazyk `unverified: true`. Aplikácia potom ukáže upozornenie (inštruktáž, Nastavenia, Príručka) a PDF ho má na obálke. Po kontrole rodeným hovoriacim stačí `unverified` odstrániť. Postup pre recenzentov je v [TRANSLATIONS.md](TRANSLATIONS.md).

**Nový jazyk** (napríklad nemčina):

1. Do `LANGS` v `src/data/ui.js` a do `LANGS` v `src/js/app/core.js` pridaj jazyk.
2. Vytvor `src/i18n/de/` podľa vzoru `pl` a zaregistruj ho v `tools/i18n-setup.mjs`.
3. Do `src/data/currency.js` doplň menu.
4. Vytvor `content/de/` so všetkými 36 kapitolami a `content/navod/de.md`.
5. Doplň názvy v `MANUAL_TITLE` (`tools/build.mjs`) a `TOC_TITLE` (`tools/manual.mjs`).
6. Spusti `npm run build`, `npm run i18n` a `npm test`.

## 7. Offline mapa

Mapa sa kreslí v prehliadači z vektorových dlaždíc v `assets/map/`. Súbory sú obyčajné skripty (`KPMAP_ADD(…)`), takže sa načítajú aj z disku. Mapa nepotrebuje server ani internet.

| Úroveň dát | Priblíženie | Obsah |
|---|---|---|
| dz 3 | 0–5 | Európa (Natural Earth): štáty, hranice, moria, jazerá, rieky, veľké cesty |
| dz 6 | 6–8 | Európa (NE) a hlavné cesty a rieky strednej Európy (OSM) |
| dz 9 | 9–11 | Stredná Európa: SK, CZ, AT, PL (juh), UA (západ) – cesty po II. triedu, železnice, rieky. Maďarsko je zatiaľ len z Natural Earth; doplní ho `hu_overpass.py`. |
| dz 12 | 12–18 | Slovensko podrobne: všetky cesty a ulice, vody, lesy, zástavba |

Ďalšie offline súbory:

- `gaz.js`: vyhľadávanie obcí, ulíc a miest Európy.
- `countries.js`: určenie štátu.
- `poi.js`: úkryty CO zo zoznamov miest, nemocnice, lekárne, hasiči, polícia, voda, defibrilátory…
- `rivers.js`: vodné toky pri dome.
- `route.js`: cestná sieť pre trasy autom, pešo a na bicykli (A*, alternatívy, riziká na trase). Build ju delí na časti do 8,5 MB kvôli limitu Netlify; `router.js` ich načíta a spojí.

**Nové vygenerovanie mapových dát** (Python 3.11+, `osmium`, `shapely`, asi 10 GB RAM):

1. Stiahni extrakty OSM (`slovakia`, `czech_republic`, `austria`, `poland`, `ukraine`, napríklad z download.openstreetmap.fr) a vrstvy Natural Earth 10m (GeoJSON).
2. Spusti skripty v `tools/mapdata/` v poradí:
   1. `extract_sk.py`, `extract_nb.py` (+ `hu_overpass.py`),
   2. `shelters_src.py`,
   3. `build_tiles.py`,
   4. `build_labels.py`,
   5. `build_gaz.py`,
   6. `build_graph.py`,
   7. `finalize.py`.
3. Výsledok skopíruj do `src/mapdata/`. V `src/sw.js` zmeň dátum v `MAPS` a v `set.mapData` (strings.js) stav dát.

### Externé služby (len s internetom, voliteľné)

| Služba | Na čo | Podmienky |
|---|---|---|
| tile.openstreetmap.org (+ .fr, .de, opentopomap) | mapové podklady | [Tile Usage Policy](https://operations.osmfoundation.org/policies/tiles/) |
| photon.komoot.io, nominatim.openstreetmap.org | vyhľadanie adresy | Nominatim najviac 1 požiadavka/s |
| overpass-api.de (+ záložné) | miesta v okolí, riziká na trase | verejné inštancie, občas preťažené |
| routing.openstreetmap.de, router.project-osrm.org | trasy mimo offline siete | demo servery, nie na veľkú záťaž |

Adresy sú v `src/js/map/geo.js`. Pri veľkej návštevnosti ich treba nahradiť vlastnými alebo platenými službami.

## 8. Testy

`npm test` (`tools/test.mjs`) spustí lokálny server nad `dist/` a v Chromiu overí:

1. Žiadny súbor nemá viac ako 10 MB (limit Netlify).
2. Všetky súbory v `assets/downloads.js` existujú a sedí im veľkosť. Kniha (PDF, EPUB) a návod sú vo všetkých jazykoch a kniha v aplikácii má 36 kapitol.
3. V každom z 5 jazykov sa zobrazí 31 obrazoviek (vrátane návodov na inštaláciu pre všetky zariadenia) bez chýb v konzole a bez chýbajúcich súborov. Externé služby sú v testoch blokované.
4. Prvé otvorenie na webe ponúkne inštaláciu. Bez natívneho okna sa ukáže návod, „Pokračovať v prehliadači“ vedie na inštruktáž a na Domove je pripomienka, ktorá sa dá zavrieť. Nainštalovaná aplikácia ponuku nezobrazí.
5. Offline trasa Bratislava → Žilina vyjde v rozumnej dĺžke, čím sa overí aj načítanie rozdelenej cestnej siete.
6. Service worker sa aktivuje a uloží všetky súbory. Nová verzia service workera znova nestiahne žiadny nezmenený súbor. Domovská obrazovka, kapitola knihy aj Kríza teraz fungujú bez internetu.
7. Offline balík sa stiahne cez tlačidlo v Nastaveniach a kontrolný súčet spojeného ZIP sedí.

GitHub Actions spúšťa rýchle testy (`--quick`) pri každom pushi a úplné testy pred každým nasadením. Ak niektorý zlyhá, nová verzia sa nezverejní. Premenná `KP_DIST` nasmeruje build aj testy do iného priečinka.

## 9. Vydanie novej verzie

1. Zmeň verziu v `src/data/version.js` (`VERSION`, `VERSION_ID`, `VERSION_DATE`) a v `package.json`.
2. Doplň „Čo je nové“ (`CHANGES` v `src/data/help.js`) a skontroluj `src/NAVOD.txt`.
3. Over kurzy mien (`src/data/currency.js`) a dátum údajov (`EDITION` v `tools/build.mjs`).
4. Spusti `npm run build`, potom `npm run package:web` a `npm test`. Build nesmie hlásiť upozornenia.
5. Ručne skontroluj:
   - náhľad tlače (A4) kariet, zoznamov, kapitoly a dokumentov z časti Tlač,
   - PDF knihy a návodu v aspoň dvoch jazykoch,
   - telefón: inštaláciu na plochu a režim lietadlo.
6. `git push` do `main`, potom nasadenie: značka verzie (`git tag v3.0.1 && git push origin v3.0.1`) alebo na GitHube **Actions → Build a nasadenie (Netlify) → Run workflow**. Pozri [NASADENIE.md](NASADENIE.md).
7. Balík na odovzdanie: `npm run package` → `vystupy/`.

## 10. Známe obmedzenia

- Poľská a maďarská verzia nie sú overené rodeným hovoriacim.
- Úkryty CO sú v mape len pre slovenské mestá, ktoré zverejnili zoznamy. Pre Česko, Poľsko a Maďarsko aplikácia odkazuje na oficiálne zdroje (Krajiny Európy).
- Maďarsko je v offline mape zatiaľ len prehľadné. Offline trasy fungujú na Slovensku a na hlavných cestách susedov.
- Safari na iPhone môže po dlhšom nepoužívaní vymazať údaje webu, ak aplikácia nie je pridaná na plochu. Návod preto odporúča pridanie na plochu a zálohu.
