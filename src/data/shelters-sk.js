// Úkryty civilnej ochrany na Slovensku – súhrn MV SR podľa krajov a zverejnené údaje miest a okresov.
// Zdroj krajov: MV SR, Prehľad ukrytia na území SR k 31. 12. 2025 (príloha k č. SKR-COKP2-2026/0001517-013).

export const SHELTER_SOURCE = {
  label: 'MV SR – Prehľad ukrytia na území SR k 31. 12. 2025',
  url: 'https://www.minv.sk/swift_data/source/civilna_ochrana/dokument_skr/co_oddelenie/Prehlad%20ukrytia%20na%20uzemi%20Slovenskej%20republiky%20k%2031.12.2025.pdf',
};

// [kraj, ukrývaní spolu, OÚ počet, OÚ kapacita, PÚ počet, PÚ kapacita, OÚ+PÚ počet, OÚ+PÚ kapacita, % OÚ+PÚ, JÚBS počet, JÚBS kapacita, % JÚBS]
// Hodnoty presne podľa MV SR. Súčet krajov OÚ+PÚ je 1 476, súhrnný riadok MV SR uvádza 1 474 (rozdiel v podklade za Prešovský kraj).
export const SHELTER_REGIONS = [
  ['Bratislavský', 1004890, 322, 60927, 85, 14368, 407, 75295, 7.49, 19691, 804119, 80],
  ['Trnavský', 682298, 28, 5745, 31, 4522, 59, 10267, 1.50, 20199, 807268, 118],
  ['Nitriansky', 703222, 33, 5970, 112, 9821, 145, 16027, 2.38, 39848, 963318, 134],
  ['Trenčiansky', 624544, 118, 28585, 94, 12100, 212, 40685, 7.26, 52837, 824767, 147],
  ['Žilinský', 793573, 130, 27111, 64, 9483, 194, 36594, 4.61, 54392, 976409, 123],
  ['Banskobystrický', 686274, 97, 24048, 85, 13844, 182, 37892, 5.52, 36687, 885441, 129],
  ['Prešovský', 933415, 36, 7845, 80, 10878, 116, 18423, 2.00, 39081, 930219, 100],
  ['Košický', 941342, 140, 25921, 21, 3170, 161, 29091, 3.00, 41769, 877722, 93],
];
export const SHELTER_TOTAL = ['Slovenská republika', 6369558, 904, 185852, 572, 78186, 1474, 264038, 4.15, 304504, 7069263, 111];

