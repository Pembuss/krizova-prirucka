// Štruktúra knihy a rozcestník (navigácia podľa potreby čitateľa).
const L = (sk, cs, en) => ({ sk, cs, en });

export const BOOK_TITLE = L('Krízová príručka', 'Krizová příručka', 'Crisis Handbook');
export const BOOK_SUBTITLE = L(
  'Ako sa pripraviť, konať a obnoviť po pohromách, výpadkoch, epidémiách a ďalších krízach',
  'Jak se připravit, jednat a obnovit po pohromách, výpadcích, epidemiích a dalších krizích',
  'How to prepare, act and recover from disasters, outages, epidemics and other crises');

export const PARTS = [
  { id: 'p0', name: L('Začni tu', 'Začni zde', 'Start here') },
  { id: 'p1', name: L('Časť I – Základy pripravenosti', 'Část I – Základy připravenosti', 'Part I – Preparedness basics') },
  { id: 'p2', name: L('Časť II – Krízy krok za krokom', 'Část II – Krize krok za krokem', 'Part II – Crises step by step') },
  { id: 'p3', name: L('Časť III – Zdravie, zručnosti a komunita', 'Část III – Zdraví, dovednosti a komunita', 'Part III – Health, skills and community') },
  { id: 'p4', name: L('Časť IV – Zoznamy, plány a príprava', 'Část IV – Seznamy, plány a příprava', 'Part IV – Lists, plans and preparation') },
  { id: 'p5', name: L('Prílohy', 'Přílohy', 'Appendices') },
];

