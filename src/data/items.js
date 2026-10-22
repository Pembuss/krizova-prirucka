// Katalóg položiek zásob. Ceny sú orientačné (SK maloobchod, 10/2026) a používateľ ich môže upraviť.
// kcal: na 100 g alebo 100 ml obsahu balenia; size: hmotnosť/objem balenia v g alebo ml; shelf: trvanlivosť v mesiacoch.
// group (len potraviny): cereal | legveg | fruit | dairy | protein | fat | nuts | sweet
// tags: noCook (jesť bez varenia), quick (stačí horúca voda), veg (vegetariánske), vegan, gf (bez lepku), lf (bez laktózy)
const L = (sk, cs, en) => ({ sk, cs, en });

export const CATEGORIES = [
  { id: 'water', icon: '💧', name: L('Voda', 'Voda', 'Water') },
  { id: 'food', icon: '🥫', name: L('Potraviny', 'Potraviny', 'Food') },
  { id: 'infant', icon: '🍼', name: L('Dojčatá a malé deti', 'Kojenci a malé děti', 'Infants and toddlers') },
  { id: 'pet', icon: '🐾', name: L('Zvieratá', 'Zvířata', 'Pets') },
  { id: 'hygiene', icon: '🧻', name: L('Hygiena a sanitácia', 'Hygiena a sanitace', 'Hygiene and sanitation') },
  { id: 'medical', icon: '🩹', name: L('Zdravie a lekárnička', 'Zdraví a lékárnička', 'Health and first aid') },
  { id: 'light', icon: '🔦', name: L('Svetlo a energia', 'Světlo a energie', 'Light and power') },
  { id: 'comms', icon: '📻', name: L('Informácie a spojenie', 'Informace a spojení', 'Information and communication') },
  { id: 'cooking', icon: '🍳', name: L('Varenie bez elektriny', 'Vaření bez elektřiny', 'Cooking without power') },
  { id: 'warmth', icon: '🧣', name: L('Teplo a ochrana', 'Teplo a ochrana', 'Warmth and protection') },
  { id: 'tools', icon: '🧰', name: L('Náradie a utesnenie', 'Nářadí a utěsnění', 'Tools and sealing') },
  { id: 'docs', icon: '📄', name: L('Doklady a peniaze', 'Doklady a peníze', 'Documents and money') },
];

export const FOOD_GROUPS = {
  cereal: { share: 0.36, name: L('Obilniny a prílohy', 'Obiloviny a přílohy', 'Grains and starches') },
  legveg: { share: 0.10, name: L('Strukoviny a zelenina', 'Luštěniny a zelenina', 'Legumes and vegetables') },
  fruit: { share: 0.07, name: L('Ovocie', 'Ovoce', 'Fruit') },
  dairy: { share: 0.08, name: L('Mlieko a mliečne výrobky', 'Mléko a mléčné výrobky', 'Milk and dairy') },
  protein: { share: 0.10, name: L('Ryby, mäso a bielkoviny', 'Ryby, maso a bílkoviny', 'Fish, meat and protein') },
  fat: { share: 0.12, name: L('Tuky a oleje', 'Tuky a oleje', 'Fats and oils') },
  nuts: { share: 0.10, name: L('Orechy, semená, nátierky', 'Ořechy, semínka, pomazánky', 'Nuts, seeds, spreads') },
  sweet: { share: 0.07, name: L('Cukor, med, sladkosti', 'Cukr, med, sladkosti', 'Sugar, honey, sweets') },
};

