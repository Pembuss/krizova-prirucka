// Profil čitateľa knihy: čo platí pre domácnosť, odvodenie z profilu aplikácie a odporúčané sekcie.
const L = (sk, cs, en) => ({ sk, cs, en });

// Značky sa v Markdowne píšu ako trieda odkazu vo voľbe: [Text](#ciel){.if-kids}
export const READER_TAGS = [
  { id: 'kids', icon: '👶', name: L('Mám deti', 'Mám děti', 'I have children'), short: L('s deťmi', 's dětmi', 'with children') },
  { id: 'baby', icon: '🍼', name: L('Mám dojča alebo batoľa', 'Mám kojence nebo batole', 'I have a baby or toddler'), short: L('s dojčaťom', 's kojencem', 'with a baby') },
  { id: 'seniors', icon: '👵', name: L('Žije s nami senior', 'Žije s námi senior', 'An older person lives with us'), short: L('so seniorom', 'se seniorem', 'with an older person') },
  { id: 'care', icon: '♿', name: L('Niekto potrebuje pomoc (pohyb, choroba)', 'Někdo potřebuje pomoc (pohyb, nemoc)', 'Someone needs help (mobility, illness)'), short: L('s potrebou pomoci', 's potřebou pomoci', 'with care needs') },
  { id: 'device', icon: '🔌', name: L('Niekto závisí od elektrického prístroja', 'Někdo závisí na elektrickém přístroji', 'Someone depends on an electrical device'), short: L('s prístrojom na elektrinu', 's přístrojem na elektřinu', 'with a powered device') },
  { id: 'pets', icon: '🐕', name: L('Mám zvieratá', 'Mám zvířata', 'I have pets'), short: L('so zvieratami', 'se zvířaty', 'with pets') },
  { id: 'flat', icon: '🏢', name: L('Bývam v byte', 'Bydlím v bytě', 'I live in a flat'), short: L('v byte', 'v bytě', 'in a flat') },
  { id: 'house', icon: '🏡', name: L('Bývam v dome', 'Bydlím v domě', 'I live in a house'), short: L('v dome', 'v domě', 'in a house') },
  { id: 'car', icon: '🚗', name: L('Mám auto', 'Mám auto', 'I have a car'), short: L('s autom', 's autem', 'with a car') },
  { id: 'nocar', icon: '🚶', name: L('Nemám auto', 'Nemám auto', 'I have no car'), short: L('bez auta', 'bez auta', 'without a car') },
  { id: 'river', icon: '🌊', name: L('Bývam pri rieke alebo potoku', 'Bydlím u řeky nebo potoka', 'I live near a river or stream'), short: L('pri vode', 'u vody', 'near water') },
  { id: 'npp', icon: '☢️', name: L('Bývam do 30 km od jadrovej elektrárne', 'Bydlím do 30 km od jaderné elektrárny', 'I live within 30 km of a nuclear plant'), short: L('pri jadrovej elektrárni', 'u jaderné elektrárny', 'near a nuclear plant') },
  { id: 'alone', icon: '🧍', name: L('Bývam sám', 'Bydlím sám', 'I live alone'), short: L('sám', 'sám', 'alone') },
];

// Sekcie, ktoré stoja za prečítanie pre danú domácnosť (v poradí dôležitosti).
export const REC = {
  baby: ['zranitelni-deti', 'nakupne-zoznamy-diety'],
  kids: ['zranitelni-deti', 'hygiena-psychika-deti', 'plan-ulohy'],
  seniors: ['zranitelni-seniori', 'horucavy-priznaky'],
  care: ['zranitelni-postihnutie', 'evakuacia-pomoc'],
  device: ['vypadok-elektriny-pristroje', 'energie-scenare'],
  pets: ['zranitelni-zvierata', 'evakuacia-zvierata'],
  flat: ['vypadok-vody', 'ukrytie-dve-steny', 'poziare-uviaznuty'],
  house: ['povodne-pred', 'sebestacnost-teplo', 'burky-pred'],
  car: ['evakuacia-auto', 'kontrolne-zoznamy-auto'],
  nocar: ['evakuacia-pesi', 'evakuacia-pomoc'],
  river: ['povodne', 'povodne-stupa'],
  npp: ['jadrova-jod', 'jadrova'],
  alone: ['plan-sam', 'komunita-priprava'],
};

// Značky z profilu domácnosti v aplikácii. nearestKm = vzdialenosť k najbližšej jadrovej elektrárni.
export function tagsFromProfile(p, nearestKm) {
  if (!p || !Array.isArray(p.members)) return [];
  const ages = p.members.map((m) => Number(m.age)).filter((a) => !Number.isNaN(a));
  const tags = new Set();
  if (ages.some((a) => a < 15)) tags.add('kids');
  if (ages.some((a) => a < 3)) tags.add('baby');
  if (ages.some((a) => a >= 65)) tags.add('seniors');
  if (p.members.some((m) => (m.mobility && m.mobility !== 'full') || m.conditions)) tags.add('care');
  if (p.members.some((m) => m.powerDevice)) tags.add('device');
  if ((p.pets || []).length) tags.add('pets');
  const ht = p.housing?.type;
  if (ht === 'flat') tags.add('flat');
  if (ht === 'house' || ht === 'cottage') tags.add('house');
  const car = p.mobility?.car;
  if (car && car !== 'none') tags.add('car');
  if (car === 'none') tags.add('nocar');
  if (p.risks?.river) tags.add('river');
  if (nearestKm != null && nearestKm <= 30) tags.add('npp');
  if (p.members.length === 1) tags.add('alone');
  return [...tags];
}
