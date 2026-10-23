// Príbehové scenáre (kniha-hra): uzly s textom, voľbami a hodnotením rozhodnutia.
// verdict: 'good' | 'bad' – hodnotí rozhodnutie, ktoré k uzlu viedlo; tip.ref = sekcia knihy s podrobnosťami.
// Voľba bez textu = „Pokračuj“.
const L = (sk, cs, en) => ({ sk, cs, en });
const go = (to) => ({ to });

export const SCENARIOS = [
  {
    id: 'blackout', crisis: 'blackout', icon: '🔦',
    title: L('Zimný blackout v paneláku', 'Zimní blackout v paneláku', 'Winter blackout in a tower block'),
    setting: L(
      'Január, mráz −8 °C. Bývaš s rodinou v byte na 6. poschodí. Je 18:00 a všade zhasne svetlo.',
      'Leden, mráz −8 °C. Bydlíš s rodinou v bytě v 6. patře. Je 18:00 a všude zhasne světlo.',
      'January, −8 °C outside. You live with your family in a 6th-floor flat. It is 6 pm and the lights go out everywhere.'),
    prepare: [
      L('Rádio na batérie a náhradné batérie', 'Rádio na baterie a náhradní baterie', 'A battery radio and spare batteries'),
      L('Voda na 3 dni – a vo výpadku hneď natočiť vaňu', 'Voda na 3 dny – a při výpadku hned napustit vanu', 'Water for 3 days – and fill the bath as soon as the power goes'),
      L('Spacáky, deky a termofory', 'Spacáky, deky a termofory', 'Sleeping bags, blankets and hot-water bottles'),
      L('Nabité powerbanky', 'Nabité powerbanky', 'Charged power banks'),
      L('Detektor oxidu uhoľnatého (CO)', 'Detektor oxidu uhelnatého (CO)', 'A carbon monoxide (CO) alarm'),
      L('Kontakty na papieri a dohoda so susedmi', 'Kontakty na papíře a domluva se sousedy', 'Contacts on paper and an arrangement with neighbours'),
    ],
    nodes: [
      { id: 'start', text: L(
        'Je 18:00, vonku mrzne a v celom byte zhasne svetlo. Výťah stojí, chladnička stíchla. Cez okno vidíš, že tma je aj v okolitých domoch.',
        'Je 18:00, venku mrzne a v celém bytě zhasne světlo. Výtah stojí, lednice ztichla. Z okna vidíš, že tma je i v okolních domech.',
        'It is 6 pm, freezing outside, and the whole flat goes dark. The lift stops and the fridge falls silent. From the window you can see the neighbouring blocks are dark too.'),
        choices: [
          { text: L('Zapneš rádio na batérie a zistíš, čo sa deje', 'Zapneš rádio na baterie a zjistíš, co se děje', 'Switch on the battery radio to find out what is going on'), to: 'radio' },
          { text: L('Zavoláš na 112 a spýtaš sa, kedy pôjde prúd', 'Zavoláš na 112 a zeptáš se, kdy půjde proud', 'Call 112 and ask when the power will be back'), to: 'call112' },
        ] },
      { id: 'call112', verdict: 'bad', text: L(
        'Linka je preťažená. Keď sa dovoláš, operátor ťa slušne požiada, aby si ju uvoľnil pre ľudí v ohrození života. Stratil si čas aj batériu.',
        'Linka je přetížená. Když se dovoláš, operátor tě slušně požádá, abys ji uvolnil pro lidi v ohrožení života. Ztratil jsi čas i baterii.',
        'The line is overloaded. When you get through, the operator politely asks you to keep it free for people whose lives are in danger. You have lost time and battery.'),
        tip: { text: L('Na 112 volaj len v ohrození života. Informácie hľadaj v rádiu a na stránke obce.', 'Na 112 volej jen v ohrožení života. Informace hledej v rádiu a na stránkách obce.', 'Call 112 only when a life is at risk. Get information from the radio and your municipality.'), ref: 'varovanie-112' },
        choices: [go('radio')] },
      { id: 'radio', verdict: 'good', text: L(
        'Rozhlas hlási rozsiahly výpadok v celom regióne, oprava môže trvať aj niekoľko dní. Voda z kohútika ešte tečie, ale tlak slabne.',
        'Rozhlas hlásí rozsáhlý výpadek v celém regionu, oprava může trvat i několik dní. Voda z kohoutku ještě teče, ale tlak slábne.',
        'The radio reports a widespread outage across the region; repairs may take several days. Tap water is still running, but the pressure is dropping.'),
        choices: [
          { text: L('Hneď natočíš vodu do fliaš, hrncov a vane', 'Hned natočíš vodu do lahví, hrnců a vany', 'Fill bottles, pots and the bath with water right away'), to: 'water' },
          { text: L('Pôjdeš do obchodu kúpiť vodu a sviečky', 'Půjdeš do obchodu koupit vodu a svíčky', 'Go to the shop to buy water and candles'), to: 'shop' },
        ] },
      { id: 'shop', verdict: 'bad', text: L(
        'Obchod pri dome je zatvorený, v druhom stojí dlhý rad a platí sa len v hotovosti, lebo terminály nefungujú. Kým sa vrátiš, z kohútika už iba kvapká.',
        'Obchod u domu je zavřený, ve druhém stojí dlouhá fronta a platí se jen hotově, protože terminály nefungují. Než se vrátíš, z kohoutku už jen kape.',
        'The shop next door is closed; the other one has a long queue and takes cash only because the card terminals are down. By the time you get back, the tap is only dripping.'),
        tip: { text: L('Čerpadlá v bytových domoch bez elektriny rýchlo stoja. Vodu natoč hneď a maj doma zásobu na 3 dni.', 'Čerpadla v bytových domech bez elektřiny rychle stojí. Vodu natoč hned a měj doma zásobu na 3 dny.', 'Pumps in apartment buildings stop soon after the power goes. Fill containers immediately and keep 3 days of water at home.'), ref: 'zasoby-voda' },
        choices: [go('cold')] },
      { id: 'water', verdict: 'good', text: L(
        'Kým tlak vydržal, natočil si asi 80 litrov – na pitie do fliaš, na splachovanie do vane. O hodinu voda prestane tiecť.',
        'Dokud tlak vydržel, natočil jsi asi 80 litrů – na pití do lahví, na splachování do vany. Za hodinu voda přestane téct.',
        'While the pressure lasted you filled about 80 litres – bottles for drinking, the bath for flushing. An hour later the water stops.'),
        choices: [go('cold')] },
      { id: 'cold', text: L(
        'Je 21:00 a v byte je už len 17 °C. Ústredné kúrenie nefunguje, lebo obehové čerpadlá potrebujú elektrinu. Ako zohreješ rodinu?',
        'Je 21:00 a v bytě je už jen 17 °C. Ústřední topení nefunguje, protože oběhová čerpadla potřebují elektřinu. Jak zahřeješ rodinu?',
        'It is 9 pm and the flat is down to 17 °C. The central heating has stopped because its pumps need electricity. How do you keep the family warm?'),
        choices: [
          { text: L('Všetci sa presunú do najmenšej izby, na okná zavesíte deky, vytiahnete spacáky a termofory', 'Všichni se přesunou do nejmenšího pokoje, na okna pověsíte deky, vytáhnete spacáky a termofory', 'Everyone moves to the smallest room; you hang blankets over the windows and get out sleeping bags and hot-water bottles'), to: 'warm' },
          { text: L('Zapneš plynový sporák a rúru, nech hrejú', 'Zapneš plynový sporák a troubu, ať hřejí', 'Turn on the gas hob and oven to heat the flat'), to: 'co' },
        ] },
      { id: 'co', verdict: 'bad', text: L(
        'Po hodine bolí hlava teba aj deti a babke je zle od žalúdka – to sú príznaky otravy oxidom uhoľnatým! Vypneš sporák, otvoríš okná a všetci idú na čerstvý vzduch. Našťastie ste si to všimli včas.',
        'Po hodině bolí hlava tebe i dětem a babičce je špatně od žaludku – to jsou příznaky otravy oxidem uhelnatým! Vypneš sporák, otevřeš okna a všichni jdou na čerstvý vzduch. Naštěstí jste si toho všimli včas.',
        'After an hour you and the children have headaches and grandma feels sick – signs of carbon monoxide poisoning! You switch off the cooker, open the windows and everyone gets fresh air. Luckily you noticed in time.'),
        tip: { text: L('Sporák, rúra, gril ani varič nie sú zdroj tepla. Maj detektor CO a teplo udrž v jednej miestnosti.', 'Sporák, trouba, gril ani vařič nejsou zdroj tepla. Měj detektor CO a teplo udrž v jedné místnosti.', 'A cooker, oven, barbecue or camping stove is not a heater. Have a CO alarm and keep the warmth in one room.'), ref: 'mrazy-vypadok' },
        choices: [go('phone')] },
      { id: 'warm', verdict: 'good', text: L(
        'V malej izbe s dekami na oknách sa teplota drží okolo 15 °C a v spacákoch sa dá spať. Termofory naplníš vodou zohriatou na kartušovom variči pri otvorenom okne.',
        'V malém pokoji s dekami na oknech se teplota drží kolem 15 °C a ve spacácích se dá spát. Termofory naplníš vodou ohřátou na kartušovém vařiči u otevřeného okna.',
        'In the small room with blankets over the windows the temperature stays around 15 °C, and you can sleep in the sleeping bags. You fill the hot-water bottles with water heated on the camping stove by an open window.'),
        choices: [go('phone')] },
      { id: 'phone', text: L(
        'Mobil má 40 % batérie a sieť slabne. Rodina z iného mesta sa o vás bojí.',
        'Mobil má 40 % baterie a síť slábne. Rodina z jiného města se o vás bojí.',
        'Your phone is at 40 % and the network is getting weaker. Family in another town are worried about you.'),
        choices: [
          { text: L('Zapneš úsporný režim, pošleš krátku SMS kontaktnej osobe a dohodnete sa, že mobil zapneš o 8:00 a 20:00', 'Zapneš úsporný režim, pošleš krátkou SMS kontaktní osobě a domluvíte se, že mobil zapneš v 8:00 a 20:00', 'Switch to power-saving mode, send a short text to your contact person and agree to switch on at 8 am and 8 pm'), to: 'phoneok' },
          { text: L('Pozeráš správy a videá na sociálnych sieťach, aby si vedel viac', 'Sleduješ zprávy a videa na sociálních sítích, abys věděl víc', 'Keep reading news and watching videos on social media to learn more'), to: 'phonebad' },
        ] },
      { id: 'phonebad', verdict: 'bad', text: L(
        'Ráno je mobil vybitý a powerbanka tiež. Rodina sa ti nevie dovolať a nevieš si overiť, čo sa deje.',
        'Ráno je mobil vybitý a powerbanka také. Rodina se ti nemůže dovolat a nemáš jak ověřit, co se děje.',
        'By morning the phone and the power bank are both flat. Your family cannot reach you and you cannot check what is happening.'),
        tip: { text: L('Šetri batériu: úsporný režim, krátke SMS, dohodnuté časy. Powerbanky nabíjaj vopred.', 'Šetři baterii: úsporný režim, krátké SMS, domluvené časy. Powerbanky nabíjej předem.', 'Save battery: power-saving mode, short texts, agreed times. Keep power banks charged in advance.'), ref: 'varovanie-spojenie' },
        choices: [go('neighbour')] },
      { id: 'phoneok', verdict: 'good', text: L(
        'Kontaktná osoba vie, že ste v poriadku, a batéria vydrží niekoľko dní.',
        'Kontaktní osoba ví, že jste v pořádku, a baterie vydrží několik dní.',
        'Your contact person knows you are all right, and the battery will last several days.'),
        choices: [go('neighbour')] },
      { id: 'neighbour', text: L(
        'Ráno druhého dňa. Pani Mária z 8. poschodia má 82 rokov a býva sama. Od včera ste ju nevideli.',
        'Ráno druhého dne. Paní Marie z 8. patra má 82 let a bydlí sama. Od včerejška jste ji neviděli.',
        'The morning of day two. Mrs Mary on the 8th floor is 82 and lives alone. Nobody has seen her since yesterday.'),
        choices: [
          { text: L('Zaklopeš u nej a spýtaš sa, či niečo nepotrebuje', 'Zaklepeš u ní a zeptáš se, jestli něco nepotřebuje', 'Knock on her door and ask whether she needs anything'), to: 'neighbourok' },
          { text: L('Nechceš ju rušiť – určite má rodinu, ktorá sa o ňu postará', 'Nechceš ji rušit – určitě má rodinu, která se o ni postará', 'You do not want to disturb her – surely her family will look after her'), to: 'neighbourbad' },
        ] },
      { id: 'neighbourbad', verdict: 'bad', text: L(
        'Večer počuješ na chodbe záchranárov. Pani Mária ležala premrznutá a zmätená v studenom byte bez jedla. Susedia ju našli neskoro.',
        'Večer slyšíš na chodbě záchranáře. Paní Marie ležela promrzlá a zmatená ve studeném bytě bez jídla. Sousedé ji našli pozdě.',
        'In the evening you hear paramedics on the stairs. Mrs Mary was lying cold and confused in her freezing flat without food. Neighbours found her late.'),
        tip: { text: L('V kríze pomáhajú najmä susedia. Starších a osamelých ľudí v dome skontroluj hneď v prvý deň.', 'V krizi pomáhají hlavně sousedé. Starší a osamělé lidi v domě zkontroluj hned první den.', 'In a crisis neighbours are the first help. Check on older people and those living alone on the very first day.'), ref: 'zranitelni-susedia' },
        choices: [go('toilet')] },
      { id: 'neighbourok', verdict: 'good', text: L(
        'Pani Mária sedí v kabáte v studenom byte a nemá ako ohriať jedlo. Dáš jej termofor a teplý čaj a dohodnete sa, že cez deň bude u vás v teplej izbe.',
        'Paní Marie sedí v kabátě ve studeném bytě a nemá jak ohřát jídlo. Dáš jí termofor a teplý čaj a domluvíte se, že přes den bude u vás v teplém pokoji.',
        'Mrs Mary is sitting in her coat in a cold flat with no way to heat food. You give her a hot-water bottle and hot tea, and agree she will spend the days in your warm room.'),
        choices: [go('toilet')] },
      { id: 'toilet', text: L(
        'Tretí deň. Voda netečie a záchod sa nedá spláchnuť. Kanalizácia však funguje.',
        'Třetí den. Voda neteče a záchod nejde spláchnout. Kanalizace ale funguje.',
        'Day three. There is no running water and the toilet will not flush, but the sewer still works.'),
        choices: [
          { text: L('Na splachovanie použiješ vodu z vane – vedro naraz do misy', 'Na splachování použiješ vodu z vany – kbelík najednou do mísy', 'Flush with bath water – pour a bucket into the bowl in one go'), to: 'toiletok' },
          { text: L('Splachuješ pitnou vodou z fliaš', 'Splachuješ pitnou vodou z lahví', 'Flush with drinking water from the bottles'), to: 'toiletbad' },
        ] },
      { id: 'toiletbad', verdict: 'bad', text: L(
        'Pitná voda rýchlo mizne. Večer vám zostáva posledná fľaša.',
        'Pitná voda rychle mizí. Večer vám zbývá poslední lahev.',
        'The drinking water disappears fast. By evening you are down to the last bottle.'),
        tip: { text: L('Pitnú vodu šetri na pitie a varenie. Na splachovanie stačí úžitková voda alebo núdzový záchod.', 'Pitnou vodu šetři na pití a vaření. Na splachování stačí užitková voda nebo nouzový záchod.', 'Keep drinking water for drinking and cooking. Use grey water or an emergency toilet for flushing.'), ref: 'hygiena-zachod' },
        choices: [go('help')] },
      { id: 'toiletok', verdict: 'good', text: L(
        'Vo vani zostáva dosť vody na splachovanie a pitná voda vydrží na pitie a varenie.',
        'Ve vaně zbývá dost vody na splachování a pitná voda vydrží na pití a vaření.',
        'There is enough water in the bath for flushing, and the drinking water lasts for drinking and cooking.'),
        choices: [go('help')] },
      { id: 'help', text: L(
        'Obec cez ampliónové auto oznamuje, že v škole je otvorené vyhrievané miesto s pitnou vodou a nabíjaním mobilov. V byte je už 12 °C.',
        'Obec z ampliónového auta oznamuje, že ve škole je otevřené vytápěné místo s pitnou vodou a nabíjením mobilů. V bytě je už 12 °C.',
        'A municipal loudspeaker van announces a heated help point at the school with drinking water and phone charging. The flat is down to 12 °C.'),
        choices: [
          { text: L('Pôjdete tam s rodinou aj s pani Máriou, vezmete lieky a doklady a na dvere necháte odkaz', 'Půjdete tam s rodinou i s paní Marií, vezmete léky a doklady a na dveře necháte vzkaz', 'Go there with your family and Mrs Mary, take medicines and documents, and leave a note on the door'), to: 'helpok' },
          { text: L('Zostanete doma, nejako to vydržíte', 'Zůstanete doma, nějak to vydržíte', 'Stay at home – you will manage somehow'), to: 'stay' },
        ] },
      { id: 'stay', verdict: 'bad', text: L(
        'Ďalšiu noc je v byte 11 °C. Deti kašlú a babka sa trasie. Ráno sa predsa len vydáte do školy.',
        'Další noc je v bytě 11 °C. Děti kašlou a babička se třese. Ráno se nakonec do školy vydáte.',
        'The next night it is 11 °C indoors. The children are coughing and grandma is shivering. In the morning you set off for the school after all.'),
        tip: { text: L('Keď doma klesá teplota pod 12 °C a nemáš bezpečný zdroj tepla, presuň sa k príbuzným alebo do ohrievacieho miesta.', 'Když doma klesá teplota pod 12 °C a nemáš bezpečný zdroj tepla, přesuň se k příbuzným nebo do vytápěného místa.', 'When it falls below 12 °C at home and you have no safe heat source, move to relatives or a warming centre.'), ref: 'mrazy-vypadok' },
        choices: [go('end')] },
      { id: 'helpok', verdict: 'good', text: L(
        'V škole je teplo, čaj a nabíjačky. Deti sa hrajú s ostatnými a pani Mária si konečne oddýchne.',
        'Ve škole je teplo, čaj a nabíječky. Děti si hrají s ostatními a paní Marie si konečně odpočine.',
        'The school is warm, with tea and chargers. The children play with others and Mrs Mary can finally rest.'),
        choices: [go('end')] },
      { id: 'end', end: true, text: L(
        'Na štvrtý deň sa vráti elektrina. Spotrebiče zapínaš postupne, skontroluješ potraviny v chladničke a mrazničke a doplníš všetko, čo ste minuli.',
        'Čtvrtý den se vrátí elektřina. Spotřebiče zapínáš postupně, zkontroluješ potraviny v lednici a mrazáku a doplníš všechno, co jste spotřebovali.',
        'On day four the power comes back. You switch appliances on one by one, check the food in the fridge and freezer, and replace everything you used up.') },
    ],
  },
  {
    id: 'flood', crisis: 'flood', icon: '🌊',
    title: L('Povodeň v noci', 'Povodeň v noci', 'Flood at night'),
    setting: L(
      'Bývaš v rodinnom dome pri potoku s partnerom, dvoma deťmi a psom. Dva dni prší a SHMÚ vydalo výstrahu pred povodňou. Je 22:00.',
      'Bydlíš v rodinném domě u potoka s partnerem, dvěma dětmi a psem. Dva dny prší a ČHMÚ vydal výstrahu před povodní. Je 22:00.',
      'You live in a house by a stream with your partner, two children and a dog. It has rained for two days and a flood warning is in force. It is 10 pm.'),
    prepare: [
      L('Evakuačná batožina pri dverách', 'Evakuační zavazadlo u dveří', 'A grab bag by the door'),
      L('Doklady vo vodotesnom obale', 'Doklady ve vodotěsném obalu', 'Documents in a waterproof pouch'),
      L('Vrecia na piesok a fólia', 'Pytle na písek a fólie', 'Sandbags and plastic sheeting'),
      L('Cieľ evakuácie a dve trasy – aspoň jedna bez mostov a podjazdov', 'Cíl evakuace a dvě trasy – aspoň jedna bez mostů a podjezdů', 'An evacuation destination and two routes – at least one without bridges or underpasses'),
      L('Fotografie majetku pre poisťovňu', 'Fotografie majetku pro pojišťovnu', 'Photos of your belongings for the insurer'),
    ],
    nodes: [
      { id: 'start', text: L(
        'Je 22:00, leje a potok za domom je hnedý a rýchly – siaha už po okraj brehu. Obec vyhlásila 2. stupeň povodňovej aktivity – pohotovosť.',
        'Je 22:00, leje a potok za domem je hnědý a rychlý – sahá už po okraj břehu. Obec vyhlásila 2. stupeň povodňové aktivity – pohotovost.',
        'It is 10 pm, pouring with rain, and the stream behind the house is brown and fast, right up to the top of the bank. The municipality has declared flood alert level 2.'),
        choices: [
          { text: L('Hneď konáš: doklady, lieky a cennosti prenesieš na poschodie a auto preparkuješ na kopec', 'Hned jednáš: doklady, léky a cennosti přeneseš do patra a auto přeparkuješ na kopec', 'Act now: move documents, medicines and valuables upstairs and park the car on higher ground'), to: 'prep' },
          { text: L('Ideš spať – hladina ešte môže klesnúť', 'Jdeš spát – hladina ještě může klesnout', 'Go to bed – the water may still go down'), to: 'sleep' },
        ] },
      { id: 'sleep', verdict: 'bad', text: L(
        'O 2:00 ťa zobudí siréna. V pivnici je voda a auto na dvore stojí vo vode po prahy.',
        'Ve 2:00 tě vzbudí siréna. Ve sklepě je voda a auto na dvoře stojí ve vodě po prahy.',
        'At 2 am the siren wakes you. There is water in the cellar and the car in the yard is standing in water up to the sills.'),
        tip: { text: L('Pri výstrahe a 2. stupni povodňovej aktivity konaj hneď. Auto, doklady a cennosti presuň včas.', 'Při výstraze a 2. stupni povodňové aktivity jednej hned. Auto, doklady a cennosti přesuň včas.', 'Act at once when a warning and alert level 2 are issued. Move the car, documents and valuables in time.'), ref: 'povodne-stupa' },
        choices: [go('siren')] },
      { id: 'prep', verdict: 'good', text: L(
        'Do polnoci sú cennosti hore, auto stojí pri kostole na kopci a dvere na prízemí si utesnil vrecami s pieskom. Vypol si plyn aj hlavný istič.',
        'Do půlnoci jsou cennosti nahoře, auto stojí u kostela na kopci a dveře v přízemí jsi utěsnil pytli s pískem. Vypnul jsi plyn i hlavní jistič.',
        'By midnight the valuables are upstairs, the car is parked by the church on the hill, and you have sandbagged the ground-floor doors. You have turned off the gas and the main circuit breaker.'),
        choices: [go('siren')] },
      { id: 'siren', text: L(
        'O 2:00 znie siréna 6 minút stálym tónom – Ohrozenie vodou. Z ampliónu hasičov zaznie výzva na evakuáciu ulice.',
        'Ve 2:00 zní siréna Všeobecná výstraha a hasiči z amplionu vyzývají k evakuaci ulice: hrozí zaplavení.',
        'At 2 am the flood siren sounds and a fire-brigade loudspeaker orders the street to evacuate.'),
        choices: [
          { text: L('Vezmete evakuačné batohy, psa a hneď idete k autu', 'Vezmete evakuační batohy, psa a hned jdete k autu', 'Take the grab bags and the dog and head straight for the car'), to: 'leave' },
          { text: L('Zostanete – dom je pevný a na poschodí budete v bezpečí', 'Zůstanete – dům je pevný a v patře budete v bezpečí', 'Stay – the house is solid and you will be safe upstairs'), to: 'stay' },
        ] },
      { id: 'stay', verdict: 'bad', text: L(
        'Voda stúpa rýchlejšie, než ste čakali. Ráno vás z okna na poschodí berú hasiči do člna a psa musíte nechať doma.',
        'Voda stoupá rychleji, než jste čekali. Ráno vás hasiči berou z okna v patře do člunu a psa musíte nechat doma.',
        'The water rises faster than you expected. In the morning firefighters take you from an upstairs window into a boat, and you have to leave the dog behind.'),
        tip: { text: L('Pri výzve na evakuáciu odíď hneď. Kto čaká, často uviazne.', 'Při výzvě k evakuaci odejdi hned. Kdo čeká, často uvízne.', 'When told to evacuate, leave immediately. People who wait often get trapped.'), ref: 'principy-rozhodnutia' },
        choices: [go('register')] },
      { id: 'leave', verdict: 'good', text: L(
        'Za desať minút ste pri aute. Ulica je ešte prejazdná.',
        'Za deset minut jste u auta. Ulice je ještě průjezdná.',
        'Ten minutes later you are at the car. The street is still passable.'),
        choices: [go('route')] },
      { id: 'route', text: L(
        'Najkratšia cesta k babke vedie cez most nad potokom a podjazd pod železnicou. Druhá cesta je o 6 km dlhšia, ale vedie po kopci.',
        'Nejkratší cesta k babičce vede přes most nad potokem a podjezd pod železnicí. Druhá cesta je o 6 km delší, ale vede po kopci.',
        'The shortest way to grandma\'s crosses the bridge over the stream and goes through a railway underpass. The other route is 6 km longer but runs along the hill.'),
        choices: [
          { text: L('Pôjdeš dlhšou cestou po kopci', 'Pojedeš delší cestou po kopci', 'Take the longer route along the hill'), to: 'routeok' },
          { text: L('Pôjdeš najkratšou cestou – je noc a ponáhľate sa', 'Pojedeš nejkratší cestou – je noc a spěcháte', 'Take the shortest route – it is night and you are in a hurry'), to: 'underpass' },
        ] },
      { id: 'underpass', verdict: 'bad', text: L(
        'Podjazd je zaplavený. Voda vyzerá plytko, no v strede auto stratí oporu a motor zhasne. Vyleziete oknom a hasiči vás odvezú do evakuačného strediska.',
        'Podjezd je zaplavený. Voda vypadá mělce, ale uprostřed auto ztratí oporu a motor zhasne. Vylezete oknem a hasiči vás odvezou do evakuačního střediska.',
        'The underpass is flooded. The water looks shallow, but halfway through the car loses grip and the engine dies. You climb out of the window and firefighters take you to an evacuation centre.'),
        tip: { text: L('Nikdy nejazdi cez tečúcu vodu ani zaplavené podjazdy – 30 cm vody odnesie auto. Plánuj trasu bez mostov a podjazdov.', 'Nikdy nejezdi přes tekoucí vodu ani zaplavené podjezdy – 30 cm vody odnese auto. Plánuj trasu bez mostů a podjezdů.', 'Never drive through moving water or flooded underpasses – 30 cm of water can carry a car away. Plan a route without bridges and underpasses.'), ref: 'evakuacia-auto' },
        choices: [go('register')] },
      { id: 'routeok', verdict: 'good', text: L(
        'Cesta po kopci je pomalšia, ale suchá. O 3:00 ste u babky.',
        'Cesta po kopci je pomalejší, ale suchá. Ve 3:00 jste u babičky.',
        'The hill road is slower but dry. By 3 am you are at grandma\'s.'),
        choices: [go('register')] },
      { id: 'register', text: L(
        'Ráno obec žiada evakuovaných, aby sa zaregistrovali.',
        'Ráno obec žádá evakuované, aby se zaregistrovali.',
        'In the morning the municipality asks all evacuees to register.'),
        choices: [
          { text: L('Zaregistruješ sa telefonicky na obci, aj keď ste u babky', 'Zaregistruješ se telefonicky na obci, i když jste u babičky', 'Register by phone with the municipality, even though you are staying with grandma'), to: 'regok' },
          { text: L('Neregistruješ sa – ste predsa v bezpečí', 'Neregistruješ se – jste přece v bezpečí', 'Do not bother – you are safe after all'), to: 'regbad' },
        ] },
      { id: 'regbad', verdict: 'bad', text: L(
        'Hasiči hľadajú vašu rodinu medzi nezvestnými a susedia sa o vás boja. Strácajú hodiny, ktoré mohli venovať iným.',
        'Hasiči hledají vaši rodinu mezi pohřešovanými a sousedé se o vás bojí. Ztrácejí hodiny, které mohli věnovat jiným.',
        'Firefighters search for your family among the missing and your neighbours are worried. Hours are lost that could have gone to others.'),
        tip: { text: L('Zaregistruj sa vždy, aj keď bývaš u príbuzných – pomáha to pri hľadaní nezvestných.', 'Zaregistruj se vždy, i když bydlíš u příbuzných – pomáhá to při hledání pohřešovaných.', 'Always register, even if you are staying with relatives – it helps the search for missing people.'), ref: 'evakuacia-prichod' },
        choices: [go('return')] },
      { id: 'regok', verdict: 'good', text: L(
        'Na obci vás zapíšu a dozvieš sa, kedy sa bude dať vrátiť.',
        'Na obci vás zapíšou a dozvíš se, kdy se bude možné vrátit.',
        'The municipality records your details and tells you when you can expect to return.'),
        choices: [go('return')] },
      { id: 'return', text: L(
        'Po dvoch dňoch voda opadne a obec povolí návrat. V dome je bahno po kolená.',
        'Po dvou dnech voda opadne a obec povolí návrat. V domě je bahno po kolena.',
        'Two days later the water recedes and you are allowed back. The house is knee-deep in mud.'),
        choices: [
          { text: L('Najprv všetko nafotíš a natočíš, až potom upratuješ. Elektrinu necháš skontrolovať elektrikárovi', 'Nejprve všechno nafotíš a natočíš, teprve potom uklízíš. Elektřinu necháš zkontrolovat elektrikářem', 'Photograph and film everything first, then clean up. Have an electrician check the wiring'), to: 'returnok' },
          { text: L('Hneď vyhodíš zničené veci a zapneš istič, aby si mohol sušiť', 'Hned vyhodíš zničené věci a zapneš jistič, abys mohl sušit', 'Throw out the ruined things straight away and switch the power back on to start drying'), to: 'returnbad' },
        ] },
      { id: 'returnbad', verdict: 'bad', text: L(
        'Istič hneď vypadne a zo zásuvky zaiskrí. Poisťovňa sa navyše pýta na fotky zničených vecí, ktoré už nemáš.',
        'Jistič hned vypadne a ze zásuvky zajiskří. Pojišťovna se navíc ptá na fotky zničených věcí, které už nemáš.',
        'The breaker trips immediately and a socket sparks. And the insurer asks for photos of ruined items you have already thrown away.'),
        tip: { text: L('Škody najprv zdokumentuj. Elektrinu zapni až po kontrole odborníkom.', 'Škody nejprve zdokumentuj. Elektřinu zapni až po kontrole odborníkem.', 'Document the damage first. Switch the power on only after a professional has checked it.'), ref: 'komunita-poistenie' },
        choices: [go('end')] },
      { id: 'returnok', verdict: 'good', text: L(
        'Poisťovňa má všetky podklady a elektrikár nájde skrat v zaplavenej zásuvke skôr, než by spôsobil požiar.',
        'Pojišťovna má všechny podklady a elektrikář najde zkrat v zaplavené zásuvce dřív, než by způsobil požár.',
        'The insurer has all the evidence, and the electrician finds a short circuit in a flooded socket before it can start a fire.'),
        choices: [go('end')] },
      { id: 'end', end: true, text: L(
        'Upratovanie trvá týždne a pomáhajú susedia aj dobrovoľníci. Doplníš evakuačnú batožinu a do rodinného plánu zapíšeš, čo nabudúce urobíš inak.',
        'Úklid trvá týdny a pomáhají sousedé i dobrovolníci. Doplníš evakuační zavazadlo a do rodinného plánu zapíšeš, co příště uděláš jinak.',
        'The clean-up takes weeks, with help from neighbours and volunteers. You restock the grab bags and note in your family plan what you will do differently next time.') },
    ],
  },
  {
    id: 'chemical', crisis: 'chemical', icon: '☣️',
    title: L('Siréna a zápach chlóru', 'Siréna a zápach chloru', 'Siren and a smell of chlorine'),
    setting: L(
      'Utorok, 14:00. Si s 8-ročným synom na ihrisku 15 minút od domu. Neďaleko je úpravňa vody a zimný štadión. Dcéra je v škole.',
      'Úterý, 14:00. Jsi s osmiletým synem na hřišti 15 minut od domu. Nedaleko je úpravna vody a zimní stadion. Dcera je ve škole.',
      'Tuesday, 2 pm. You are at a playground with your 8-year-old son, 15 minutes from home. A water-treatment plant and an ice rink are nearby. Your daughter is at school.'),
    prepare: [
      L('Vedieť, ako znie siréna a čo pri nej robiť', 'Vědět, jak zní siréna a co při ní dělat', 'Know what the siren sounds like and what to do'),
      L('Fólia, lepiaca páska a uteráky na utesnenie miestnosti', 'Fólie, lepicí páska a ručníky na utěsnění místnosti', 'Plastic sheeting, tape and towels to seal a room'),
      L('Rádio na batérie', 'Rádio na baterie', 'A battery radio'),
      L('Číslo toxikologického centra', 'Číslo toxikologického střediska', 'The poison centre number'),
      L('Prehľad podnikov s nebezpečnými látkami v okolí', 'Přehled podniků s nebezpečnými látkami v okolí', 'Knowing which nearby plants handle hazardous substances'),
    ],
    nodes: [
      { id: 'start', text: L(
        'Zaznie siréna – 2 minúty kolísavý tón: Všeobecné ohrozenie. Cítiš štipľavý zápach a vietor fúka od úpravne vody.',
        'Zazní siréna – kolísavý tón: Všeobecná výstraha. Cítíš štiplavý zápach a vítr fouká od úpravny vody.',
        'A siren wails for 2 minutes – the general warning. You notice a pungent smell, and the wind is blowing from the water-treatment plant.'),
        choices: [
          { text: L('Okamžite vojdete do najbližšej budovy – do obchodu oproti ihrisku', 'Okamžitě vejdete do nejbližší budovy – do obchodu naproti hřišti', 'Go straight into the nearest building – the shop opposite the playground'), to: 'inside' },
          { text: L('Bežíte domov, je to len 15 minút', 'Běžíte domů, je to jen 15 minut', 'Run home – it is only 15 minutes'), to: 'run' },
        ] },
      { id: 'run', verdict: 'bad', text: L(
        'Po piatich minútach vás pália oči a syn kašle. Zápach silnie, tak vbehnete do prvého otvoreného vchodu.',
        'Po pěti minutách vás pálí oči a syn kašle. Zápach sílí, tak vběhnete do prvního otevřeného vchodu.',
        'After five minutes your eyes are burning and your son is coughing. The smell is getting stronger, so you dash into the first open doorway.'),
        tip: { text: L('Pri úniku nebezpečnej látky choď do najbližšej budovy – nemusí byť tvoja. Vonku si najviac ohrozený.', 'Při úniku nebezpečné látky jdi do nejbližší budovy – nemusí být tvoje. Venku jsi nejvíc ohrožený.', 'During a chemical release go into the nearest building – it does not have to be yours. You are most at risk outdoors.'), ref: 'chemicka-vonku' },
        choices: [go('floor')] },
      { id: 'inside', verdict: 'good', text: L(
        'Predavačka zamkne dvere a spolu s ďalšími zákazníkmi ste v budove.',
        'Prodavačka zamkne dveře a spolu s dalšími zákazníky jste v budově.',
        'The shop assistant locks the door, and you are inside with the other customers.'),
        choices: [go('floor')] },
      { id: 'floor', text: L(
        'Rozhlas hlási únik chlóru. Budova má pivnicu aj prvé poschodie.',
        'Rozhlas hlásí únik chloru. Budova má sklep i první patro.',
        'The radio reports a chlorine leak. The building has a cellar and a first floor.'),
        choices: [
          { text: L('Navrhneš ísť na poschodie do miestnosti na strane odvrátenej od úpravne', 'Navrhneš jít do patra do místnosti na straně odvrácené od úpravny', 'Suggest going upstairs to a room on the side facing away from the plant'), to: 'up' },
          { text: L('Navrhneš schovať sa v pivnici – tam je najbezpečnejšie', 'Navrhneš schovat se ve sklepě – tam je nejbezpečněji', 'Suggest hiding in the cellar – surely the safest place'), to: 'cellar' },
        ] },
      { id: 'cellar', verdict: 'bad', text: L(
        'V pivnici je zápach po chvíli silnejší – chlór je ťažší ako vzduch a klesá. Rýchlo idete hore.',
        'Ve sklepě je zápach po chvíli silnější – chlor je těžší než vzduch a klesá. Rychle jdete nahoru.',
        'After a while the smell in the cellar gets stronger – chlorine is heavier than air and sinks. You hurry upstairs.'),
        tip: { text: L('Pri chlóre a iných ťažkých plynoch choď na vyššie poschodie, nie do pivnice.', 'Při chloru a jiných těžkých plynech jdi do vyššího patra, ne do sklepa.', 'With chlorine and other heavy gases, go to an upper floor, not the cellar.'), ref: 'chemicka-budova' },
        choices: [go('seal')] },
      { id: 'up', verdict: 'good', text: L(
        'Na poschodí je vzduch čistejší – chlór sa drží pri zemi.',
        'V patře je vzduch čistší – chlor se drží u země.',
        'The air upstairs is cleaner – chlorine stays close to the ground.'),
        choices: [go('seal')] },
      { id: 'seal', text: L(
        'Čo urobíte v miestnosti?',
        'Co uděláte v místnosti?',
        'What do you do in the room?'),
        choices: [
          { text: L('Zavriete okná a dvere, vypnete vetranie, škáry utesníte mokrými uterákmi a zapnete rádio', 'Zavřete okna a dveře, vypnete větrání, škvíry utěsníte mokrými ručníky a zapnete rádio', 'Close windows and doors, switch off the ventilation, seal the gaps with wet towels and turn on the radio'), to: 'sealok' },
          { text: L('Otvoríte okno, aby ste videli, čo sa deje vonku', 'Otevřete okno, abyste viděli, co se děje venku', 'Open a window to see what is happening outside'), to: 'window' },
        ] },
      { id: 'window', verdict: 'bad', text: L(
        'Do miestnosti vnikne zápach a všetci začnú kašľať. Okno rýchlo zavriete.',
        'Do místnosti vnikne zápach a všichni začnou kašlat. Okno rychle zavřete.',
        'The smell pours in and everyone starts coughing. You shut the window quickly.'),
        tip: { text: L('Pri úniku: okná a dvere zatvorené, vetranie vypnuté, škáry utesnené.', 'Při úniku: okna a dveře zavřené, větrání vypnuté, škvíry utěsněné.', 'During a release: windows and doors shut, ventilation off, gaps sealed.'), ref: 'ukrytie-vnutri' },
        choices: [go('school')] },
      { id: 'sealok', verdict: 'good', text: L(
        'Zápach do miestnosti takmer neprenikne. Rádio hlási, že hasiči únik zastavujú.',
        'Zápach do místnosti téměř nepronikne. Rádio hlásí, že hasiči únik zastavují.',
        'Hardly any smell gets into the room. The radio says firefighters are stopping the leak.'),
        choices: [go('school')] },
      { id: 'school', text: L(
        'Volá ti partner: dcéra je v škole dva kilometre odtiaľto a on po ňu chce ísť autom.',
        'Volá ti partner: dcera je ve škole dva kilometry odsud a on pro ni chce jet autem.',
        'Your partner calls: your daughter\'s school is two kilometres away and he wants to drive over to pick her up.'),
        choices: [
          { text: L('Povieš mu, nech nejde – škola má plán a deti ukryje', 'Řekneš mu, ať nejezdí – škola má plán a děti ukryje', 'Tell him not to go – the school has a plan and will shelter the children'), to: 'schoolok' },
          { text: L('Súhlasíš, nech ju čím skôr vyzdvihne', 'Souhlasíš, ať ji co nejdřív vyzvedne', 'Agree that he should fetch her as soon as possible'), to: 'schoolbad' },
        ] },
      { id: 'schoolbad', verdict: 'bad', text: L(
        'Partner uviazne v kolóne pred policajnou uzáverou, uprostred zápachu a s pálivými očami. Škola medzitým deti bezpečne ukryla.',
        'Partner uvízne v koloně před policejní uzávěrou, uprostřed zápachu a s pálícíma očima. Škola mezitím děti bezpečně ukryla.',
        'Your partner gets stuck in a queue at a police roadblock, surrounded by the smell, his eyes burning. Meanwhile the school has sheltered the children safely.'),
        tip: { text: L('Deti nechaj v škole, kým úrady nepovedia inak – škola ich ukryje. Cestou by si sa vystavil nebezpečenstvu.', 'Děti nech ve škole, dokud úřady neřeknou jinak – škola je ukryje. Cestou by ses vystavil nebezpečí.', 'Leave children at school unless the authorities say otherwise – the school will shelter them. Travelling would put you in danger.'), ref: 'varovanie' },
        choices: [go('clear')] },
      { id: 'schoolok', verdict: 'good', text: L(
        'Škola posiela správu: deti sú ukryté v telocvični na poschodí a sú v poriadku.',
        'Škola posílá zprávu: děti jsou ukryté v tělocvičně v patře a jsou v pořádku.',
        'The school sends a message: the children are sheltering in the upstairs gym and are fine.'),
        choices: [go('clear')] },
      { id: 'clear', text: L(
        'Po dvoch hodinách znie 2 minúty stály tón – Koniec ohrozenia.',
        'Po dvou hodinách rozhlas oznámí konec ohrožení.',
        'Two hours later the all-clear is given.'),
        choices: [
          { text: L('Vyvetráte, doma sa osprchujete, oblečenie vyperiete a pri pretrvávajúcom kašli zavoláte lekára', 'Vyvětráte, doma se osprchujete, oblečení vyperete a při přetrvávajícím kašli zavoláte lékaře', 'Air the rooms, shower at home, wash your clothes and call a doctor if the coughing continues'), to: 'afterok' },
          { text: L('Nič zvláštne nerobíte – všetko je predsa v poriadku', 'Nic zvláštního neděláte – všechno je přece v pořádku', 'Do nothing special – everything is fine now'), to: 'afterbad' },
        ] },
      { id: 'afterbad', verdict: 'bad', text: L(
        'V noci syn stále kašle a pália ho oči. Ráno musíte k lekárovi.',
        'V noci syn stále kašle a pálí ho oči. Ráno musíte k lékaři.',
        'During the night your son is still coughing and his eyes sting. In the morning you have to see a doctor.'),
        tip: { text: L('Po zasiahnutí sa umy, vyper oblečenie a pri kašli či dýchavičnosti vyhľadaj lekára.', 'Po zasažení se umyj, vyper oblečení a při kašli či dušnosti vyhledej lékaře.', 'After exposure, wash, launder your clothes and see a doctor if there is coughing or shortness of breath.'), ref: 'chemicka-zasiahnuty' },
        choices: [go('end')] },
      { id: 'afterok', verdict: 'good', text: L(
        'Kašeľ do večera ustúpi. Lekár po telefóne potvrdí, že netreba nič ďalšie.',
        'Kašel do večera ustoupí. Lékař po telefonu potvrdí, že není potřeba nic dalšího.',
        'The cough has eased by evening. A doctor on the phone confirms nothing more is needed.'),
        choices: [go('end')] },
      { id: 'end', end: true, text: L(
        'Večer si na stránke obce pozrieš, ktoré podniky v okolí majú havarijné plány, a doma pripravíš fóliu a lepiacu pásku na utesnenie jednej miestnosti.',
        'Večer si na stránkách obce najdeš, které podniky v okolí mají havarijní plány, a doma připravíš fólii a lepicí pásku na utěsnění jedné místnosti.',
        'That evening you look up which nearby plants have emergency plans, and you put plastic sheeting and tape ready at home to seal one room.') },
    ],
  },
  {
    id: 'fire', crisis: 'fire', icon: '🔥',
    title: L('Požiar v noci', 'Požár v noci', 'Fire at night'),
    setting: L(
      'Je 3:00. Spíš s rodinou v byte na 4. poschodí paneláku. Zobudí ťa pípanie detektora dymu.',
      'Jsou 3:00. Spíš s rodinou v bytě ve 4. patře paneláku. Vzbudí tě pípání detektoru kouře.',
      'It is 3 am. You are asleep with your family in a 4th-floor flat in a tower block. The smoke alarm wakes you.'),
    prepare: [
      L('Detektor dymu v chodbe bytu', 'Detektor kouře v chodbě bytu', 'A smoke alarm in the hallway'),
      L('Hasiaci prístroj a hasiaca deka', 'Hasicí přístroj a hasicí deka', 'A fire extinguisher and fire blanket'),
      L('Dohodnuté miesto stretnutia pred domom', 'Domluvené místo setkání před domem', 'An agreed meeting point outside the building'),
      L('Baterka pri posteli', 'Baterka u postele', 'A torch by the bed'),
      L('Vedieť, ako utesniť dvere mokrými uterákmi', 'Vědět, jak utěsnit dveře mokrými ručníky', 'Knowing how to seal a door with wet towels'),
    ],
    nodes: [
      { id: 'start', text: L(
        'Detektor pípa a v predsieni cítiš dym. Zdá sa, že ide spoza vchodových dverí – zo schodiska.',
        'Detektor pípá a v předsíni cítíš kouř. Zdá se, že jde zpoza vchodových dveří – ze schodiště.',
        'The alarm is beeping and you can smell smoke in the hall. It seems to be coming from behind the front door – from the stairwell.'),
        choices: [
          { text: L('Zobudíš rodinu a chrbtom ruky skúsiš, či sú vchodové dvere horúce', 'Vzbudíš rodinu a hřbetem ruky zkusíš, jestli jsou vchodové dveře horké', 'Wake the family and test the front door with the back of your hand to see if it is hot'), to: 'check' },
          { text: L('Rýchlo otvoríš dvere, aby si videl, čo sa deje', 'Rychle otevřeš dveře, abys viděl, co se děje', 'Quickly open the door to see what is happening'), to: 'open' },
        ] },
      { id: 'open', verdict: 'bad', text: L(
        'Do bytu sa vovalí hustý čierny dym. Zabuchneš dvere, kašleš a v predsieni je dym až po strop.',
        'Do bytu se vevalí hustý černý kouř. Zabouchneš dveře, kašleš a v předsíni je kouř až ke stropu.',
        'Thick black smoke pours in. You slam the door, coughing, and the hall is full of smoke up to the ceiling.'),
        tip: { text: L('Pred otvorením skontroluj dvere chrbtom ruky. Horúce dvere neotváraj – dym zabíja rýchlejšie ako oheň.', 'Před otevřením zkontroluj dveře hřbetem ruky. Horké dveře neotvírej – kouř zabíjí rychleji než oheň.', 'Check the door with the back of your hand before opening it. Never open a hot door – smoke kills faster than fire.'), ref: 'poziare-vediet' },
        choices: [go('trapped')] },
      { id: 'check', verdict: 'good', text: L(
        'Dvere sú horúce a spod nich preniká dym. Schodisko je zadymené – neotváraš.',
        'Dveře jsou horké a zpod nich proniká kouř. Schodiště je zakouřené – neotvíráš.',
        'The door is hot and smoke is seeping underneath. The stairwell is full of smoke – you keep the door shut.'),
        choices: [go('trapped')] },
      { id: 'trapped', text: L(
        'Cez schodisko sa von nedostanete. Čo urobíš?',
        'Přes schodiště se ven nedostanete. Co uděláš?',
        'You cannot get out through the stairwell. What do you do?'),
        choices: [
          { text: L('Všetci idú do izby s oknom do ulice, zavriete dvere a škáry upchete mokrými uterákmi', 'Všichni jdou do pokoje s oknem do ulice, zavřete dveře a škvíry ucpete mokrými ručníky', 'Everyone goes into a room with a window onto the street; you close the door and block the gaps with wet towels'), to: 'room' },
          { text: L('Skúsite zbehnúť po schodoch so zadržaným dychom', 'Zkusíte seběhnout po schodech se zadrženým dechem', 'Try to run down the stairs holding your breath'), to: 'stairs' },
        ] },
      { id: 'stairs', verdict: 'bad', text: L(
        'Po dvoch poschodiach nevidíte na krok a dym štípe v pľúcach. Ledva sa vrátite do bytu a zavriete sa v izbe s oknom.',
        'Po dvou patrech nevidíte na krok a kouř štípe v plicích. Sotva se vrátíte do bytu a zavřete se v pokoji s oknem.',
        'Two floors down you cannot see a thing and the smoke burns your lungs. You barely make it back and shut yourselves in a room with a window.'),
        tip: { text: L('Do zadymeného schodiska nevstupuj. Zostaň v miestnosti s oknom, utesni dvere a volaj 112.', 'Do zakouřeného schodiště nevstupuj. Zůstaň v místnosti s oknem, utěsni dveře a volej 112.', 'Never enter a smoke-filled stairwell. Stay in a room with a window, seal the door and call 112.'), ref: 'poziare-uviaznuty' },
        choices: [go('call')] },
      { id: 'room', verdict: 'good', text: L(
        'V izbe s utesnenými dverami je vzduch čistý.',
        'V pokoji s utěsněnými dveřmi je vzduch čistý.',
        'The air in the room with the sealed door is clean.'),
        choices: [go('call')] },
      { id: 'call', text: L(
        'Voláš 112. Čo povieš operátorovi ako prvé?',
        'Voláš 112. Co řekneš operátorovi jako první?',
        'You call 112. What do you tell the operator first?'),
        choices: [
          { text: L('Presnú adresu, poschodie, číslo bytu a koľkí ste v izbe s oknom do ulice', 'Přesnou adresu, patro, číslo bytu a kolik vás je v pokoji s oknem do ulice', 'The exact address, floor, flat number and how many of you are in a room with a street window'), to: 'callok' },
          { text: L('Že u vás horí a nech prídu rýchlo', 'Že u vás hoří a ať přijedou rychle', 'That there is a fire and they must come quickly'), to: 'callbad' },
        ] },
      { id: 'callbad', verdict: 'bad', text: L(
        'Operátor sa musí viackrát pýtať, kde presne ste. Strácate cenné minúty.',
        'Operátor se musí několikrát ptát, kde přesně jste. Ztrácíte cenné minuty.',
        'The operator has to ask several times exactly where you are. Precious minutes are lost.'),
        tip: { text: L('Povedz: kto volá, kde presne (adresa, poschodie, byt), čo sa deje a koľko ľudí potrebuje pomoc.', 'Řekni: kdo volá, kde přesně (adresa, patro, byt), co se děje a kolik lidí potřebuje pomoc.', 'Say who is calling, exactly where (address, floor, flat), what is happening and how many people need help.'), ref: 'varovanie-112' },
        choices: [go('wait')] },
      { id: 'callok', verdict: 'good', text: L(
        'Operátor si všetko zapíše a povie ti, nech zostanete v izbe a dávate o sebe znamenie z okna.',
        'Operátor si všechno zapíše a řekne ti, ať zůstanete v pokoji a dáváte o sobě znamení z okna.',
        'The operator notes everything and tells you to stay in the room and signal from the window.'),
        choices: [go('wait')] },
      { id: 'wait', text: L(
        'Hasiči prichádzajú. Dym začína prenikať popod dvere izby.',
        'Hasiči přijíždějí. Kouř začíná pronikat pode dveřmi pokoje.',
        'The fire brigade is arriving. Smoke is starting to creep under the bedroom door.'),
        choices: [
          { text: L('Pridáš ďalší mokrý uterák, z okna svietiš baterkou a čakáte', 'Přidáš další mokrý ručník, z okna svítíš baterkou a čekáte', 'Add another wet towel, shine your torch from the window and wait'), to: 'waitok' },
          { text: L('Skúsiš zliezť po balkónoch na nižšie poschodie', 'Zkusíš slézt po balkonech do nižšího patra', 'Try to climb down the balconies to a lower floor'), to: 'climb' },
        ] },
      { id: 'climb', verdict: 'bad', text: L(
        'Na zábradlí sa ti pošmykne noha a zachytíš sa v poslednej chvíli. Vrátiš sa do izby s odretými rukami.',
        'Na zábradlí ti uklouzne noha a zachytíš se v poslední chvíli. Vrátíš se do pokoje s odřenýma rukama.',
        'Your foot slips on the railing and you catch yourself at the last moment. You climb back into the room with grazed hands.'),
        tip: { text: L('Neskáč ani nelez z výšky. Ak nehrozí bezprostredné nebezpečenstvo, počkaj na hasičov.', 'Neskákej ani nelez z výšky. Pokud nehrozí bezprostřední nebezpečí, počkej na hasiče.', 'Do not jump or climb from a height. Unless danger is immediate, wait for the firefighters.'), ref: 'poziare-uviaznuty' },
        choices: [go('outside')] },
      { id: 'waitok', verdict: 'good', text: L(
        'Hasiči ťa vidia a o desať minút vás s maskami vyvedú cez schodisko.',
        'Hasiči tě vidí a za deset minut vás s maskami vyvedou přes schodiště.',
        'The firefighters see you, and ten minutes later they lead you down the stairs wearing masks.'),
        choices: [go('outside')] },
      { id: 'outside', text: L(
        'Pred domom stoja susedia v pyžamách.',
        'Před domem stojí sousedé v pyžamech.',
        'Neighbours are standing outside in their pyjamas.'),
        choices: [
          { text: L('Spočítaš rodinu na dohodnutom mieste a povieš hasičom, že pani z vedľajšieho bytu býva sama', 'Spočítáš rodinu na domluveném místě a řekneš hasičům, že paní z vedlejšího bytu bydlí sama', 'Count your family at the meeting point and tell the firefighters that the lady next door lives alone'), to: 'count' },
          { text: L('Vrátiš sa do bytu po doklady a mačku', 'Vrátíš se do bytu pro doklady a kočku', 'Go back into the flat for your documents and the cat'), to: 'back' },
        ] },
      { id: 'back', verdict: 'bad', text: L(
        'Hasič ťa pri vchode zastaví. Mačku po hodine vynesie hasič – žije.',
        'Hasič tě u vchodu zastaví. Kočku po hodině vynese hasič – žije.',
        'A firefighter stops you at the entrance. An hour later a firefighter carries the cat out – alive.'),
        tip: { text: L('Do horiacej budovy sa nikdy nevracaj. Povedz hasičom, kto alebo čo zostalo vnútri.', 'Do hořící budovy se nikdy nevracej. Řekni hasičům, kdo nebo co zůstalo uvnitř.', 'Never go back into a burning building. Tell the firefighters who or what is still inside.'), ref: 'poziare-budova' },
        choices: [go('end')] },
      { id: 'count', verdict: 'good', text: L(
        'Hasiči susedu nájdu a vyvedú. Všetci sú vonku.',
        'Hasiči sousedku najdou a vyvedou. Všichni jsou venku.',
        'The firefighters find your neighbour and bring her out. Everyone is safe.'),
        choices: [go('end')] },
      { id: 'end', end: true, text: L(
        'Požiar vznikol od kolobežky, ktorá sa nabíjala na chodbe. Na druhý deň kúpiš hasiacu deku a druhý detektor dymu do detskej izby.',
        'Požár vznikl od koloběžky, která se nabíjela na chodbě. Druhý den koupíš hasicí deku a druhý detektor kouře do dětského pokoje.',
        'The fire started from an e-scooter charging in the corridor. The next day you buy a fire blanket and a second smoke alarm for the children\'s room.') },
    ],
  },
  {
    id: 'heat', crisis: 'heat', icon: '🌡️',
    title: L('Týždeň horúčav', 'Týden veder', 'A week-long heatwave'),
    setting: L(
      'Júl, piaty deň nad 35 °C. Máš ročné dieťa a tvoj 79-ročný otec býva sám v podkrovnom byte v meste.',
      'Červenec, pátý den nad 35 °C. Máš ročního syna a tvůj 79letý otec bydlí sám v podkrovním bytě ve městě.',
      'July, the fifth day above 35 °C. You have a one-year-old, and your 79-year-old father lives alone in an attic flat in town.'),
    prepare: [
      L('Vonkajšie tienenie alebo reflexná fólia na okná', 'Venkovní stínění nebo reflexní fólie na okna', 'External shading or reflective film for windows'),
      L('Teplomer do bytu', 'Teploměr do bytu', 'An indoor thermometer'),
      L('Plán denných kontaktov so seniormi', 'Plán denních kontaktů se seniory', 'A plan for daily contact with older relatives'),
      L('Rehydratačný roztok', 'Rehydratační roztok', 'Oral rehydration salts'),
      L('Vedieť rozpoznať úpal a čo robiť', 'Vědět, jak poznat úpal a co dělat', 'Knowing how to recognise heatstroke and what to do'),
    ],
    nodes: [
      { id: 'start', text: L(
        'Ráno je v tvojom byte 29 °C. Otec ti včera do telefónu povedal, že „je to v pohode“.',
        'Ráno je v tvém bytě 29 °C. Otec ti včera do telefonu řekl, že „je to v pohodě“.',
        'In the morning it is 29 °C in your flat. Yesterday your father said on the phone that he was "fine".'),
        choices: [
          { text: L('Dohodneš sa s otcom na dvoch telefonátoch denne a cez obed ho navštíviš', 'Domluvíš se s otcem na dvou telefonátech denně a přes poledne ho navštívíš', 'Arrange two phone calls a day with your father and visit him at lunchtime'), to: 'visit' },
          { text: L('Otec je dospelý, ozve sa, keď bude niečo potrebovať', 'Otec je dospělý, ozve se, až bude něco potřebovat', 'Your father is an adult; he will call if he needs anything'), to: 'nocheck' },
        ] },
      { id: 'nocheck', verdict: 'bad', text: L(
        'Večer otec nedvíha telefón. Keď prídeš, je zmätený a má horúcu červenú kožu.',
        'Večer otec nebere telefon. Když přijedeš, je zmatený a má horkou červenou kůži.',
        'In the evening your father does not answer the phone. When you arrive he is confused and his skin is hot and red.'),
        tip: { text: L('Seniori často necítia smäd ani horúčavu. Počas horúčav ich kontroluj aspoň dvakrát denne.', 'Senioři často necítí žízeň ani horko. Během veder je kontroluj aspoň dvakrát denně.', 'Older people often do not feel thirst or heat. Check on them at least twice a day during a heatwave.'), ref: 'zranitelni-seniori' },
        choices: [go('stroke')] },
      { id: 'visit', verdict: 'good', text: L(
        'Na obed nájdeš otca v byte s 33 °C. Je unavený, ale rozpráva normálne. Za celé dopoludnie vypil len pohár vody.',
        'V poledne najdeš otce v bytě s 33 °C. Je unavený, ale mluví normálně. Za celé dopoledne vypil jen sklenici vody.',
        'At lunchtime you find your father in a flat at 33 °C. He is tired but talking normally. He has drunk only one glass of water all morning.'),
        choices: [go('flat')] },
      { id: 'flat', text: L(
        'Ako mu pomôžeš s bytom?',
        'Jak mu pomůžeš s bytem?',
        'How do you help him with the flat?'),
        choices: [
          { text: L('Cez deň zatiahnete okná zvonka, vetráte v noci, dáte mu ventilátor a fľašu vody na dosah s časmi pitia', 'Přes den zastíníte okna zvenku, větráte v noci, dáte mu ventilátor a láhev vody na dosah s časy pití', 'Shade the windows from outside during the day, air the flat at night, give him a fan and keep a bottle of water within reach with a drinking schedule'), to: 'flatok' },
          { text: L('Otvoríte všetky okná dokorán, nech je prievan aj cez deň', 'Otevřete všechna okna dokořán, ať je průvan i přes den', 'Open all the windows wide for a through-draught, even during the day'), to: 'flatbad' },
        ] },
      { id: 'flatbad', verdict: 'bad', text: L(
        'Cez otvorené okná prúdi horúci vzduch a byt sa ohreje na 35 °C.',
        'Otevřenými okny proudí horký vzduch a byt se ohřeje na 35 °C.',
        'Hot air streams in through the open windows and the flat heats up to 35 °C.'),
        tip: { text: L('Cez deň okná zatvor a zatieň zvonka, vetraj v noci a skoro ráno.', 'Přes den okna zavři a zastíň zvenku, větrej v noci a brzy ráno.', 'Keep windows closed and shaded from outside during the day; ventilate at night and early in the morning.'), ref: 'horucavy-pocas' },
        choices: [go('car')] },
      { id: 'flatok', verdict: 'good', text: L(
        'Večer je v byte 30 °C a v noci teplota klesne na 26 °C. Otec pije podľa plánu.',
        'Večer je v bytě 30 °C a v noci teplota klesne na 26 °C. Otec pije podle plánu.',
        'By evening the flat is at 30 °C and it drops to 26 °C overnight. Your father is drinking to schedule.'),
        choices: [go('car')] },
      { id: 'car', text: L(
        'Popoludní ideš s dieťaťom na nákup. Dieťa v aute zaspalo a nákup potrvá päť minút.',
        'Odpoledne jedeš se synem na nákup. V autě usnul a nákup potrvá pět minut.',
        'In the afternoon you go shopping with the baby, who falls asleep in the car. The shopping will take five minutes.'),
        choices: [
          { text: L('Zobudíš ho a zoberieš so sebou', 'Vzbudíš ho a vezmeš s sebou', 'Wake the baby and take them with you'), to: 'carok' },
          { text: L('Necháš ho spať v aute s pootvoreným oknom', 'Necháš ho spát v autě s pootevřeným oknem', 'Let the baby sleep in the car with the window open a crack'), to: 'carbad' },
        ] },
      { id: 'carbad', verdict: 'bad', text: L(
        'Pri pokladni je rad. Po dvanástich minútach je v aute 47 °C a dieťa je spotené a plače. Rýchlo ho schladíš a dáš mu piť.',
        'U pokladny je fronta. Po dvanácti minutách je v autě 47 °C a syn je zpocený a pláče. Rychle ho ochladíš a dáš mu pít.',
        'There is a queue at the till. After twelve minutes it is 47 °C in the car and the baby is drenched in sweat and crying. You cool them down quickly and give them a drink.'),
        tip: { text: L('Nikdy nenechávaj dieťa, seniora ani zviera v aute – teplota v ňom stúpne o viac ako 10 °C za 10 minút.', 'Nikdy nenechávej dítě, seniora ani zvíře v autě – teplota v něm stoupne o víc než 10 °C za 10 minut.', 'Never leave a child, an older person or an animal in a car – the temperature rises by more than 10 °C in 10 minutes.'), ref: 'horucavy-pocas' },
        choices: [go('evening')] },
      { id: 'carok', verdict: 'good', text: L(
        'Dieťa je mrzuté, ale v obchode je klimatizácia a nákup zvládnete spolu.',
        'Syn je mrzutý, ale v obchodě je klimatizace a nákup zvládnete spolu.',
        'The baby is grumpy, but the shop is air-conditioned and you manage the shopping together.'),
        choices: [go('evening')] },
      { id: 'evening', text: L(
        'Večer otec do telefónu hovorí zmätene a nevie, aký je deň. Okamžite za ním ideš.',
        'Večer otec do telefonu mluví zmateně a neví, jaký je den. Okamžitě za ním jedeš.',
        'In the evening your father sounds confused on the phone and does not know what day it is. You go to him at once.'),
        choices: [go('stroke')] },
      { id: 'stroke', text: L(
        'Otec je zmätený, má horúcu suchú kožu a nechce piť. Čo urobíš?',
        'Otec je zmatený, má horkou suchou kůži a nechce pít. Co uděláš?',
        'Your father is confused, his skin is hot and dry, and he refuses to drink. What do you do?'),
        choices: [
          { text: L('Voláš 112, otca vyzlečieš, chladíš mokrými plachtami a ventilátorom, na krk a slabiny dáš ľad', 'Voláš 112, otce svlékneš, chladíš mokrými prostěradly a ventilátorem, na krk a třísla dáš led', 'Call 112, undress him, cool him with wet sheets and a fan, and put ice on his neck and groin'), to: 'strokeok' },
          { text: L('Dáš mu liek na horúčku a necháš ho vyspať', 'Dáš mu lék na horečku a necháš ho vyspat', 'Give him a fever tablet and let him sleep it off'), to: 'strokebad' },
        ] },
      { id: 'strokebad', verdict: 'bad', text: L(
        'Otcov stav sa zhorší a stratí vedomie. Záchranka ho odváža na jednotku intenzívnej starostlivosti.',
        'Otcův stav se zhorší a ztratí vědomí. Záchranka ho odváží na jednotku intenzivní péče.',
        'Your father gets worse and loses consciousness. The ambulance takes him to intensive care.'),
        tip: { text: L('Úpal ohrozuje život: volaj 112 a intenzívne chlaď. Lieky na horúčku pri úpale nepomáhajú.', 'Úpal ohrožuje život: volej 112 a intenzivně chlaď. Léky na horečku při úpalu nepomáhají.', 'Heatstroke is life-threatening: call 112 and cool aggressively. Fever medicine does not help with heatstroke.'), ref: 'horucavy-priznaky' },
        choices: [go('end')] },
      { id: 'strokeok', verdict: 'good', text: L(
        'Záchranári ocenia, že si začal chladiť hneď. Otca odvezú na pozorovanie a na druhý deň je mu lepšie.',
        'Záchranáři ocení, že jsi začal chladit hned. Otce odvezou na pozorování a druhý den je mu lépe.',
        'The paramedics are glad you started cooling him straight away. They take him in for observation, and the next day he is better.'),
        choices: [go('end')] },
      { id: 'end', end: true, text: L(
        'Do konca horúčav býva otec u vás v chladnejšom byte. Kúpiš mu vonkajšie tienenie a teplomer s veľkými číslami.',
        'Do konce veder bydlí otec u vás v chladnějším bytě. Koupíš mu venkovní stínění a teploměr s velkými čísly.',
        'Until the heatwave ends your father stays in your cooler flat. You buy him external shading and a thermometer with large numbers.') },
    ],
  },
  {
    id: 'war', crisis: 'war', icon: '🛡️',
    title: L('Vzdušný poplach o druhej v noci', 'Letecký poplach ve dvě v noci', 'Air-raid alert at 2 am'),
    setting: L(
      'Bývaš v byte v meste s partnerom a 10-ročným synom. V noci ťa zobudí siréna a správa v mobile: „Vzdušný poplach – okamžite sa ukryte.“',
      'Bydlíš v bytě ve městě s partnerem a desetiletým synem. V noci tě vzbudí siréna a zpráva v mobilu: „Hrozí letecký útok – okamžitě se ukryjte.“',
      'You live in a city flat with your partner and 10-year-old son. In the night a siren and a phone alert wake you: "Air-raid alert – take shelter immediately."'),
    prepare: [
      L('Vedieť, kde je najbližší úkryt a ako dlho tam trvá cesta', 'Vědět, kde je nejbližší úkryt a jak dlouho tam trvá cesta', 'Know where the nearest shelter is and how long it takes to get there'),
      L('Úkrytová batožina: voda, svetlo, lieky, doklady', 'Zavazadlo do úkrytu: voda, světlo, léky, doklady', 'A shelter bag: water, light, medicines, documents'),
      L('Vopred vybrané miesto v byte podľa pravidla dvoch stien', 'Předem vybrané místo v bytě podle pravidla dvou zdí', 'A spot in the flat chosen in advance using the two-wall rule'),
      L('Rádio na batérie', 'Rádio na baterie', 'A battery radio'),
      L('Overené zdroje informácií', 'Ověřené zdroje informací', 'Trusted sources of information'),
    ],
    nodes: [
      { id: 'start', text: L(
        'Siréna kolíše a mobil vibruje. Najbližší verejný úkryt je v podzemnej garáži tri minúty od domu.',
        'Siréna kolísá a mobil vibruje. Nejbližší veřejný úkryt je v podzemní garáži tři minuty od domu.',
        'The siren is wailing and your phone is buzzing. The nearest public shelter is an underground car park three minutes from your building.'),
        choices: [
          { text: L('Vezmete úkrytovú batožinu a hneď idete do garáže', 'Vezmete zavazadlo do úkrytu a hned jdete do garáže', 'Grab the shelter bag and go straight to the car park'), to: 'go' },
          { text: L('Najprv sa pozrieš z okna, či niečo vidno', 'Nejdřív se podíváš z okna, jestli něco není vidět', 'First look out of the window to see if anything is visible'), to: 'window' },
        ] },
      { id: 'window', verdict: 'bad', text: L(
        'Pri okne stratíš dve minúty a nič nevidíš. Keby niečo dopadlo blízko, najväčším nebezpečenstvom by bolo práve sklo.',
        'U okna ztratíš dvě minuty a nic nevidíš. Kdyby něco dopadlo blízko, největším nebezpečím by bylo právě sklo.',
        'You lose two minutes at the window and see nothing. Had something landed nearby, the glass itself would have been the greatest danger.'),
        tip: { text: L('Pri poplachu nečakaj a drž sa ďalej od okien – najviac zraňujú črepiny skla.', 'Při poplachu nečekej a drž se dál od oken – nejvíc zraňují střepy skla.', 'When the alarm sounds, do not wait and keep away from windows – flying glass causes the most injuries.'), ref: 'konflikt-utok' },
        choices: [go('late')] },
      { id: 'late', text: L(
        'Z diaľky počuť výbuchy. Do garáže je to tri minúty po ulici.',
        'Z dálky jsou slyšet výbuchy. Do garáže jsou to tři minuty po ulici.',
        'You can hear explosions in the distance. The car park is three minutes away along the street.'),
        choices: [
          { text: L('Zostanete v byte v chodbe za dvoma stenami, ďaleko od okien', 'Zůstanete v bytě v chodbě za dvěma zdmi, daleko od oken', 'Stay in the flat in the hallway behind two walls, away from windows'), to: 'twowall' },
          { text: L('Bežíte po ulici do garáže', 'Běžíte po ulici do garáže', 'Run along the street to the car park'), to: 'street' },
        ] },
      { id: 'street', verdict: 'bad', text: L(
        'Na ulici je tma a výklad obchodu je rozbitý. Do garáže dobehnete, ale syn si o črepy poreže ruku.',
        'Na ulici je tma a výloha obchodu je rozbitá. Do garáže doběhnete, ale syn si o střepy pořeže ruku.',
        'The street is dark and a shop window has shattered. You reach the car park, but your son cuts his hand on the glass.'),
        tip: { text: L('Ak sa do úkrytu nedostaneš za pár minút, uplatni v budove pravidlo dvoch stien.', 'Pokud se do úkrytu nedostaneš během pár minut, uplatni v budově pravidlo dvou zdí.', 'If you cannot reach a shelter within a few minutes, use the two-wall rule inside your building.'), ref: 'ukrytie-dve-steny' },
        choices: [go('shelter')] },
      { id: 'twowall', verdict: 'good', text: L(
        'Sedíte na zemi v chodbe bytu a medzi vami a ulicou sú dve steny. Rádio na batérie hlási ďalšie pokyny.',
        'Sedíte na zemi v chodbě bytu a mezi vámi a ulicí jsou dvě zdi. Rádio na baterie hlásí další pokyny.',
        'You sit on the floor of the hallway with two walls between you and the street. The battery radio gives further instructions.'),
        choices: [go('shelter')] },
      { id: 'go', verdict: 'good', text: L(
        'O tri minúty ste v garáži s ďalšími susedmi. Máte vodu, baterky, lieky a deky.',
        'Za tři minuty jste v garáži s dalšími sousedy. Máte vodu, baterky, léky a deky.',
        'Three minutes later you are in the car park with other neighbours. You have water, torches, medicines and blankets.'),
        choices: [go('shelter')] },
      { id: 'shelter', text: L(
        'Jeden zo susedov natáča na mobil miesto dopadu, ktoré vidno cez vjazd do garáže, a chce video zverejniť.',
        'Jeden ze sousedů natáčí na mobil místo dopadu, které je vidět vjezdem do garáže, a chce video zveřejnit.',
        'A neighbour is filming an impact site visible through the car-park entrance and wants to post the video.'),
        choices: [
          { text: L('Požiadaš ho, aby nič nezverejňoval', 'Požádáš ho, aby nic nezveřejňoval', 'Ask him not to post anything'), to: 'filmok' },
          { text: L('Necháš ho – ľudia predsa majú vedieť, čo sa deje', 'Necháš ho – lidé přece mají vědět, co se děje', 'Let him – people have a right to know what is happening'), to: 'filmbad' },
        ] },
      { id: 'filmbad', verdict: 'bad', text: L(
        'Video sa šíri po sieťach aj s presnou polohou. Úrady neskôr upozornia, že takéto zábery pomáhajú útočníkovi mieriť ďalšie útoky.',
        'Video se šíří po sítích i s přesnou polohou. Úřady později upozorní, že takové záběry pomáhají útočníkovi mířit další útoky.',
        'The video spreads online with its exact location. The authorities later warn that such footage helps the attacker aim further strikes.'),
        tip: { text: L('Nefoť a nezverejňuj miesta dopadov, pohyb vojsk ani polohu krytov.', 'Nefoť a nezveřejňuj místa dopadů, pohyb vojsk ani polohu krytů.', 'Do not photograph or post impact sites, troop movements or shelter locations.'), ref: 'konflikt-utok' },
        choices: [go('fake')] },
      { id: 'filmok', verdict: 'good', text: L(
        'Sused video zmaže a ostatní ti dajú za pravdu.',
        'Soused video smaže a ostatní ti dají za pravdu.',
        'The neighbour deletes the video and the others agree with you.'),
        choices: [go('fake')] },
      { id: 'fake', text: L(
        'Ráno ti z neznámeho čísla príde správa: „Vláda nariadila evakuáciu celého mesta, choďte hneď k hraniciam!“',
        'Ráno ti z neznámého čísla přijde zpráva: „Vláda nařídila evakuaci celého města, jeďte hned k hranicím!“',
        'In the morning a message arrives from an unknown number: "The government has ordered the whole city to evacuate – head for the border now!"'),
        choices: [
          { text: L('Overíš to v rozhlase a na stránkach ministerstva vnútra a obce', 'Ověříš to v rozhlase a na stránkách ministerstva vnitra a obce', 'Check it on the radio and on the interior ministry\'s and municipality\'s websites'), to: 'verify' },
          { text: L('Hneď ju prepošleš rodine a začneš baliť', 'Hned ji přepošleš rodině a začneš balit', 'Forward it to your family straight away and start packing'), to: 'share' },
        ] },
      { id: 'share', verdict: 'bad', text: L(
        'Na cestách z mesta vznikne zápcha. O hodinu rozhlas oznámi, že správa je falošná a nikto evakuáciu nenariadil.',
        'Na silnicích z města vznikne zácpa. Za hodinu rozhlas oznámí, že zpráva je falešná a nikdo evakuaci nenařídil.',
        'Traffic jams build up on the roads out of the city. An hour later the radio announces that the message was fake and no evacuation has been ordered.'),
        tip: { text: L('V kríze sa šíria dezinformácie. Over zdroj a nič nezdieľaj, kým to nepotvrdia úrady.', 'V krizi se šíří dezinformace. Ověř zdroj a nic nesdílej, dokud to nepotvrdí úřady.', 'Disinformation spreads in a crisis. Check the source and share nothing until the authorities confirm it.'), ref: 'varovanie-dezinformacie' },
        choices: [go('debris')] },
      { id: 'verify', verdict: 'good', text: L(
        'Rozhlas potvrdí, že ide o dezinformáciu. Zostávate doma a sledujete oficiálne pokyny.',
        'Rozhlas potvrdí, že jde o dezinformaci. Zůstáváte doma a sledujete oficiální pokyny.',
        'The radio confirms it is disinformation. You stay at home and follow official instructions.'),
        choices: [go('debris')] },
      { id: 'debris', text: L(
        'Cestou do obchodu vidíš na tráve kovový úlomok s drôtmi.',
        'Cestou do obchodu vidíš v trávě kovový úlomek s dráty.',
        'On the way to the shop you see a metal fragment with wires lying in the grass.'),
        choices: [
          { text: L('Nedotkneš sa ho, označíš miesto, varuješ okoloidúcich a voláš 112', 'Nedotkneš se ho, označíš místo, varuješ kolemjdoucí a voláš 112', 'Do not touch it; mark the spot, warn passers-by and call 112'), to: 'debrisok' },
          { text: L('Odfotíš ho zblízka a odnesieš na políciu', 'Vyfotíš ho zblízka a odneseš na policii', 'Take a close-up photo and carry it to the police station'), to: 'debrisbad' },
        ] },
      { id: 'debrisbad', verdict: 'bad', text: L(
        'Policajt sa zľakne: úlomok mohol byť nevybuchnutá časť dronu. Mal si šťastie.',
        'Policista se lekne: úlomek mohl být nevybuchlá část dronu. Měl jsi štěstí.',
        'The police officer is alarmed: it could have been an unexploded part of a drone. You were lucky.'),
        tip: { text: L('Nedotýkaj sa podozrivých predmetov. Vzdiaľ sa, označ miesto a volaj 112.', 'Nedotýkej se podezřelých předmětů. Vzdal se, označ místo a volej 112.', 'Never touch suspicious objects. Move away, mark the spot and call 112.'), ref: 'konflikt-municia' },
        choices: [go('end')] },
      { id: 'debrisok', verdict: 'good', text: L(
        'Pyrotechnici prídu do hodiny a úlomok – časť dronu s výbušninou – bezpečne odstránia.',
        'Pyrotechnici přijedou do hodiny a úlomek – část dronu s výbušninou – bezpečně odstraní.',
        'Bomb-disposal experts arrive within the hour and safely remove the fragment – part of a drone, still carrying explosives.'),
        choices: [go('end')] },
      { id: 'end', end: true, text: L(
        'Večer si s rodinou prejdete, kde je úkryt, kde v byte platí pravidlo dvoch stien a čo patrí do úkrytovej batožiny.',
        'Večer si s rodinou projdete, kde je úkryt, kde v bytě platí pravidlo dvou zdí a co patří do zavazadla do úkrytu.',
        'In the evening you go over with your family where the shelter is, which spot in the flat meets the two-wall rule and what belongs in the shelter bag.') },
    ],
  },
];

export const scenarioById = (id) => SCENARIOS.find((s) => s.id === id);
export const scenarioForCrisis = (crisis) => SCENARIOS.find((s) => s.crisis === crisis);
