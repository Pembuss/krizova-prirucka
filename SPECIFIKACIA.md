# Krízová príručka – špecifikácia (výsledok dotazníka)

Dátum: 22. 10. 2026

## Rozhodnutia z dotazníka

| Oblasť | Rozhodnutie |
|---|---|
| Jazyk | Slovenčina + čeština + angličtina (prepínač vo všetkých výstupoch) |
| Geografia | Slovensko detailne, Európa prehľadovo |
| Typy kríz | Živelné pohromy (povodne, búrky, zemetrasenia, požiare, horúčavy, mrazy, zosuvy), výpadky energií, epidémie a pandémie, ozbrojený konflikt a terorizmus, jadrová, chemická a priemyselná havária, výpadok vody, komunikácií a kybernetický útok, ekonomická a zásobovacia kríza |
| Technológia | Offline-first web + PWA (inštalovateľná, funguje bez internetu; mapy, trasy a živé dáta potrebujú internet iba pri plánovaní) |
| Dáta krytov | Kombinácia: prehľad krajín s odkazmi na oficiálne mapy + živá mapa z OpenStreetMap + vlastné miesta používateľa + offline vyrovnávacia pamäť |
| Únikové trasy | Automatické alternatívy na mape (auto, pešo, bicykel), viac cieľov, upozornenia na rizikové miesta (rieky, mosty, tunely), tlačová karta trás |
| Súkromie | Údaje iba lokálne v zariadení + export a import do súboru |
| Hosting | GitHub repozitár + GitHub Pages; stavia sa lokálne, repozitár doplní používateľ (`owner/repo`) |
| Kniha | HTML (s rozcestníkom podľa potreby) + PDF + EPUB |
| Rozsah knihy | Komplexná, vrstvená: ~25 kapitol, každá začína rámčekom „Okamžite urob“ |
| Ďalšie moduly | Prvá pomoc a zdravie; zraniteľné skupiny a zvieratá; komunikácia a informácie; sebestačnosť a komunita |
| Tlač | Kontrolné zoznamy, rodinný plán + kartička do peňaženky, postupové karty krok za krokom, nákupný zoznam a rotácia zásob (A4, čiernobiela tlač) |
| Ceny | Orientačné ceny v EUR (SK trh), používateľ ich môže upraviť; rozpočet a postupný nákup |
| Profil domácnosti | Rozšírený: členovia a vek, bývanie, ukrytie, zásoby, mobilita, diéty a alergie, lieky a pomôcky, zvieratá, kúrenie a varenie, zdroj vody, poschodie, blízkosť rizík, rozpočet |
| Dizajn | Štýl civilnej ochrany (oranžová a modrá), vysoký kontrast, veľké ovládacie prvky, tmavý režim, prístupnosť |

## Výstupy

1. **Interaktívna kniha** – `kniha/` (HTML), `kniha/krizova-prirucka-{sk,cs,en}.pdf`, `kniha/krizova-prirucka-{sk,cs,en}.epub`.
   Rozcestník: „Čo sa deje?“ → typ krízy → „Čo potrebujem: vedieť / naplánovať / urobiť hneď“ → kapitoly.
2. **Aplikácia (plánovač)** – `app/`: sprievodca profilom → osobný plán, zásoby, nákupný zoznam, mapa krytov, únikové trasy, tlač.
3. **Webstránka** – `index.html` a podstránky: všetok obsah, knižnica príručiek, prehľad krajín, mapa, aplikácia, na stiahnutie.

## Architektúra

- Statický web bez serverovej časti; vanilla JS (ES moduly), Leaflet uložený lokálne.
- Jediný zdroj obsahu: `content/{sk,cs,en}/*.md` (kapitoly knihy) + `src/data/*.js` (krízy, zásoby, krajiny, zdroje).
- Build (`tools/build.mjs`): Markdown → HTML kniha, web; pandoc → EPUB; Chromium (Playwright) → PDF.
- Service worker: prekeš celej aplikácie; dlaždice máp a výsledky Overpass ukladané pre oblasť používateľa.
- Externé služby (iba pri pripojení): OSM dlaždice, Nominatim (geokódovanie), Overpass (kryty, nemocnice, voda…), OSRM / routing.openstreetmap.de (trasy).
