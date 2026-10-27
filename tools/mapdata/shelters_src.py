# Zverejnené zoznamy úkrytov CO na Slovensku → jednotný zoznam (shelters_raw.json).
# Zdroje so súradnicami (Nitra, Banská Bystrica) a zoznamy adries (Trenčín, Žilina, Petržalka, okres Michalovce).
import os as _os
WORK = _os.environ.get('KP_MAPWORK') or _os.path.join(_os.path.dirname(_os.path.abspath(__file__)), '..', '.mapwork')  # pracovný priečinok (raw/, out/, shelters/, tiles/)
import json, re, html
S = WORK + '/shelters'
out = []

def add(**k):
    k.setdefault('lat', None); k.setdefault('lon', None)
    out.append(k)

# Nitra – ArcGIS mesta Nitra (CO_zobrazenie): plynotesné a jednoduché úkryty
NITRA_URL = 'https://www.arcgis.com/home/item.html?id=1f20c2e21e4743b6a000d007343c484a'
for i, typ in ((0, 'PU'), (1, 'JUBS')):
    d = json.load(open(f'{S}/nitra-{i}.geojson'))
    for f in d['features']:
        p = f['properties']; lon, lat = f['geometry']['coordinates']
        cap = p.get('kapac_vyuz') or p.get('kapac_max')
        note = p.get('typ') if typ == 'JUBS' else None
        add(city='Nitra', part=p.get('nazov_mc') or p.get('nazov_ku'), address=p.get('adresa'), type=typ, capacity=cap,
            owner=p.get('uzivatel'), note=note, lat=lat, lon=lon, source='Mesto Nitra – webmapa krytov CO', url=NITRA_URL)

# Banská Bystrica – mapa CO krytov (ukrytybb.netlify.app)
d = json.load(open(f'{S}/bb-shelters.json'))
for t in d['types']:
    for it in t['items']:
        loc = it.get('location') or {}
        add(city='Banská Bystrica', address=(it.get('address') or '').replace(', Banská Bystrica', ''), type='OU' if t['type'] == 'OU' else 'PU',
            capacity=it.get('capacity'), owner=(it.get('owner') or '').strip(), note=('iné využitie: ' + it['otherPurpose']) if it.get('otherPurpose') and it['otherPurpose'] != 'nie' else None,
            lat=loc.get('latitude'), lon=loc.get('longitude'), source='Mapa CO krytov Banská Bystrica', url='https://ukrytybb.netlify.app/')

