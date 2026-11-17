# Nasadenie: GitHub → GitHub Actions → Netlify

Ako to funguje:

```
 main (zdrojový kód)  ──push──▶  GitHub Actions  ──▶  vetva „netlify“ (hotový web)  ──▶  Netlify  ──▶  https://….netlify.app
                                 build, testy                                         len zverejní
```

- **GitHub** uchováva zdrojový kód v súkromnom repozitári `krizova-prirucka`, vetva `main`.
- **GitHub Actions** zostaví aplikáciu, knihu (PDF, EPUB) v 5 jazykoch, návody a offline balík a spustí testy. Hotový web uloží do vetvy `netlify`. Vetva sa vždy prepíše nanovo, bez histórie.
- **Netlify** sleduje vetvu `netlify` a jej obsah zverejní tak, ako je. Sám nič nezostavuje.

## Kedy sa web aktualizuje

| Udalosť | Čo sa stane | Trvanie |
|---|---|---|
| push do `main` | rýchly build bez PDF a rýchle testy, **nič sa nezverejní** | asi 3 min |
| značka verzie `v…` (napr. `v3.0.1`) | úplný build, testy a **nasadenie** | asi 15 min |
| GitHub → **Actions → Build a nasadenie (Netlify) → Run workflow** | úplný build, testy a **nasadenie** | asi 15 min |

Prečo sa nenasadzuje pri každom pushi: na bezplatnom pláne Netlify stojí každé nasadenie kredity (pozri nižšie). Keď kredity dôjdu, Netlify web **pozastaví**.

## 1. GitHub

### 1.1 Repozitár