// Zverejnené údaje miest a okresov. map: body sú v offline mape aplikácie.
const S = {
  bad: { label: 'Bratislavaden.sk, 2022', url: 'https://bratislavaden.sk/kde-su-v-bratislave-co-kryty-niektore-mestske-casti-nemaju-ziadny-ukryt-v-pripade-vojny/' },
  pe: { label: 'MČ Petržalka cez Bratislava24, 2022', url: 'https://bratislava.dnes24.sk/mestske-casti-davaju-dokopy-zoznam-krytov-kde-sa-mozete-ukryt-v-petrzalke-411746' },
  sui: { label: 'Startitup (SITA, TASR), 2022', url: 'https://www.startitup.sk/situacia-s-krytmi-je-na-slovensku-biedna/' },
  nr: { label: 'Mesto Nitra – webmapa krytov CO', url: 'https://www.arcgis.com/home/item.html?id=1f20c2e21e4743b6a000d007343c484a' },
  stvr: { label: 'STVR, 2024', url: 'https://spravy.stvr.sk/2024/11/podzemne-ukryty-su-v-zalostnom-stave-a-len-pre-kazdeho-dvadsiateho-slovaka-samospravy-nemaju-peniaze/' },
  tn: { label: 'Mesto Trenčín – Civilná ochrana', url: 'https://trencin.sk/pre-obcanov/o-meste/civilna-ochrana/' },
  tno: { label: 'MV SR cez Trenčín24, 2022', url: 'https://trencin.dnes24.sk/ukryty-civilnej-ochrany-v-okrese-trencin-aku-maju-kapacitu-412720' },
  za: { label: 'Mesto Žilina cez Žilina24 (TASR), 2022', url: 'https://zilina.dnes24.sk/kryty-civilnej-obrany-v-ziline-aku-maju-kapacitu-a-kde-sa-nachadzaju-video-411897' },
  zav: { label: 'Žilinský večerník', url: 'https://www.zilinskyvecernik.sk/clanok/pod-zilinou-je-skrytych-99-co-krytov/3883/' },
  bb: { label: 'Mapa CO krytov Banská Bystrica', url: 'https://ukrytybb.netlify.app/' },
  zv: { label: 'OÚ Zvolen cez TASR, 2022', url: 'https://www.teraz.sk/regiony/okres-zvolen-ma-32-odolnych-a-plynotes/621673-clanok.html' },
  pp: { label: 'OÚ Poprad cez Poprad24, 2022', url: 'https://poprad.dnes24.sk/kryty-civilnej-obrany-v-popradskom-okrese-aku-maju-kapacitu-412022' },
  po: { label: 'Mesto Prešov – zoznam úkrytov vo vlastníctve mesta (PDF)', url: 'https://www.presov.sk/download_file_f.php?id=902358' },
  ke: { label: 'Mesto Košice – Civilná ochrana', url: 'https://www.cokosice.sk/-ukrytie-obyvatelstva' },
  mi: { label: 'Okresný úrad Michalovce – zoznam úkrytov (PDF)', url: 'https://minv.sk/swift_data/source/miestna_statna_sprava/okres_michalovce/okr/informacie/Zoznam_ukrytov_pre_obyvatelstvo2.pdf' },
};
// [kraj, mesto/okres, údaje, zdroj, v mape aplikácie]
export const SHELTER_CITIES = [
  ['Bratislavský', 'Bratislava – Staré Mesto', '62 krytov CO v správe mestskej časti (6 obnovených), ďalších 6 v školách a 60 v súkromných objektoch.', S.bad, false],
  ['Bratislavský', 'Bratislava – Nové Mesto', '35 krytov v správe mestskej časti, mesačná kontrola elektriny a filtroventilácie. Ďalšie spravujú družstvá a firmy.', S.bad, false],
  ['Bratislavský', 'Bratislava – Ružinov', '57 krytov CO; zoznam mestská časť nezverejnila.', S.bad, false],
  ['Bratislavský', 'Bratislava – Petržalka', 'Verejné odolné a plynotesné úkryty nie sú. 24 jednoduchých úkrytov (podzemné garáže, suterény) s kapacitou takmer 25 000 miest – zoznam adries.', S.pe, true],
  ['Bratislavský', 'Bratislava – Podunajské Biskupice, Vrakuňa, Záhorská Bystrica', 'Podunajské Biskupice: 1 plynotesný úkryt v nemocnici (100 osôb), inak suterény (~19 500 miest). Vrakuňa: žiadny kryt CO. Záhorská Bystrica: 1 kryt, vyradený z evidencie.', S.bad, false],
  ['Trnavský', 'Trnava', 'Mesto vlastní 22 krytov (pod bytovými domami), 7 je pod školami; spolu s firemnými je kapacita asi 6 120 miest. Zoznam adries nie je zverejnený.', S.sui, false],
  ['Nitriansky', 'Nitra', 'Webmapa mesta: 17 plynotesných úkrytov a 537 jednoduchých úkrytov s adresou a kapacitou. Mesto má 18 krytov v správe, spolu pre menej ako 2 000 ľudí; 11 potrebuje novú elektroinštaláciu (2024).', S.nr, true],
  ['Trenčiansky', 'Trenčín', '76 ochranných stavieb (42 odolných, 34 plynotesných). 35 úkrytov v správe mesta, 7 v mestských školách a 4 ďalšie – adresy a kapacity.', S.tn, true],
  ['Trenčiansky', 'okres Trenčín', '49 odolných a 38 plynotesných úkrytov (PÚ pre 3 935 osôb), 9 046 jednoduchých úkrytov pre 204 265 osôb.', S.tno, false],
  ['Žilinský', 'Žilina', '94 ochranných stavieb pre viac ako 20 000 osôb. Mesto vlastní 24 (14 odolných, 10 plynotesných) – adresy. Najväčší mestský pod ul. J. Fándlyho (> 500 osôb), najväčší v meste v areáli Žilinskej univerzity (1 000).', S.za, true],
  ['Žilinský', 'okres Žilina (mimo mesta)', 'Ochranné stavby aj pri VE Horný Hričov, pod poliklinikou v Rajci, vo vápenke Varín, v Horkách a Dolnom Hričove.', S.zav, false],
  ['Žilinský', 'Martin', 'Jednoduché úkryty (pivnice, garáže) pre viac ako 43 000 osôb – podľa mesta stačia pre všetkých obyvateľov.', S.sui, false],
  ['Banskobystrický', 'Banská Bystrica', 'Mapa: 20 odolných (7 705 miest) a 47 plynotesných úkrytov (7 484 miest) s vlastníkom a kapacitou.', S.bb, true],
  ['Banskobystrický', 'okres Zvolen', '12 odolných (2 510) a 20 plynotesných úkrytov (3 635); 2 229 jednoduchých úkrytov pre 72 423 osôb. Väčšina OÚ/PÚ patrí firmám.', S.zv, false],
  ['Banskobystrický', 'Revúca', '610 jednoduchých úkrytov pre 14 206 osôb – viac, ako má mesto obyvateľov.', S.sui, false],
  ['Prešovský', 'Prešov', 'Mesto zverejnilo zoznam objektov – úkrytov CO vo svojom vlastníctve (PDF na webe mesta).', S.po, false],
  ['Prešovský', 'okres Poprad', '7 plynotesných úkrytov (1 160 miest) v Poprade a vo Svite, určené pre zamestnancov (závody, polícia, nemocnica). Jednoduché úkryty: 2 930 miest pre 67 695 osôb (64,76 %). Plynotesné úkryty pod Tatrami majú len Poprad, Svit a Stará Ľubovňa.', S.pp, false],
  ['Košický', 'Košice', '120 odolných úkrytov (23 013 miest) a 11 plynotesných (2 130); 12 384 jednoduchých úkrytov pre 234 442 osôb. Jednoduché úkryty určuje mestská časť. Podľa STVR (2024) mesto vyradilo 38 nevyhovujúcich úkrytov vo svojej správe a ponechalo 21.', S.ke, false],
  ['Košický', 'okres Michalovce', '14 odolných a 7 plynotesných úkrytov (3 617 miest), väčšinou pre zamestnancov. Pre obyvateľov: Strážske (2) a Veľké Kapušany (1) – adresy.', S.mi, true],
];