export const ITEMS = [
  // Voda
  { id: 'water-pack', cat: 'water', name: L('Balená voda 6 × 1,5 l', 'Balená voda 6 × 1,5 l', 'Bottled water 6 × 1.5 l'), size: 9000, unit: 'ml', price: 2.1, shelf: 12, prio: 1 },
  { id: 'water-tabs', cat: 'water', name: L('Tablety na dezinfekciu vody (50 ks)', 'Tablety na dezinfekci vody (50 ks)', 'Water purification tablets (50)'), price: 9.9, shelf: 60, prio: 2 },
  { id: 'water-filter', equip: true, cat: 'water', name: L('Vodný filter (fľaša alebo slamka)', 'Vodní filtr (láhev nebo brčko)', 'Water filter (bottle or straw)'), price: 29.9, shelf: 60, prio: 4 },
  { id: 'jerrycan', equip: true, cat: 'water', name: L('Skladací kanister 10 l', 'Skládací kanystr 10 l', 'Collapsible jerrycan 10 l'), price: 7.9, shelf: 120, prio: 2 },

  // Potraviny – obilniny
  { id: 'rice', cat: 'food', group: 'cereal', name: L('Ryža 1 kg', 'Rýže 1 kg', 'Rice 1 kg'), size: 1000, kcal: 350, price: 1.79, shelf: 24, tags: ['veg', 'vegan', 'gf', 'lf'], w: 3 },
  { id: 'pasta', cat: 'food', group: 'cereal', name: L('Cestoviny 500 g', 'Těstoviny 500 g', 'Pasta 500 g'), size: 500, kcal: 355, price: 0.99, shelf: 24, tags: ['veg', 'vegan', 'lf'], w: 3 },
  { id: 'oats', cat: 'food', group: 'cereal', name: L('Ovsené vločky 500 g', 'Ovesné vločky 500 g', 'Rolled oats 500 g'), size: 500, kcal: 370, price: 0.89, shelf: 12, tags: ['noCook', 'veg', 'vegan', 'lf'], w: 2 },
  { id: 'crispbread', cat: 'food', group: 'cereal', name: L('Chrumkavý chlieb 250 g', 'Křehký chléb 250 g', 'Crispbread 250 g'), size: 250, kcal: 380, price: 1.29, shelf: 12, tags: ['noCook', 'veg', 'vegan', 'lf'], w: 3 },
  { id: 'ricecakes', cat: 'food', group: 'cereal', name: L('Ryžové chlebíčky 100 g', 'Rýžové chlebíčky 100 g', 'Rice cakes 100 g'), size: 100, kcal: 385, price: 0.99, shelf: 12, tags: ['noCook', 'veg', 'vegan', 'gf', 'lf'], w: 1 },
  { id: 'muesli', cat: 'food', group: 'cereal', name: L('Müsli 500 g', 'Müsli 500 g', 'Muesli 500 g'), size: 500, kcal: 400, price: 2.49, shelf: 12, tags: ['noCook', 'veg', 'lf'], w: 2 },
  { id: 'couscous', cat: 'food', group: 'cereal', name: L('Kuskus 500 g', 'Kuskus 500 g', 'Couscous 500 g'), size: 500, kcal: 360, price: 1.49, shelf: 12, tags: ['quick', 'veg', 'vegan', 'lf'], w: 1 },
  { id: 'potatoflakes', cat: 'food', group: 'cereal', name: L('Zemiakové pyré v prášku 250 g', 'Bramborová kaše v prášku 250 g', 'Instant mashed potato 250 g'), size: 250, kcal: 350, price: 1.49, shelf: 12, tags: ['quick', 'veg', 'gf'], w: 1 },
  { id: 'flour', cat: 'food', group: 'cereal', name: L('Múka 1 kg', 'Mouka 1 kg', 'Flour 1 kg'), size: 1000, kcal: 340, price: 0.79, shelf: 12, tags: ['veg', 'vegan', 'lf'], w: 1 },

  // Strukoviny a zelenina
  { id: 'beans', cat: 'food', group: 'legveg', name: L('Fazuľa v konzerve 400 g', 'Fazole v konzervě 400 g', 'Canned beans 400 g'), size: 400, kcal: 90, price: 0.89, shelf: 36, tags: ['noCook', 'veg', 'vegan', 'gf', 'lf'], w: 3 },
  { id: 'chickpeas', cat: 'food', group: 'legveg', name: L('Cícer v konzerve 400 g', 'Cizrna v konzervě 400 g', 'Canned chickpeas 400 g'), size: 400, kcal: 110, price: 0.99, shelf: 36, tags: ['noCook', 'veg', 'vegan', 'gf', 'lf'], w: 2 },
  { id: 'lentils', cat: 'food', group: 'legveg', name: L('Červená šošovica 500 g', 'Červená čočka 500 g', 'Red lentils 500 g'), size: 500, kcal: 350, price: 1.49, shelf: 24, tags: ['veg', 'vegan', 'gf', 'lf'], w: 2 },
  { id: 'corn', cat: 'food', group: 'legveg', name: L('Kukurica v konzerve 340 g', 'Kukuřice v konzervě 340 g', 'Canned sweetcorn 340 g'), size: 340, kcal: 80, price: 0.99, shelf: 36, tags: ['noCook', 'veg', 'vegan', 'gf', 'lf'], w: 2 },
  { id: 'peas', cat: 'food', group: 'legveg', name: L('Hrášok s mrkvou v konzerve 400 g', 'Hrášek s mrkví v konzervě 400 g', 'Canned peas and carrots 400 g'), size: 400, kcal: 60, price: 0.89, shelf: 36, tags: ['noCook', 'veg', 'vegan', 'gf', 'lf'], w: 1 },
  { id: 'tomatoes', cat: 'food', group: 'legveg', name: L('Paradajky v konzerve 400 g', 'Rajčata v konzervě 400 g', 'Canned tomatoes 400 g'), size: 400, kcal: 25, price: 0.79, shelf: 24, tags: ['noCook', 'veg', 'vegan', 'gf', 'lf'], w: 1 },
  { id: 'readymeal', cat: 'food', group: 'legveg', name: L('Hotové jedlo v konzerve 400 g (guláš, polievka)', 'Hotové jídlo v konzervě 400 g (guláš, polévka)', 'Canned ready meal 400 g (stew, soup)'), size: 400, kcal: 120, price: 2.29, shelf: 24, tags: ['noCook', 'lf'], w: 2 },

  // Ovocie
  { id: 'compote', cat: 'food', group: 'fruit', name: L('Ovocný kompót 720 ml', 'Ovocný kompot 720 ml', 'Canned fruit 720 ml'), size: 720, kcal: 70, price: 1.79, shelf: 24, tags: ['noCook', 'veg', 'vegan', 'gf', 'lf'], w: 2 },
  { id: 'driedfruit', cat: 'food', group: 'fruit', name: L('Sušené ovocie 200 g', 'Sušené ovoce 200 g', 'Dried fruit 200 g'), size: 200, kcal: 300, price: 1.99, shelf: 12, tags: ['noCook', 'veg', 'vegan', 'gf', 'lf'], w: 3 },
  { id: 'juice', cat: 'food', group: 'fruit', name: L('Ovocná šťava 1 l', 'Ovocná šťáva 1 l', 'Fruit juice 1 l'), size: 1000, kcal: 45, price: 1.29, shelf: 12, tags: ['noCook', 'veg', 'vegan', 'gf', 'lf'], w: 1 },
  { id: 'pouch', cat: 'food', group: 'fruit', name: L('Ovocná kapsička 100 g', 'Ovocná kapsička 100 g', 'Fruit purée pouch 100 g'), size: 100, kcal: 60, price: 0.69, shelf: 12, tags: ['noCook', 'veg', 'vegan', 'gf', 'lf', 'kids'], w: 1 },

  // Mlieko
  { id: 'uhtmilk', cat: 'food', group: 'dairy', name: L('Trvanlivé mlieko 1 l', 'Trvanlivé mléko 1 l', 'UHT milk 1 l'), size: 1000, kcal: 64, price: 1.09, shelf: 6, tags: ['noCook', 'veg', 'gf'], w: 3 },
  { id: 'milkpowder', cat: 'food', group: 'dairy', name: L('Sušené mlieko 400 g', 'Sušené mléko 400 g', 'Milk powder 400 g'), size: 400, kcal: 495, price: 4.99, shelf: 12, tags: ['noCook', 'veg', 'gf'], w: 1 },
  { id: 'cheese', cat: 'food', group: 'dairy', name: L('Tvrdý syr (parmezán) 200 g', 'Tvrdý sýr (parmazán) 200 g', 'Hard cheese (parmesan) 200 g'), size: 200, kcal: 390, price: 3.49, shelf: 6, tags: ['noCook', 'veg', 'gf'], w: 1 },
  { id: 'plantmilk', cat: 'food', group: 'dairy', name: L('Rastlinný nápoj UHT 1 l', 'Rostlinný nápoj UHT 1 l', 'Plant-based milk UHT 1 l'), size: 1000, kcal: 45, price: 1.49, shelf: 12, tags: ['noCook', 'veg', 'vegan', 'lf'], w: 0 },

  // Bielkoviny
  { id: 'tuna', cat: 'food', group: 'protein', name: L('Tuniak v konzerve 160 g', 'Tuňák v konzervě 160 g', 'Canned tuna 160 g'), size: 160, kcal: 150, price: 1.79, shelf: 36, tags: ['noCook', 'gf', 'lf'], w: 2 },
  { id: 'sardines', cat: 'food', group: 'protein', name: L('Sardinky v oleji 125 g', 'Sardinky v oleji 125 g', 'Sardines in oil 125 g'), size: 125, kcal: 220, price: 0.99, shelf: 36, tags: ['noCook', 'gf', 'lf'], w: 2 },
  { id: 'cannedmeat', cat: 'food', group: 'protein', name: L('Mäsová konzerva 300 g', 'Masová konzerva 300 g', 'Canned meat 300 g'), size: 300, kcal: 250, price: 2.49, shelf: 36, tags: ['noCook', 'lf'], w: 2 },
  { id: 'pate', cat: 'food', group: 'protein', name: L('Paštéta 100 g', 'Paštika 100 g', 'Pâté 100 g'), size: 100, kcal: 280, price: 0.79, shelf: 24, tags: ['noCook', 'lf'], w: 1 },
  { id: 'soy', cat: 'food', group: 'protein', name: L('Sójové kúsky 100 g', 'Sójové kousky 100 g', 'Textured soy protein 100 g'), size: 100, kcal: 340, price: 1.29, shelf: 12, tags: ['quick', 'veg', 'vegan', 'gf', 'lf'], w: 0 },

  // Tuky
  { id: 'oil', cat: 'food', group: 'fat', name: L('Repkový olej 1 l', 'Řepkový olej 1 l', 'Rapeseed oil 1 l'), size: 1000, kcal: 828, price: 2.29, shelf: 15, tags: ['veg', 'vegan', 'gf', 'lf'], w: 3 },
  { id: 'olives', cat: 'food', group: 'fat', name: L('Olivy v náleve 350 g', 'Olivy v nálevu 350 g', 'Olives in brine 350 g'), size: 350, kcal: 150, price: 1.99, shelf: 24, tags: ['noCook', 'veg', 'vegan', 'gf', 'lf'], w: 1 },

  // Orechy a nátierky
  { id: 'peanutbutter', cat: 'food', group: 'nuts', name: L('Arašidové maslo 350 g', 'Arašídové máslo 350 g', 'Peanut butter 350 g'), size: 350, kcal: 600, price: 2.49, shelf: 12, tags: ['noCook', 'veg', 'vegan', 'gf', 'lf'], w: 3 },
  { id: 'nuts', cat: 'food', group: 'nuts', name: L('Zmes orechov 200 g', 'Směs ořechů 200 g', 'Mixed nuts 200 g'), size: 200, kcal: 600, price: 2.49, shelf: 9, tags: ['noCook', 'veg', 'vegan', 'gf', 'lf'], w: 3 },
  { id: 'seeds', cat: 'food', group: 'nuts', name: L('Slnečnicové semienka 200 g', 'Slunečnicová semínka 200 g', 'Sunflower seeds 200 g'), size: 200, kcal: 580, price: 0.99, shelf: 9, tags: ['noCook', 'veg', 'vegan', 'gf', 'lf'], w: 1 },

  // Sladké a ostatné
  { id: 'honey', cat: 'food', group: 'sweet', name: L('Med 500 g', 'Med 500 g', 'Honey 500 g'), size: 500, kcal: 320, price: 5.49, shelf: 36, tags: ['noCook', 'veg', 'gf', 'lf'], w: 1 },
  { id: 'sugar', cat: 'food', group: 'sweet', name: L('Cukor 1 kg', 'Cukr 1 kg', 'Sugar 1 kg'), size: 1000, kcal: 400, price: 0.99, shelf: 60, tags: ['noCook', 'veg', 'vegan', 'gf', 'lf'], w: 1 },
  { id: 'chocolate', cat: 'food', group: 'sweet', name: L('Horká čokoláda 100 g', 'Hořká čokoláda 100 g', 'Dark chocolate 100 g'), size: 100, kcal: 550, price: 1.29, shelf: 12, tags: ['noCook', 'veg', 'gf'], w: 2 },
  { id: 'bars', cat: 'food', group: 'sweet', name: L('Cereálne tyčinky 6 × 25 g', 'Cereální tyčinky 6 × 25 g', 'Cereal bars 6 × 25 g'), size: 150, kcal: 420, price: 1.99, shelf: 9, tags: ['noCook', 'veg'], w: 2 },

  // Doplnky (nepočítajú sa do kalórií)
  { id: 'salt', cat: 'food', name: L('Soľ 1 kg', 'Sůl 1 kg', 'Salt 1 kg'), price: 0.39, shelf: 120, prio: 3 },
  { id: 'tea', cat: 'food', name: L('Čaj 20 vrecúšok', 'Čaj 20 sáčků', 'Tea 20 bags'), price: 0.99, shelf: 24, prio: 4 },
  { id: 'coffee', cat: 'food', name: L('Instantná káva 100 g', 'Instantní káva 100 g', 'Instant coffee 100 g'), price: 3.99, shelf: 24, prio: 5 },
  { id: 'soup', cat: 'food', name: L('Instantná polievka', 'Instantní polévka', 'Instant soup'), price: 0.59, shelf: 12, prio: 4 },
  { id: 'vitamins', cat: 'food', name: L('Multivitamín 30 tabliet', 'Multivitamín 30 tablet', 'Multivitamins 30 tablets'), price: 3.99, shelf: 24, prio: 4 },

  // Dojčatá
  { id: 'formula', cat: 'infant', name: L('Dojčenské mlieko 800 g', 'Kojenecké mléko 800 g', 'Infant formula 800 g'), size: 800, price: 19.99, shelf: 12, prio: 1 },
  { id: 'babyjar', cat: 'infant', name: L('Detský príkrm v pohári 190 g', 'Dětský příkrm ve skleničce 190 g', 'Baby food jar 190 g'), price: 1.19, shelf: 12, prio: 1 },
  { id: 'diapers', cat: 'infant', name: L('Plienky (balenie 50 ks)', 'Pleny (balení 50 ks)', 'Nappies (pack of 50)'), price: 9.99, shelf: 60, prio: 1 },
  { id: 'babywipes', cat: 'infant', name: L('Detské vlhčené obrúsky 64 ks', 'Dětské vlhčené ubrousky 64 ks', 'Baby wipes 64'), price: 1.49, shelf: 24, prio: 2 },

  // Zvieratá
  { id: 'dogfood', cat: 'pet', name: L('Granule pre psa 3 kg', 'Granule pro psa 3 kg', 'Dry dog food 3 kg'), size: 3000, price: 9.99, shelf: 12, prio: 2 },
  { id: 'catfood', cat: 'pet', name: L('Granule pre mačku 2 kg', 'Granule pro kočku 2 kg', 'Dry cat food 2 kg'), size: 2000, price: 7.99, shelf: 12, prio: 2 },
  { id: 'litter', cat: 'pet', name: L('Podstielka pre mačky 10 l', 'Stelivo pro kočky 10 l', 'Cat litter 10 l'), price: 4.99, shelf: 60, prio: 3 },

  // Hygiena
  { id: 'toiletpaper', cat: 'hygiene', name: L('Toaletný papier 8 roliek', 'Toaletní papír 8 rolí', 'Toilet paper 8 rolls'), price: 3.49, shelf: 120, prio: 2 },
  { id: 'wetwipes', cat: 'hygiene', name: L('Vlhčené obrúsky 72 ks', 'Vlhčené ubrousky 72 ks', 'Wet wipes 72'), price: 1.49, shelf: 24, prio: 2 },
  { id: 'sanitizer', cat: 'hygiene', name: L('Dezinfekcia na ruky 500 ml', 'Dezinfekce na ruce 500 ml', 'Hand sanitiser 500 ml'), price: 3.99, shelf: 24, prio: 2 },
  { id: 'soap', cat: 'hygiene', name: L('Mydlo', 'Mýdlo', 'Soap bar'), price: 0.79, shelf: 36, prio: 3 },
  { id: 'toothpaste', cat: 'hygiene', name: L('Zubná pasta a kefka', 'Zubní pasta a kartáček', 'Toothpaste and toothbrush'), price: 2.49, shelf: 24, prio: 3 },
  { id: 'pads', cat: 'hygiene', name: L('Menštruačné potreby (balenie)', 'Menstruační potřeby (balení)', 'Menstrual products (pack)'), price: 2.99, shelf: 36, prio: 2 },
  { id: 'garbagebags', cat: 'hygiene', name: L('Vrecia na odpad 35 l (30 ks)', 'Pytle na odpad 35 l (30 ks)', 'Rubbish bags 35 l (30)'), price: 1.99, shelf: 120, prio: 2 },
  { id: 'bucket', equip: true, cat: 'hygiene', name: L('Vedro s vekom 20 l (núdzový záchod)', 'Kbelík s víkem 20 l (nouzový záchod)', 'Bucket with lid 20 l (emergency toilet)'), price: 6.99, shelf: 240, prio: 3 },
  { id: 'absorbent', cat: 'hygiene', name: L('Absorbent do núdzového záchodu 10 l', 'Absorbent do nouzového záchodu 10 l', 'Absorbent for emergency toilet 10 l'), price: 4.99, shelf: 60, prio: 3 },
  { id: 'bleach', cat: 'hygiene', name: L('Chlórový dezinfekčný prípravok 1 l', 'Chlorový dezinfekční přípravek 1 l', 'Chlorine bleach 1 l'), price: 1.49, shelf: 12, prio: 3 },

  // Zdravie
  { id: 'firstaid', equip: true, cat: 'medical', name: L('Lekárnička (základná výbava)', 'Lékárnička (základní výbava)', 'First-aid kit (basic)'), price: 14.99, shelf: 60, prio: 1 },
  { id: 'tourniquet', equip: true, cat: 'medical', name: L('Škrtidlo (turniket)', 'Škrtidlo (turniket)', 'Tourniquet'), price: 29.99, shelf: 120, prio: 3 },
  { id: 'ffp2', cat: 'medical', name: L('Respirátory FFP2 (10 ks)', 'Respirátory FFP2 (10 ks)', 'FFP2 respirators (10)'), price: 4.99, shelf: 36, prio: 2 },
  { id: 'gloves', cat: 'medical', name: L('Jednorazové rukavice (100 ks)', 'Jednorázové rukavice (100 ks)', 'Disposable gloves (100)'), price: 6.99, shelf: 60, prio: 3 },
  { id: 'thermometer', equip: true, cat: 'medical', name: L('Teplomer', 'Teploměr', 'Thermometer'), price: 6.99, shelf: 120, prio: 3 },
  { id: 'painkillers', cat: 'medical', name: L('Lieky proti bolesti a horúčke', 'Léky proti bolesti a horečce', 'Pain and fever relief'), price: 2.49, shelf: 36, prio: 2 },
  { id: 'ors', cat: 'medical', name: L('Rehydratačný roztok (vrecúška)', 'Rehydratační roztok (sáčky)', 'Oral rehydration salts'), price: 5.99, shelf: 36, prio: 3 },
  { id: 'meds30', cat: 'medical', name: L('Pravidelné lieky na 30 dní', 'Pravidelné léky na 30 dní', 'Regular medicines for 30 days'), price: 0, shelf: 12, prio: 1 },

  // Svetlo a energia
  { id: 'headlamp', equip: true, cat: 'light', name: L('Čelovka', 'Čelovka', 'Headlamp'), price: 12.99, shelf: 120, prio: 1 },
  { id: 'torch', equip: true, cat: 'light', name: L('Baterka', 'Svítilna', 'Torch'), price: 9.99, shelf: 120, prio: 2 },
  { id: 'lantern', equip: true, cat: 'light', name: L('LED lampáš', 'LED lucerna', 'LED lantern'), price: 14.99, shelf: 120, prio: 3 },
  { id: 'battAA', cat: 'light', name: L('Batérie AA (8 ks)', 'Baterie AA (8 ks)', 'AA batteries (8)'), price: 4.99, shelf: 84, prio: 1 },
  { id: 'battAAA', cat: 'light', name: L('Batérie AAA (8 ks)', 'Baterie AAA (8 ks)', 'AAA batteries (8)'), price: 4.99, shelf: 84, prio: 1 },
  { id: 'powerbank', equip: true, cat: 'light', name: L('Powerbanka 20 000 mAh', 'Powerbanka 20 000 mAh', 'Power bank 20,000 mAh'), price: 24.99, shelf: 60, prio: 1 },
  { id: 'solar', equip: true, cat: 'light', name: L('Skladací solárny panel 20 W', 'Skládací solární panel 20 W', 'Folding solar panel 20 W'), price: 39.99, shelf: 120, prio: 4 },
  { id: 'powerstation', equip: true, cat: 'light', name: L('Prenosná nabíjacia stanica 500 Wh', 'Přenosná nabíjecí stanice 500 Wh', 'Portable power station 500 Wh'), price: 349, shelf: 120, prio: 5 },
  { id: 'candles', cat: 'light', name: L('Sviečky (10 ks) a zápalky', 'Svíčky (10 ks) a zápalky', 'Candles (10) and matches'), price: 3.49, shelf: 120, prio: 3 },

  // Informácie
  { id: 'radio', equip: true, cat: 'comms', name: L('Rádio na batérie, kľučku alebo solárne', 'Rádio na baterie, kličku nebo solární', 'Battery, crank or solar radio'), price: 29.99, shelf: 120, prio: 1 },
  { id: 'notebook', cat: 'comms', name: L('Zápisník, ceruzka, fixka', 'Zápisník, tužka, fix', 'Notebook, pencil, marker'), price: 2.99, shelf: 120, prio: 3 },
  { id: 'whistle', equip: true, cat: 'comms', name: L('Píšťalka', 'Píšťalka', 'Whistle'), price: 2.49, shelf: 240, prio: 3 },

  // Varenie
  { id: 'stove', equip: true, cat: 'cooking', name: L('Kartušový varič (iba vonku alebo pri vetraní)', 'Kartušový vařič (jen venku nebo při větrání)', 'Cartridge camping stove (outdoors or ventilated)'), price: 24.99, shelf: 120, prio: 3 },
  { id: 'gas', cat: 'cooking', name: L('Plynová kartuša 227 g', 'Plynová kartuše 227 g', 'Gas cartridge 227 g'), price: 3.49, shelf: 120, prio: 3 },
  { id: 'lighter', cat: 'cooking', name: L('Zapaľovač a zápalky', 'Zapalovač a zápalky', 'Lighter and matches'), price: 1.99, shelf: 120, prio: 2 },
  { id: 'canopener', equip: true, cat: 'cooking', name: L('Ručný otvárač konzerv', 'Ruční otvírák konzerv', 'Manual can opener'), price: 2.99, shelf: 240, prio: 1 },

  // Teplo a ochrana
  { id: 'sleepingbag', equip: true, cat: 'warmth', name: L('Spací vak', 'Spacák', 'Sleeping bag'), price: 29.99, shelf: 120, prio: 3 },
  { id: 'blanket', equip: true, cat: 'warmth', name: L('Deka alebo izotermická fólia', 'Deka nebo izotermická fólie', 'Blanket or emergency foil blanket'), price: 4.99, shelf: 120, prio: 2 },
  { id: 'hotwaterbottle', equip: true, cat: 'warmth', name: L('Termofor', 'Termofor', 'Hot-water bottle'), price: 5.99, shelf: 120, prio: 4 },
  { id: 'codetector', equip: true, cat: 'warmth', name: L('Detektor oxidu uhoľnatého (CO)', 'Detektor oxidu uhelnatého (CO)', 'Carbon monoxide (CO) alarm'), price: 24.99, shelf: 84, prio: 1 },
  { id: 'smokedetector', equip: true, cat: 'warmth', name: L('Detektor dymu', 'Detektor kouře', 'Smoke alarm'), price: 9.99, shelf: 120, prio: 1 },
  { id: 'extinguisher', equip: true, cat: 'warmth', name: L('Hasiaci prístroj 6 kg a hasiaca deka', 'Hasicí přístroj 6 kg a hasicí deka', 'Fire extinguisher 6 kg and fire blanket'), price: 49.99, shelf: 120, prio: 2 },

  // Náradie
  { id: 'tape', cat: 'tools', name: L('Lepiaca páska (textilná)', 'Lepicí páska (textilní)', 'Duct tape'), price: 3.99, shelf: 60, prio: 2 },
  { id: 'sheeting', cat: 'tools', name: L('Hrubá PE fólia 4 × 5 m', 'Silná PE fólie 4 × 5 m', 'Heavy plastic sheeting 4 × 5 m'), price: 5.99, shelf: 120, prio: 2 },
  { id: 'multitool', equip: true, cat: 'tools', name: L('Multifunkčný nôž alebo náradie', 'Multifunkční nůž nebo nářadí', 'Multitool or pocket knife'), price: 19.99, shelf: 240, prio: 3 },
  { id: 'workgloves', cat: 'tools', name: L('Pracovné rukavice', 'Pracovní rukavice', 'Work gloves'), price: 2.99, shelf: 120, prio: 3 },
  { id: 'sandbags', equip: true, cat: 'tools', name: L('Vrecia na piesok (10 ks)', 'Pytle na písek (10 ks)', 'Sandbags (10)'), price: 6.99, shelf: 120, prio: 4 },

  // Doklady a peniaze
  { id: 'docbag', equip: true, cat: 'docs', name: L('Vodotesný obal na doklady', 'Vodotěsný obal na doklady', 'Waterproof document pouch'), price: 4.99, shelf: 240, prio: 1 },
  { id: 'usb', equip: true, cat: 'docs', name: L('USB kľúč so skenmi dokladov (šifrovaný)', 'USB klíč se skeny dokladů (šifrovaný)', 'USB stick with scanned documents (encrypted)'), price: 6.99, shelf: 120, prio: 3 },
  { id: 'cash', cat: 'docs', name: L('Hotovosť v drobných bankovkách a minciach', 'Hotovost v drobných bankovkách a mincích', 'Cash in small notes and coins'), price: 0, shelf: 0, prio: 1 },
];

export const itemById = (id) => ITEMS.find((i) => i.id === id);
