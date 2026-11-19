// Pomoc v aplikácii: časté otázky. Texty: { sk, cs, en, pl, hu } – chýbajúci jazyk sa zobrazí po anglicky.
const L = (sk, cs, en) => ({ sk, cs, en });

export const FAQ = [
  {
    q: L('Čo je Krízová príručka?', 'Co je Krizová příručka?', 'What is the Crisis Handbook?'),
    a: L(
      'Kniha, plánovač a mapa v jednej aplikácii. Pomôže ti pripraviť domácnosť na výpadok prúdu, povodeň, požiar, epidémiu, únik chemikálií či vojnový konflikt – a keď kríza príde, prevedie ťa krok za krokom. Je zadarmo, bez reklám a bez registrácie.',
      'Kniha, plánovač a mapa v jedné aplikaci. Pomůže ti připravit domácnost na výpadek proudu, povodeň, požár, epidemii, únik chemikálií či válečný konflikt – a když krize přijde, provede tě krok za krokem. Je zdarma, bez reklam a bez registrace.',
      'A book, a planner and a map in one app. It helps you prepare your household for power cuts, floods, fires, epidemics, chemical leaks or armed conflict – and when a crisis comes, it guides you step by step. Free, no ads, no sign-up.'),
  },
  {
    q: L('Čo mám urobiť ako prvé?', 'Co mám udělat jako první?', 'What should I do first?'),
    a: L(
      'Pozri si „Kríza teraz“, aby si vedel, kde nájdeš postup, keď sa niečo stane. Potom v časti „Môj plán“ vyplň profil domácnosti (asi 5 minút) – aplikácia vypočíta zásoby a navrhne ďalšie kroky. Nakoniec si stiahni príručku v PDF a vytlač si rodinný plán.',
      'Podívej se na „Krize teď“, abys věděl, kde najdeš postup, když se něco stane. Potom v části „Můj plán“ vyplň profil domácnosti (asi 5 minut) – aplikace spočítá zásoby a navrhne další kroky. Nakonec si stáhni příručku v PDF a vytiskni si rodinný plán.',
      'Look at “Crisis now” so you know where to find instructions when something happens. Then fill in your household profile under “My plan” (about 5 minutes) – the app calculates supplies and suggests next steps. Finally, download the handbook as PDF and print your family plan.'),
  },
  {
    q: L('Funguje aplikácia bez internetu?', 'Funguje aplikace bez internetu?', 'Does the app work offline?'),
    a: L(
      'Áno. Po prvom otvorení si aplikácia uloží knihu, postupy, zoznamy aj prehľadovú mapu Európy. Podrobná mapa sa ukladá postupne podľa toho, ktoré miesta si prezrieš. Úplnú kópiu na počítač alebo USB kľúč si stiahneš v Nastaveniach („Offline balík“) – stačí ju rozbaliť a otvoriť súbor OTVOR-PRIRUCKU.html.',
      'Ano. Po prvním otevření si aplikace uloží knihu, postupy, seznamy i přehledovou mapu Evropy. Podrobná mapa se ukládá postupně podle toho, která místa si prohlédneš. Úplnou kopii na počítač nebo USB klíč si stáhneš v Nastavení („Offline balík“) – stačí ji rozbalit a otevřít soubor OTVOR-PRIRUCKU.html.',
      'Yes. After the first visit the app stores the book, instructions, lists and an overview map of Europe. The detailed map is stored as you look at places. A full copy for a computer or USB stick can be downloaded in Settings (“Offline package”) – unzip it and open OTVOR-PRIRUCKU.html.'),
  },
  {
    q: L('Ako si ju dám do mobilu ako aplikáciu?', 'Jak si ji dám do mobilu jako aplikaci?', 'How do I install it on my phone?'),
    a: L(
      'Najjednoduchšie: pri prvom otvorení zvoľ „Nainštalovať do telefónu“, alebo neskôr Viac → Pomoc → „Nainštalovať do telefónu“. Aplikácia ťa prevedie krok za krokom. Ručne: Android (Chrome) – ťukni na ⋮ vpravo hore a zvoľ „Inštalovať aplikáciu“ alebo „Pridať na plochu“. iPhone (Safari) – ťukni na ikonu Zdieľať (štvorec so šípkou) a zvoľ „Pridať na plochu“. Ikona sa objaví medzi ostatnými aplikáciami a funguje aj offline.',
      'Nejjednodušší: při prvním otevření zvol „Nainstalovat do telefonu“, nebo později Více → Nápověda → „Nainstalovat do telefonu“. Aplikace tě provede krok za krokem. Ručně: Android (Chrome) – ťukni na ⋮ vpravo nahoře a zvol „Instalovat aplikaci“ nebo „Přidat na plochu“. iPhone (Safari) – ťukni na ikonu Sdílet (čtverec se šipkou) a zvol „Přidat na plochu“. Ikona se objeví mezi ostatními aplikacemi a funguje i offline.',
      'The easiest way: when you first open the app, choose “Install on my phone”, or later go to More → Help → “Install on my phone”. The app guides you step by step. Manually: Android (Chrome) – tap ⋮ at the top right and choose “Install app” or “Add to Home screen”. iPhone (Safari) – tap the Share icon (square with an arrow) and choose “Add to Home Screen”. The icon appears among your apps and works offline.'),
  },
  {
    q: L('Kde sú uložené moje údaje?', 'Kde jsou uložena moje data?', 'Where is my data stored?'),
    a: L(
      'Iba v tvojom zariadení (v prehliadači). Nikam sa neodosielajú a nikto iný ich nevidí. Pri hľadaní adresy alebo trasy sa na verejné mapové služby pošle len hľadaný text a súradnice. V Nastaveniach si môžeš stiahnuť zálohu – aj zašifrovanú heslom.',
      'Jen ve tvém zařízení (v prohlížeči). Nikam se neodesílají a nikdo jiný je nevidí. Při hledání adresy nebo trasy se na veřejné mapové služby pošle jen hledaný text a souřadnice. V Nastavení si můžeš stáhnout zálohu – i zašifrovanou heslem.',
      'Only on your device (in the browser). Nothing is uploaded and nobody else can see it. When you search for an address or a route, only the search text and coordinates are sent to public map services. In Settings you can download a backup – optionally password-encrypted.'),
  },
  {
    q: L('Ako stiahnem celú príručku v PDF?', 'Jak stáhnu celou příručku v PDF?', 'How do I download the whole handbook as PDF?'),
    a: L(
      'Otvor „Príručka“ a v časti „Na stiahnutie“ vyber jazyk. PDF je pripravené na tlač (A4), EPUB je pre čítačky e-kníh – e-ink čítačka vydrží bez nabíjania týždne, čo sa pri výpadku prúdu hodí.',
      'Otevři „Příručka“ a v části „Ke stažení“ vyber jazyk. PDF je připravené k tisku (A4), EPUB je pro čtečky e-knih – e-ink čtečka vydrží bez nabíjení týdny, což se při výpadku proudu hodí.',
      'Open “Handbook” and pick a language under “Download”. The PDF is ready for printing (A4); the EPUB is for e-readers – an e-ink reader lasts weeks without charging, which helps in a power cut.'),
  },
  {
    q: L('Ako zmením vzhľad alebo veľkosť písma?', 'Jak změním vzhled nebo velikost písma?', 'How do I change the look or text size?'),
    a: L(
      'Ťukni na tlačidlo s paletou v hlavičke. Na výber sú dva vzhľady: 1 – Zemité karty (predvolený) a 2 – Dlaždice. Veľkosť písma zmeníš v Nastaveniach.',
      'Ťukni na tlačítko s paletou v záhlaví. Na výběr jsou dva vzhledy: 1 – Zemité karty (výchozí) a 2 – Dlaždice. Velikost písma změníš v Nastavení.',
      'Tap the palette button in the header. There are two looks: 1 – Earth tabs (default) and 2 – Tiles. You can change the text size in Settings.'),
  },
  {
    q: L('Ako zmením jazyk?', 'Jak změním jazyk?', 'How do I change the language?'),
    a: L(
      'Výberom jazyka v hlavičke (SK, CZ, EN, PL, HU) alebo v Nastaveniach. Poľská a maďarská verzia sú zatiaľ označené ako neoverené – kým ich neskontroluje rodený hovoriaci, pri dôležitých údajoch vždy over aj oficiálny zdroj.',
      'Výběrem jazyka v záhlaví (SK, CZ, EN, PL, HU) nebo v Nastavení. Polská a maďarská verze jsou zatím označené jako neověřené – dokud je nezkontroluje rodilý mluvčí, u důležitých údajů vždy ověř i oficiální zdroj.',
      'Use the language picker in the header (SK, CZ, EN, PL, HU) or Settings. The Polish and Hungarian versions are marked as unverified until a native speaker reviews them – always check important facts against an official source.'),
  },
  {
    q: L('Ako funguje „Kríza teraz“?', 'Jak funguje „Krize teď“?', 'How does “Crisis now” work?'),
    a: L(
      'Vyber, čo sa deje. Aplikácia ukáže vždy jeden krok na obrazovke – odškrtni ho a pokračuj tlačidlom „Ďalší krok“. Ak chceš vidieť všetko naraz, prepni na „Celý zoznam“. Pri kríze nájdeš aj odkaz na úkryty, únikové trasy a podrobnú kapitolu v knihe. V ohrození života vždy najprv volaj 112.',
      'Vyber, co se děje. Aplikace ukáže vždy jeden krok na obrazovce – odškrtni ho a pokračuj tlačítkem „Další krok“. Pokud chceš vidět vše najednou, přepni na „Celý seznam“. U krize najdeš i odkaz na úkryty, únikové trasy a podrobnou kapitolu v knize. V ohrožení života vždy nejdřív volej 112.',
      'Choose what is happening. The app shows one step per screen – tick it and continue with “Next step”. To see everything at once, switch to “Full list”. Each crisis also links to shelters, escape routes and the detailed book chapter. If life is in danger, always call 112 first.'),
  },
  {
    q: L('Čo znamenajú voľby „pre teba“ v knihe?', 'Co znamenají volby „pro tebe“ v knize?', 'What are the “for you” choices in the book?'),
    a: L(
      'Kniha funguje ako kniha-hra: na konci častí ponúka, kam pokračovať. Keď označíš, čo platí pre tvoju domácnosť (deti, seniori, byt, bez auta…), kniha zvýrazní voľby „pre teba“ a odporučí ďalšie kapitoly. Šípka „Späť na voľbu“ ťa vráti tam, kde si odbočil.',
      'Kniha funguje jako gamebook: na konci částí nabízí, kam pokračovat. Když označíš, co platí pro tvou domácnost (děti, senioři, byt, bez auta…), kniha zvýrazní volby „pro tebe“ a doporučí další kapitoly. Šipka „Zpět na volbu“ tě vrátí tam, kde jsi odbočil.',
      'The book works like a gamebook: at the end of sections it offers where to go next. Once you tick what applies to your household (children, seniors, flat, no car…), it highlights choices “for you” and recommends chapters. “Back to your choice” returns you to where you branched off.'),
  },
  {
    q: L('Ako vytlačím plán, karty a zoznamy?', 'Jak vytisknu plán, karty a seznamy?', 'How do I print my plan, cards and lists?'),
    a: L(
      'V časti „Viac → Tlač“ vyber, čo chceš vytlačiť (rodinný plán, karty do peňaženky, nákupný zoznam, postupové karty…). Tlač je čiernobiela, na A4, s políčkami na odškrtnutie. Vytlačený plán ulož k dokumentom a jednu kópiu daj do evakuačnej batožiny.',
      'V části „Více → Tisk“ vyber, co chceš vytisknout (rodinný plán, karty do peněženky, nákupní seznam, postupové karty…). Tisk je černobílý, na A4, s políčky k odškrtnutí. Vytištěný plán ulož k dokladům a jednu kopii dej do evakuačního zavazadla.',
      'Under “More → Print” pick what to print (family plan, wallet cards, shopping list, action cards…). Prints are black and white, A4, with tick boxes. Keep the printed plan with your documents and put a copy in your grab bag.'),
  },
  {
    q: L('Ako prenesiem údaje do iného zariadenia?', 'Jak přenesu data do jiného zařízení?', 'How do I move my data to another device?'),
    a: L(
      'V Nastaveniach zvoľ „Stiahnuť zálohu“. Súbor prenes do druhého zariadenia (e-mail, USB) a tam v Nastaveniach zvoľ „Obnoviť zo zálohy“. Takto môžeš plán zdieľať aj s rodinou.',
      'V Nastavení zvol „Stáhnout zálohu“. Soubor přenes do druhého zařízení (e-mail, USB) a tam v Nastavení zvol „Obnovit ze zálohy“. Takto můžeš plán sdílet i s rodinou.',
      'In Settings choose “Download backup”. Move the file to the other device (e-mail, USB) and choose “Restore from backup” there. You can share your plan with family the same way.'),
  },
  {
    q: L('Prečo mapa mimo Slovenska nezobrazuje podrobnosti?', 'Proč mapa mimo Slovenska nezobrazuje podrobnosti?', 'Why is the map less detailed outside Slovakia?'),
    a: L(
      'Offline mapa obsahuje podrobne Slovensko, hlavné cesty okolitých krajín a prehľad Európy. Keď si online, mapa doplní podrobnosti z OpenStreetMap. Úkryty CO sú v mape tam, kde ich mestá zverejnili – prehľad nájdeš vo „Viac → Úkryty CO“.',
      'Offline mapa obsahuje podrobně Slovensko, hlavní silnice okolních zemí a přehled Evropy. Když jsi online, mapa doplní podrobnosti z OpenStreetMap. Úkryty CO jsou v mapě tam, kde je města zveřejnila – přehled najdeš ve „Více → Úkryty CO“.',
      'The offline map covers Slovakia in detail, main roads of neighbouring countries and an overview of Europe. When online, the map adds details from OpenStreetMap. Civil-defence shelters appear where cities have published them – see “More → Shelters”.'),
  },
  {
    q: L('Nahrádza aplikácia pokyny úradov?', 'Nahrazuje aplikace pokyny úřadů?', 'Does the app replace official instructions?'),
    a: L(
      'Nie. V kríze vždy platia pokyny obce, polície, hasičov a krízových štábov. Sleduj rozhlas, televíziu a varovné SMS. Aplikácia ti pomôže pripraviť sa a nezabudnúť na dôležité kroky. V ohrození života volaj 112.',
      'Ne. V krizi vždy platí pokyny obce, policie, hasičů a krizových štábů. Sleduj rozhlas, televizi a varovné SMS. Aplikace ti pomůže připravit se a nezapomenout na důležité kroky. V ohrožení života volej 112.',
      'No. In a crisis, instructions from your municipality, police, fire service and crisis staff always come first. Follow radio, TV and warning messages. The app helps you prepare and not forget key steps. If life is in danger, call 112.'),
  },
];