# Trenčín – stránka mesta „Civilná ochrana“ (úkryty v správe mesta, v školách a ďalšie)
t = open(f'{S}/trencin.html', encoding='utf-8', errors='ignore').read()
t = html.unescape(re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', ' ', t)))
i = t.find('SIHOŤ'); j = t.find('Okrem vyššie uvedených 35')
part = None
TN_URL = 'https://trencin.sk/pre-obcanov/o-meste/civilna-ochrana/'
seg = t[i:j]
for m in re.finditer(r'(SIHOŤ – I, II|DLHÉ HONY|ZÁMOSTIE|JUH)\s+–|([A-ZÁ-Ža-zá-ž0-9.\s„“\"]+?)\s*(?:č\.\s*)?(\d+(?:/\d+)?)\s*,\s*s (?:celkovou )?kapacitou(?: ukrytia)?\.?\s*(\d[\d\s]*)\s*osôb', seg):
    if m.group(1): part = m.group(1).replace(' – I, II', ''); continue
    street = m.group(2).strip().strip(',').strip().lstrip('. ').strip()
    street = re.sub(r'^(osôb|\d+\s*úkryt\w*\s*s kapacitou[\d\s]*osôb)\s*', '', street).strip()
    num = m.group(3); cap = int(m.group(4).replace(' ', ''))
    if street.startswith('ZŠ') or street.startswith('ZUŠ') or 'Detské' in street:
        continue
    add(city='Trenčín', part=part.title() if part else None, address=f'{street} {num}', type='OU/PU', capacity=cap, owner='Mesto Trenčín', source='Mesto Trenčín – Civilná ochrana', url=TN_URL)
for name, addr, cap in [('ZŠ Novomeského (pavilón B)', 'Novomeského 11', 265), ('ZŠ Novomeského (pavilón C)', 'Novomeského 11', 265), ('ZŠ Hodžova', 'Hodžova 37', 150),
                        ('ZŠ Veľkomoravská', 'Veľkomoravská 2160/12', 250), ('ZŠ Dlhé Hony', 'Dlhé Hony 1140/1', 300), ('ZUŠ', 'Námestie SNP 2', 150), ('Detské mestečko', 'Na dolinách 27', 350)]:
    add(city='Trenčín', address=addr, name=name, type='OU/PU', capacity=cap, owner='škola (údržba mesto)', note='mimo vyučovania', source='Mesto Trenčín – Civilná ochrana', url=TN_URL)
for addr, cap, owner in [('Golianova 1551/41', 110, 'nájomníci'), ('Hurbanova 58', 135, 'SVB Trenčín'), ('Gen. Svobodu 2756', 430, 'TAM Properties, OC Južanka'), ('Na Vinohrady 4', 400, 'MV SR – Okresný úrad Trenčín')]:
    add(city='Trenčín', address=addr, type='OU/PU', capacity=cap, owner=owner, source='Mesto Trenčín – Civilná ochrana', url=TN_URL)

# Žilina – ochranné stavby v majetku mesta (TASR/dnes24, 2022)
ZA = ['Predmestská 1610/86', 'Veľká okružná 2130/88', 'Veľká okružná 2132/82', 'Juraja Fándlyho 2161/10', 'Antona Bernoláka 2200/34B', 'Antona Bernoláka 2200/26F',
      'Antona Bernoláka 2201/14F', 'Antona Bernoláka 2201/22B', 'Komenského 2231/51', 'Juraja Fándlyho 2195/38', 'Tajovského 2039/4', 'Na Závaží 858/5', 'Rybníky 945/11',
      '1. mája 735/28', '1. mája 1014/10', 'Kukučínova 999/2', 'Republiky 1031/7', 'Hlboká cesta 1707/2', 'Hálkova 2969/20', 'Suvorovova 2678/19', 'Daxnerova 2726/1',
      'Veľká okružná 1310/19', 'Radlinského 296/3', 'Námestie obetí komunizmu 1']
for a in ZA:
    add(city='Žilina', address=a, type='OU/PU', capacity=None, owner='Mesto Žilina', note='najväčší pod ul. J. Fándlyho (> 500 osôb)' if 'Fándlyho 2161' in a else None,
        source='Mesto Žilina (TASR, Dnes24, 2022)', url='https://zilina.dnes24.sk/kryty-civilnej-obrany-v-ziline-aku-maju-kapacitu-a-kde-sa-nachadzaju-video-411897')

# Bratislava-Petržalka – jednoduché úkryty budované svojpomocne (zoznam mestskej časti, 2022)
PE = [('Einsteinova 18', 400), ('Einsteinova 24', 1900), ('Einsteinova 21', 1010), ('Einsteinova 25', 3200), ('Einsteinova 19', 2200), ('Antolská 11', 300), ('Antolská 11', 300),
      ('Fialová 2', 650), ('Fialová 2B', 650), ('Budatínska 36', 120), ('Betliarska 8', 200), ('Bosákova 3', 580), ('Kopčianska 1', 500), ('Sitnianska 1', 39),
      ('Panónska cesta 25', 1600), ('Viedenská cesta 3', 3100), ('Viedenská cesta 7', 1560), ('Vranovská 2', 422), ('Zuzany Chalupovej 8', 1700), ('Zuzany Chalupovej 12', 1800),
      ('Žltá 9', 700), ('Žltá 9', 700), ('Žltá 2', 1100)]
for a, cap in PE:
    add(city='Bratislava', part='Petržalka', address=a, type='JUBS', capacity=cap, owner=None, note='podzemné garáže / suterény',
        source='MČ Bratislava-Petržalka (Bratislava24, 2022)', url='https://bratislava.dnes24.sk/mestske-casti-davaju-dokopy-zoznam-krytov-kde-sa-mozete-ukryt-v-petrzalke-411746')

# Okres Michalovce – zoznam OÚ a PÚ pre obyvateľstvo (Okresný úrad Michalovce)
MI = 'https://minv.sk/swift_data/source/miestna_statna_sprava/okres_michalovce/okr/informacie/Zoznam_ukrytov_pre_obyvatelstvo2.pdf'
for city, a, ev in [('Strážske', 'Nám. A. Dubčeka 300', '08-07-012'), ('Strážske', 'Nám. A. Dubčeka 300', '08-07-013'), ('Veľké Kapušany', 'L. N. Tolstého 1', '08-07-023')]:
    add(city=city, address=a, type='OU/PU', capacity=None, owner=None, note='evid. č. ' + ev, source='Okresný úrad Michalovce', url=MI)

json.dump(out, open(f'{S}/shelters_raw.json', 'w'), ensure_ascii=False, indent=0)
from collections import Counter
print(len(out), Counter((x['city'], x['type']) for x in out))
print([x['address'] for x in out if x['city'] == 'Trenčín'][:50])