export const CHAPTERS = [
  { id: 'rozcestnik', part: 'p0', title: L('Ako používať túto príručku – rozcestník', 'Jak používat tuto příručku – rozcestník', 'How to use this handbook – signpost') },
  { id: 'principy', part: 'p1', title: L('Princípy pripravenosti a tvoje riziká', 'Principy připravenosti a tvá rizika', 'Preparedness principles and your risks') },
  { id: 'varovanie', part: 'p1', title: L('Varovanie, informácie a spojenie', 'Varování, informace a spojení', 'Warnings, information and communication') },
  { id: 'plan', part: 'p1', title: L('Rodinný krízový plán', 'Rodinný krizový plán', 'Family emergency plan') },
  { id: 'zasoby', part: 'p1', title: L('Domáce zásoby a ich obmena', 'Domácí zásoby a jejich obměna', 'Home supplies and rotation') },
  { id: 'batozina', part: 'p1', title: L('Evakuačná batožina a dokumenty', 'Evakuační zavazadlo a dokumenty', 'Grab bag and documents') },
  { id: 'ukrytie', part: 'p1', title: L('Ukrytie: kryty, pivnice a ostať vnútri', 'Ukrytí: kryty, sklepy a zůstat uvnitř', 'Sheltering: shelters, basements and staying indoors') },
  { id: 'evakuacia', part: 'p1', title: L('Evakuácia a únikové trasy', 'Evakuace a únikové trasy', 'Evacuation and escape routes') },
  { id: 'povodne', part: 'p2', crisis: 'flood', title: L('Povodne a prívalová voda', 'Povodně a přívalová voda', 'Floods and flash floods') },
  { id: 'burky', part: 'p2', crisis: 'storm', title: L('Búrky, víchrice a krupobitie', 'Bouřky, vichřice a krupobití', 'Storms, windstorms and hail') },
  { id: 'horucavy', part: 'p2', crisis: 'heat', title: L('Horúčavy a sucho', 'Vedra a sucho', 'Heatwaves and drought') },
  { id: 'mrazy', part: 'p2', crisis: 'cold', title: L('Mrazy a snehová kalamita', 'Mrazy a sněhová kalamita', 'Extreme cold and snowstorms') },
  { id: 'poziare', part: 'p2', crisis: 'fire', title: L('Požiare v budovách a v prírode', 'Požáry v budovách a v přírodě', 'Building fires and wildfires') },
  { id: 'zemetrasenie', part: 'p2', crisis: 'quake', title: L('Zemetrasenie a zosuvy pôdy', 'Zemětřesení a sesuvy půdy', 'Earthquakes and landslides') },
  { id: 'vypadok-elektriny', part: 'p2', crisis: 'blackout', title: L('Výpadok elektriny (blackout)', 'Výpadek elektřiny (blackout)', 'Power outage (blackout)') },
  { id: 'vypadok-vody', part: 'p2', crisis: 'water', title: L('Výpadok a kontaminácia vody', 'Výpadek a kontaminace vody', 'Water outage and contamination') },
  { id: 'komunikacie', part: 'p2', crisis: 'comms', title: L('Výpadok komunikácií, kybernetický útok a platby', 'Výpadek komunikací, kybernetický útok a platby', 'Communications outage, cyberattack and payments') },
  { id: 'pandemia', part: 'p2', crisis: 'pandemic', title: L('Epidémia a pandémia', 'Epidemie a pandemie', 'Epidemics and pandemics') },
  { id: 'jadrova', part: 'p2', crisis: 'nuclear', title: L('Jadrová a radiačná havária', 'Jaderná a radiační havárie', 'Nuclear and radiological emergencies') },
  { id: 'chemicka', part: 'p2', crisis: 'chemical', title: L('Chemická a priemyselná havária', 'Chemická a průmyslová havárie', 'Chemical and industrial accidents') },
  { id: 'konflikt', part: 'p2', crisis: 'war', title: L('Ozbrojený konflikt a letecký útok', 'Ozbrojený konflikt a letecký útok', 'Armed conflict and air attacks') },
  { id: 'terorizmus', part: 'p2', crisis: 'terror', title: L('Terorizmus, násilie a nepokoje', 'Terorismus, násilí a nepokoje', 'Terrorism, violence and unrest') },
  { id: 'ekonomicka', part: 'p2', crisis: 'economic', title: L('Ekonomická a zásobovacia kríza', 'Ekonomická a zásobovací krize', 'Economic and supply crises') },
  { id: 'prva-pomoc', part: 'p3', title: L('Prvá pomoc a zdravie v kríze', 'První pomoc a zdraví v krizi', 'First aid and health in a crisis') },
  { id: 'hygiena-psychika', part: 'p3', title: L('Hygiena, sanitácia a duševné zdravie', 'Hygiena, sanitace a duševní zdraví', 'Hygiene, sanitation and mental health') },
  { id: 'zranitelni', part: 'p3', title: L('Deti, seniori, ľudia so zdravotným postihnutím a zvieratá', 'Děti, senioři, lidé se zdravotním postižením a zvířata', 'Children, older people, people with disabilities and pets') },
  { id: 'sebestacnost', part: 'p3', title: L('Sebestačnosť: voda, varenie, teplo, svetlo a energia', 'Soběstačnost: voda, vaření, teplo, světlo a energie', 'Self-reliance: water, cooking, heat, light and power') },
  { id: 'komunita', part: 'p3', title: L('Susedia, komunita a obnova po kríze', 'Sousedé, komunita a obnova po krizi', 'Neighbours, community and recovery') },
  { id: 'nakupne-zoznamy', part: 'p4', title: L('Nákupné zoznamy potravín na 3, 7, 14 a 30 dní', 'Nákupní seznamy potravin na 3, 7, 14 a 30 dní', 'Food shopping lists for 3, 7, 14 and 30 days') },
  { id: 'energie-scenare', part: 'p4', title: L('Energie a nevyhnutné potreby podľa scenárov', 'Energie a nezbytné potřeby podle scénářů', 'Power and essentials by scenario') },
  { id: 'kontrolne-zoznamy', part: 'p4', title: L('Kontrolné zoznamy', 'Kontrolní seznamy', 'Checklists') },
  { id: 'sablony', part: 'p4', title: L('Šablóny: rodinný plán, kontakty, kartička', 'Šablony: rodinný plán, kontakty, kartička', 'Templates: family plan, contacts, wallet card') },
  { id: 'kryty-europa', part: 'p5', title: L('Kryty a útočiská v Európe', 'Kryty a útočiště v Evropě', 'Shelters and refuges in Europe') },
  { id: 'zdroje', part: 'p5', title: L('Knižnica zdrojov a hodnotenie príručiek', 'Knihovna zdrojů a hodnocení příruček', 'Source library and handbook ratings') },
  { id: 'slovnik', part: 'p5', title: L('Slovník pojmov a dôležité čísla', 'Slovník pojmů a důležitá čísla', 'Glossary and key numbers') },
];