// Novinky vo verzii (O aplikácii)
export const CHANGES = [
  L('Zálohovanie údajov cez ponuku telefónu, pripomienka zálohy, aktualizácia a oprava nainštalovanej aplikácie', 'Zálohování dat přes nabídku telefonu, připomínka zálohy, aktualizace a oprava nainstalované aplikace', 'Backups via the phone share menu, backup reminders, update and repair of the installed app'),
  L('Inštalácia do telefónu pri prvom otvorení: jedným ťuknutím alebo s návodom pre iPhone, Android a počítač', 'Instalace do telefonu při prvním otevření: jedním ťuknutím nebo s návodem pro iPhone, Android a počítač', 'Install on your phone when you first open the app: with one tap or with steps for iPhone, Android and computer'),
  L('Nová aplikácia: všetko na jednom mieste – kniha, kríza teraz, plán, mapa', 'Nová aplikace: vše na jednom místě – kniha, krize teď, plán, mapa', 'New app: everything in one place – book, crisis now, plan, map'),
  L('Dva vzhľady: Zemité karty a Dlaždice', 'Dva vzhledy: Zemité karty a Dlaždice', 'Two looks: Earth tabs and Tiles'),
  L('„Kríza teraz“ po krokoch s odškrtávaním', '„Krize teď“ po krocích s odškrtáváním', '“Crisis now” step by step with tick-off'),
  L('Úvodná inštruktáž, prehliadka a pomoc', 'Úvodní instruktáž, prohlídka a nápověda', 'Welcome guide, tour and help'),
  L('Celá príručka na stiahnutie v PDF a EPUB priamo v aplikácii', 'Celá příručka ke stažení v PDF a EPUB přímo v aplikaci', 'Whole handbook as PDF and EPUB right in the app'),
  L('Jazyky SK, CZ, EN, PL, HU', 'Jazyky SK, CZ, EN, PL, HU', 'Languages SK, CZ, EN, PL, HU'),
];
