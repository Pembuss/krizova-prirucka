# Krízová príručka

**Verzia beta 3.0 (17. 11. 2026)** · slovenčina, čeština, angličtina, poľština, maďarčina

Aplikácia pre domácnosti: ako sa pripraviť, ako konať a ako sa zotaviť pri živelných pohromách, výpadkoch energií, epidémiách a ďalších krízach. Kniha, plánovač a mapa sú v jednej aplikácii. Funguje bez servera, bez registrácie a aj bez internetu. Údaje používateľa zostávajú iba v jeho zariadení.

| Časť | Čo obsahuje |
|---|---|
| **Kríza teraz** | okamžitý postup pre 15 kríz, jeden krok na obrazovke alebo celý zoznam, tlačidlo 112 |
| **Príručka** | kniha so 36 kapitolami, kniha-hra s voľbami „pre teba“, vyhľadávanie, 6 príbehových scenárov, PDF a EPUB vo všetkých jazykoch |
| **Mapa** | offline mapa (Slovensko podrobne, okolie a Európa prehľadne), úkryty CO, dôležité miesta, offline únikové trasy |
| **Príprava** | plán, profil domácnosti, zásoby s nákupným zoznamom a rozpočtom v miestnej mene, energia, batohy, rodinný plán, tlač |
| **Pomoc** | úvodná inštruktáž, prehliadka so šípkami, časté otázky, návod k aplikácii v PDF |

Aplikácia má tri vzhľady: **A** Pokojný sprievodca, **B** Núdzový signál (tmavý, zapne sa aj automaticky v tmavom režime telefónu) a **C** Príručka do vrecka. Poľská a maďarská verzia sú označené ako **neoverené**, kým ich neskontroluje rodený hovoriaci (pozri [docs/TRANSLATIONS.md](docs/TRANSLATIONS.md)).

## Dokumentácia

| Dokument | Pre koho |
|---|---|
| **Návod k aplikácii** (PDF v 5 jazykoch) | používatelia – v aplikácii: Viac → Pomoc. Zdroj: `content/navod/<jazyk>.md` |
| **Časté otázky** (v aplikácii, 5 jazykov) | používatelia – zdroj: `src/data/help.js` |
| [docs/NASADENIE.md](docs/NASADENIE.md) | nasadenie: GitHub, GitHub Actions a Netlify krok za krokom |
| [docs/TECHNICKA-DOKUMENTACIA.md](docs/TECHNICKA-DOKUMENTACIA.md) | vývoj: architektúra, build, úpravy obsahu, preklady, testy, vydanie |
| [docs/TRANSLATIONS.md](docs/TRANSLATIONS.md) | prekladatelia a recenzenti PL/HU (po anglicky) |
| [SPECIFIKACIA.md](SPECIFIKACIA.md), [research/notes.md](research/notes.md) | rozhodnutia zo zadania a overené fakty so zdrojmi |

## Rýchly štart

```bash
npm install
npx playwright install chromium   # iba prvýkrát
npm run build                     # všetko: aplikácia, kniha PDF a EPUB, návody (asi 4 minúty)
npm run serve                     # http://localhost:8080
npm test                          # automatické testy v Chromiu
```

Build potrebuje Node.js 20+, `pandoc` 3.x, `poppler-utils` (pdfinfo, pdftotext), `zip` a písma *Inter* a *Noto Color Emoji* (Debian/Ubuntu: `fonts-inter`, `fonts-noto-color-emoji`). Rýchly build bez PDF a EPUB: `npm run build:web`.

## Nasadenie

Každý push do vetvy `main` spustí GitHub Actions: build, offline balík, testy. Ak všetko prejde, hotový web sa uloží do vetvy `netlify`, ktorú Netlify zverejní. Netlify sám nič nezostavuje. Postup nastavenia je v [docs/NASADENIE.md](docs/NASADENIE.md).

Hotový web (`dist/`) funguje na akomkoľvek statickom hostingu cez HTTPS a aj priamo z disku: stačí otvoriť `OTVOR-PRIRUCKU.html`.

## Offline kópia

Používateľ si v aplikácii (Nastavenia → Offline balík) stiahne ZIP s celou aplikáciou, knihou a mapou. Po rozbalení otvorí `OTVOR-PRIRUCKU.html`. Kópia funguje bez internetu aj z USB kľúča. Na Netlify je ZIP rozdelený na časti do 9 MB (limit 10 MB na súbor). Aplikácia ich stiahne a spojí do jedného súboru.

Balík na odovzdanie aj so zdrojovým kódom zostaví `npm run package`, výsledok je vo `vystupy/`.

## Súkromie

Profil domácnosti, plán a zoznamy sa ukladajú iba v `localStorage` prehliadača. Záloha do súboru môže byť šifrovaná (AES-GCM, kľúč z hesla cez PBKDF2). Na externé mapové služby sa posiela iba hľadaný text alebo súradnice, a to len keď je internet.

## Licencie

- Mapové údaje © prispievatelia OpenStreetMap ([ODbL](https://opendatacommons.org/licenses/odbl/)). Offline mapa v `src/mapdata/` je odvodená databáza OSM (ODbL) a Natural Earth (public domain).
- Zoznamy úkrytov CO: zverejnené údaje miest Nitra, Banská Bystrica, Trenčín, Žilina, Bratislava-Petržalka a Okresného úradu Michalovce. Zdroj je uvedený pri každom bode.
- [Leaflet](https://leafletjs.com/) (BSD-2-Clause). Písma Inter, Space Grotesk, Atkinson Hyperlegible a Source Serif 4 (SIL OFL) z balíkov @fontsource.
- Texty príručky sú voľne šíriteľné na nekomerčné účely s uvedením zdroja. Konečnú licenciu (napríklad CC BY-NC 4.0 pre texty a MIT pre kód) určí vlastník projektu.

**Príručka nenahrádza pokyny úradov.** V skutočnej kríze vždy platia pokyny obce, integrovaného záchranného systému a orgánov krízového riadenia.