1. Prihlás sa na [github.com](https://github.com).
2. Vpravo hore **+ → New repository**.
3. **Repository name:** `krizova-prirucka`. **Visibility:** *Private*. Nič nepridávaj (bez README, .gitignore a licencie), repozitár musí byť prázdny.
4. **Create repository**.
5. Nahraj kód (robí to Claude, alebo ručne):
   ```bash
   git remote add origin https://github.com/<účet>/krizova-prirucka.git
   git push -u origin main
   ```

### 1.2 Povolenie pre GitHub Actions

Workflow zapisuje do vetvy `netlify`, preto potrebuje právo zápisu. Väčšinou funguje hneď, lebo ho žiada sám workflow (`permissions: contents: write`). Ak by nasadenie zlyhalo s chybou `403` alebo `Permission denied`:

1. V repozitári **Settings → Actions → General**.
2. Časť **Workflow permissions** → **Read and write permissions** → **Save**.

### 1.3 Prvé nasadenie

1. V repozitári otvor záložku **Actions**.
2. Vľavo vyber **Build a nasadenie (Netlify)**.
3. Vpravo **Run workflow** → vetva `main` → nechaj zaškrtnuté **Nasadiť na Netlify** → zelené **Run workflow**.
4. Po asi 15 minútach by mal byť beh zelený (✓). V súhrne behu je „Nasadené do vetvy netlify“.
5. V **Code → Branches** pribudne vetva `netlify` s hotovým webom: `index.html`, `assets/`, `downloads/`, `netlify.toml`, `_headers`…

Vetvu `netlify` treba vytvoriť **pred** nastavením Netlify (krok 2), aby ju Netlify mohol vybrať.

## 2. Netlify

### 2.1 Pripojenie repozitára

1. Choď na [app.netlify.com](https://app.netlify.com) a zaregistruj sa cez **GitHub** (najjednoduchšie).
2. **Add new project → Import an existing project → GitHub**.
3. GitHub sa spýta na povolenie pre aplikáciu Netlify. Vyber **Only select repositories** → `krizova-prirucka` → **Install / Authorize**.
4. V zozname repozitárov vyber `krizova-prirucka`.
5. Nastavenia projektu:

   | Pole | Hodnota |
   |---|---|
   | **Branch to deploy** | `netlify` (nie `main`!) |
   | **Base directory** | prázdne |
   | **Build command** | prázdne |
   | **Publish directory** | prázdne (alebo `.`) – určuje ho `netlify.toml` |

6. **Deploy** (alebo **Publish**). Po minúte je web na adrese typu `https://nahodny-nazov-123.netlify.app`.

Netlify občas premenuje položky v menu. Ak niektorú nenájdeš, použi vyhľadávanie v nastaveniach projektu alebo [dokumentáciu Netlify](https://docs.netlify.com/deploy/deploy-overview/).

### 2.2 Názov a adresa

- **Project configuration → General → Project details → Change project name** → napríklad `krizova-prirucka`. Adresa bude `https://krizova-prirucka.netlify.app`, ak je názov voľný.
- Vlastná doména (voliteľné): **Domain management → Production domains → Add a domain**. HTTPS certifikát Netlify nastaví sám.
- Ak má tím zapnuté „private by default“, prepni projekt na verejný (**Project configuration → Access & security → Visibility**), inak ho uvidí len tvoj tím.

### 2.3 Odporúčané nastavenia

Cesta: **Project configuration → Build & deploy → Continuous deployment**. V novšom rozhraní je to **Developer settings → Continuous deployment**.

- **Branches and deploy contexts → Configure:**
  - **Production branch:** `netlify`,
  - **Branch deploys:** *Deploy only the production branch*,
  - **Deploy Previews:** *Don't deploy pull requests* – zbytočne by sa zverejňoval zdrojový kód.
- **Build settings:** **Build command** a **Publish directory** nechaj prázdne.

### 2.4 Kontrola

- Otvor adresu webu: aplikácia sa spustí úvodnou inštruktážou.
- **Viac → Nastavenia → Offline režim** má ukázať „Aplikácia je uložená v zariadení a funguje bez internetu“.
- Na telefóne pridaj aplikáciu na plochu, zapni režim lietadlo a otvor ju – musí fungovať.
- **Viac → Pomoc → Návod k aplikácii** a **Príručka → Na stiahnutie** musia stiahnuť PDF.

## 3. Kredity Netlify (bezplatný plán)

Stav podľa [cenníka Netlify](https://www.netlify.com/pricing/) a [dokumentácie](https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/credit-based-pricing-plans/) (november 2026):

| | Kredity |
|---|---|
| mesačne zadarmo | **300** (nevyčerpané sa neprenášajú) |
| jedno nasadenie | **15** |
| 1 GB prenesených dát | **20** |
| 10 000 požiadaviek | **2** |

**Keď kredity dôjdu,** Netlify všetky projekty tímu **pozastaví**. Návštevníci uvidia „Site not available“ až do začiatku ďalšieho mesiaca a na bezplatnom pláne sa kredity nedajú dokúpiť. Pre krízovú aplikáciu je to vážne riziko: najväčší záujem bude práve počas krízy.

Koľko spotrebuje Krízová príručka:

| Akcia | Dáta | Kredity (približne) |
|---|---|---|
| nový návštevník (aplikácia sa uloží na offline) | asi 4,7 MB, 250 požiadaviek | 0,15 |
| nová verzia u existujúceho používateľa | len zmenené súbory | malé |
| stiahnutie PDF knihy | 5,6 MB | 0,11 |
| stiahnutie offline balíka (ZIP) | 59 MB | 1,2 |
| nasadenie | – | 15 |

Príklad: 4 nasadenia (60 kreditov) a 240 kreditov na prevádzku stačia asi na 1 500 nových návštevníkov mesačne.

Odporúčania:

- Nasadzuj zriedka: zmeny zbieraj a nasaď naraz.
- Sleduj spotrebu: **Team → Usage & billing**.
- Pri väčšej návštevnosti alebo pred zverejnením pre širokú verejnosť:
  - **plán Netlify Personal/Pro** (viac kreditov, dokúpenie), alebo
  - **Cloudflare Pages**: bezplatný plán zatiaľ neúčtuje prenos dát ani požiadavky pri statických stránkach a limit súboru je 25 MB. Stačí pripojiť ten istý repozitár, ako produkčnú vetvu zvoliť `netlify` a nechať prázdny build. Hlavičky zo súboru `_headers` platia aj tam. Podmienky si pred prechodom over na stránke Cloudflare.

## 4. Bežná práca

**Nová verzia:**

```bash
git push origin main                       # rýchla kontrola v Actions
git tag v3.0.1 && git push origin v3.0.1   # úplný build a nasadenie
```

Alebo na GitHube **Actions → Build a nasadenie (Netlify) → Run workflow**.

**Návrat na predchádzajúcu verziu:** Netlify → **Deploys** → vyber staršie nasadenie → **Publish deploy**. Funguje okamžite, bez nového buildu a bez poplatku za nasadenie.

**Používatelia uvidia novú verziu** po ďalšom otvorení aplikácie: service worker stiahne len zmenené súbory. Verziu ukazujú Nastavenia.

## 5. Keď niečo nefunguje

| Problém | Príčina a riešenie |
|---|---|
| Beh v Actions je červený pri **Testy** | Nová verzia sa nezverejnila, na webe ostala posledná funkčná. V logu kroku je zoznam chýb (✗). Oprav ich a spusti znova. |
| Červený krok **Nasadenie do vetvy netlify**, chyba 403 | Povolenie zápisu – pozri 1.2. |
| Netlify ukazuje „Page not found“ | Netlify zverejňuje zlú vetvu (`main`) alebo priečinok. Skontroluj 2.1 a 2.3. |
| Netlify po pushi do `main` niečo zostavuje alebo hlási chybu buildu | Production branch nie je `netlify`, alebo sú zapnuté Deploy Previews či Branch deploys (2.3). |
| „Site not available“ | Došli kredity (časť 3). Počkaj na nový mesiac alebo prejdi na platený plán. |
| Na telefóne stále stará verzia | Zatvor aplikáciu úplne a otvor znova. Service worker sa aktualizuje pri otvorení. |
| Súbor nad 10 MB | Build ho nahlási a test zlyhá. Veľké dáta treba rozdeliť ako cestnú sieť (`splitRoute` v `tools/build.mjs`). |

**Limity GitHub Actions:** súkromný repozitár má na bezplatnom účte 2 000 minút mesačne. Rýchla kontrola trvá asi 3 minúty, úplný build s nasadením asi 15 minút.