// Rozcestník: pre každú krízu kapitoly podľa potreby – urobiť hneď / naplánovať / vedieť.
export const PATHS = {
  flood: { now: ['povodne', 'evakuacia', 'prva-pomoc'], plan: ['plan', 'batozina', 'evakuacia', 'zasoby', 'kontrolne-zoznamy'], know: ['povodne', 'varovanie', 'komunita'] },
  storm: { now: ['burky', 'prva-pomoc'], plan: ['zasoby', 'energie-scenare', 'kontrolne-zoznamy'], know: ['burky', 'varovanie'] },
  heat: { now: ['horucavy', 'prva-pomoc'], plan: ['zranitelni', 'zasoby', 'energie-scenare'], know: ['horucavy', 'zranitelni'] },
  cold: { now: ['mrazy', 'sebestacnost'], plan: ['energie-scenare', 'zasoby', 'kontrolne-zoznamy'], know: ['mrazy', 'sebestacnost'] },
  fire: { now: ['poziare', 'prva-pomoc', 'evakuacia'], plan: ['plan', 'kontrolne-zoznamy'], know: ['poziare'] },
  quake: { now: ['zemetrasenie', 'prva-pomoc'], plan: ['plan', 'batozina', 'zasoby'], know: ['zemetrasenie'] },
  blackout: { now: ['vypadok-elektriny', 'sebestacnost'], plan: ['energie-scenare', 'zasoby', 'nakupne-zoznamy'], know: ['vypadok-elektriny', 'komunikacie', 'zranitelni'] },
  water: { now: ['vypadok-vody', 'hygiena-psychika'], plan: ['zasoby', 'sebestacnost', 'nakupne-zoznamy'], know: ['vypadok-vody', 'sebestacnost'] },
  comms: { now: ['komunikacie', 'varovanie'], plan: ['plan', 'sablony'], know: ['komunikacie', 'varovanie'] },
  pandemic: { now: ['pandemia', 'hygiena-psychika', 'prva-pomoc'], plan: ['zasoby', 'zranitelni', 'nakupne-zoznamy'], know: ['pandemia', 'hygiena-psychika'] },
  nuclear: { now: ['jadrova', 'ukrytie'], plan: ['ukrytie', 'zasoby', 'plan'], know: ['jadrova', 'varovanie', 'kryty-europa'] },
  chemical: { now: ['chemicka', 'ukrytie'], plan: ['ukrytie', 'kontrolne-zoznamy'], know: ['chemicka'] },
  war: { now: ['konflikt', 'ukrytie', 'prva-pomoc'], plan: ['ukrytie', 'evakuacia', 'zasoby', 'plan'], know: ['konflikt', 'varovanie', 'komunikacie', 'kryty-europa'] },
  terror: { now: ['terorizmus', 'prva-pomoc'], plan: ['plan'], know: ['terorizmus', 'hygiena-psychika'] },
  economic: { now: ['ekonomicka'], plan: ['zasoby', 'nakupne-zoznamy', 'komunita'], know: ['ekonomicka', 'komunita', 'sebestacnost'] },
};

// Všeobecné cesty podľa situácie čitateľa.
export const SITUATIONS = [
  { id: 'start', icon: '🧭', name: L('Chcem sa začať pripravovať', 'Chci se začít připravovat', 'I want to start preparing'), chapters: ['principy', 'plan', 'zasoby', 'batozina', 'nakupne-zoznamy', 'kontrolne-zoznamy', 'sablony'] },
  { id: 'leave', icon: '🚗', name: L('Musím odísť z domova', 'Musím odejít z domova', 'I have to leave home'), chapters: ['evakuacia', 'batozina', 'kontrolne-zoznamy'] },
  { id: 'hide', icon: '🏠', name: L('Musím sa ukryť', 'Musím se ukrýt', 'I need to take shelter'), chapters: ['ukrytie', 'kryty-europa', 'konflikt'] },
  { id: 'care', icon: '👪', name: L('Starám sa o deti, seniora alebo zviera', 'Starám se o děti, seniora nebo zvíře', 'I care for children, an older person or a pet'), chapters: ['zranitelni', 'batozina', 'prva-pomoc'] },
  { id: 'injured', icon: '🩹', name: L('Niekto je zranený alebo chorý', 'Někdo je zraněný nebo nemocný', 'Someone is injured or ill'), chapters: ['prva-pomoc', 'hygiena-psychika'] },
  { id: 'nopower', icon: '🔦', name: L('Nemám elektrinu, vodu ani teplo', 'Nemám elektřinu, vodu ani teplo', 'I have no power, water or heat'), chapters: ['vypadok-elektriny', 'vypadok-vody', 'sebestacnost', 'energie-scenare'] },
  { id: 'after', icon: '🔧', name: L('Kríza pominula – čo ďalej', 'Krize pominula – co dál', 'The crisis is over – what next'), chapters: ['komunita', 'hygiena-psychika'] },
];

export const chapterById = (id) => CHAPTERS.find((c) => c.id === id);
export const chapterNumber = (id) => CHAPTERS.findIndex((c) => c.id === id);
