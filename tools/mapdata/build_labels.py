# Popisy pre offline mapu: štáty, mestá a obce, čísla ciest (labels.js) a názvy ulíc do podrobných dlaždíc.
import os as _os
WORK = _os.environ.get('KP_MAPWORK') or _os.path.join(_os.path.dirname(_os.path.abspath(__file__)), '..', '.mapwork')  # pracovný priečinok (raw/, out/, shelters/, tiles/)
import json, math, pickle, glob, os, sys, re
from collections import defaultdict
from shapely.geometry import shape, Point, box, LineString

RAW = WORK + '/raw'
TILES = sys.argv[1] if len(sys.argv) > 1 else WORK + '/tiles'
EU_BBOX = (-25.0, 34.0, 45.0, 71.5)

# Názvy európskych štátov v slovenčine a češtine (ISO 3166-1 alpha-2)
NAMES = {
    'SK': ('Slovensko', 'Slovensko'), 'CZ': ('Česko', 'Česko'), 'AT': ('Rakúsko', 'Rakousko'), 'HU': ('Maďarsko', 'Maďarsko'),
    'PL': ('Poľsko', 'Polsko'), 'UA': ('Ukrajina', 'Ukrajina'), 'DE': ('Nemecko', 'Německo'), 'CH': ('Švajčiarsko', 'Švýcarsko'),
    'LI': ('Lichtenštajnsko', 'Lichtenštejnsko'), 'SI': ('Slovinsko', 'Slovinsko'), 'HR': ('Chorvátsko', 'Chorvatsko'),
    'RS': ('Srbsko', 'Srbsko'), 'RO': ('Rumunsko', 'Rumunsko'), 'MD': ('Moldavsko', 'Moldavsko'), 'BY': ('Bielorusko', 'Bělorusko'),
    'LT': ('Litva', 'Litva'), 'LV': ('Lotyšsko', 'Lotyšsko'), 'EE': ('Estónsko', 'Estonsko'), 'RU': ('Rusko', 'Rusko'),
    'FI': ('Fínsko', 'Finsko'), 'SE': ('Švédsko', 'Švédsko'), 'NO': ('Nórsko', 'Norsko'), 'DK': ('Dánsko', 'Dánsko'),
    'NL': ('Holandsko', 'Nizozemsko'), 'BE': ('Belgicko', 'Belgie'), 'LU': ('Luxembursko', 'Lucembursko'), 'FR': ('Francúzsko', 'Francie'),
    'GB': ('Spojené kráľovstvo', 'Spojené království'), 'IE': ('Írsko', 'Irsko'), 'IS': ('Island', 'Island'), 'ES': ('Španielsko', 'Španělsko'),
    'PT': ('Portugalsko', 'Portugalsko'), 'IT': ('Taliansko', 'Itálie'), 'MT': ('Malta', 'Malta'), 'GR': ('Grécko', 'Řecko'),
    'AL': ('Albánsko', 'Albánie'), 'MK': ('Severné Macedónsko', 'Severní Makedonie'), 'BG': ('Bulharsko', 'Bulharsko'),
    'BA': ('Bosna a Hercegovina', 'Bosna a Hercegovina'), 'ME': ('Čierna Hora', 'Černá Hora'), 'XK': ('Kosovo', 'Kosovo'),
    'TR': ('Turecko', 'Turecko'), 'CY': ('Cyprus', 'Kypr'), 'AD': ('Andorra', 'Andorra'), 'MC': ('Monako', 'Monako'),
    'SM': ('San Maríno', 'San Marino'), 'VA': ('Vatikán', 'Vatikán'), 'GE': ('Gruzínsko', 'Gruzie'), 'AM': ('Arménsko', 'Arménie'),
    'AZ': ('Azerbajdžan', 'Ázerbájdžán'), 'KZ': ('Kazachstan', 'Kazachstán'), 'MA': ('Maroko', 'Maroko'), 'DZ': ('Alžírsko', 'Alžírsko'),
    'TN': ('Tunisko', 'Tunisko'), 'LY': ('Líbya', 'Libye'), 'EG': ('Egypt', 'Egypt'), 'SY': ('Sýria', 'Sýrie'), 'IQ': ('Irak', 'Irák'),
    'IR': ('Irán', 'Írán'), 'LB': ('Libanon', 'Libanon'), 'IL': ('Izrael', 'Izrael'), 'JO': ('Jordánsko', 'Jordánsko'),
    'SA': ('Saudská Arábia', 'Saúdská Arábie'),
}
SMALL = {'LI', 'AD', 'MC', 'SM', 'VA', 'MT', 'LU'}

def ne(name):
    return json.load(open(f'{RAW}/ne/{name}.geojson'))['features']

lab = {'c': [], 'p': [], 's': []}
E5 = lambda v: int(round(v * 1e5))

# ---- štáty ----
cover = []
for f in ne('ne_10m_admin_0_countries'):
    p = f['properties']
    cc = p['ISO_A2'] if p['ISO_A2'] != '-99' else p['ISO_A2_EH']
    x, y = p['LABEL_X'], p['LABEL_Y']
    if not (EU_BBOX[0] <= x <= EU_BBOX[2] and EU_BBOX[1] <= y <= EU_BBOX[3]): continue
    sk, cs = NAMES.get(cc, (p['NAME_EN'] or p['NAME'], p['NAME_EN'] or p['NAME']))
    minz = max(2, int(p.get('MIN_LABEL') or 3))
    if cc in SMALL: minz = max(minz, 6)
    lab['c'].append([E5(x), E5(y), {'sk': sk, 'cs': cs, 'en': p['NAME_EN'] or p['NAME']}, minz, 7])
    if cc in ('SK', 'CZ', 'AT', 'PL', 'UA', 'HU'): cover.append((cc, shape(f['geometry'])))

# ---- obce a mestá ----
SK = pickle.load(open(WORK + '/out/sk.pkl', 'rb'))
NB = {os.path.basename(f)[3:5]: pickle.load(open(f, 'rb')) for f in glob.glob(WORK + '/out/nb_*.pkl')}
HAVE = {'SK', 'CZ', 'AT', 'PL', 'UA'} | ({'HU'} if 'hu' in NB else set())
COVBOX = {'PL': (13.5, 48.9, 24.5, 52.6), 'UA': (21.9, 47.6, 26.2, 51.0)}
cov_geoms = []
for cc, g in cover:
    if cc not in HAVE: continue
    if cc in COVBOX: g = g.intersection(box(*COVBOX[cc]))
    cov_geoms.append(g)
from shapely.ops import unary_union
from shapely import prepare
COVER = unary_union(cov_geoms); prepare(COVER)

def pop(v):
    try: return int(re.sub(r'[^\d]', '', str(v or '')) or 0)
    except ValueError: return 0

# typ: 0 veľkomesto, 1 mesto, 2 menšie mesto, 3 obec, 4 osada/časť, 5 štvrť
def place_rank(t, p, sk):
    if t == 'city':
        if p >= 1_000_000: return 4, 0
        if p >= 300_000: return 5, 0
        if p >= 100_000: return 6, 1
        return 7, 1
    if t == 'town':
        if p >= 50_000: return 7, 1
        if p >= 20_000: return 8, 2
        return 9, 2
    if t == 'village': return (10 if p >= 2500 else 11), 3
    if t == 'suburb': return 12, 4
    if t == 'borough': return 11, 4
    if t == 'hamlet': return 13, 4
    if t == 'quarter': return 13, 5
    if t == 'neighbourhood': return 14, 5
    return None

seen = set()
def add_place(name, lon, lat, t, p, sk=False):
    r = place_rank(t, p, sk)
    if not r: return
    key = (name, round(lon, 2), round(lat, 2))
    if key in seen: return
    seen.add(key)
    lab['p'].append([E5(lon), E5(lat), name, r[0], r[1], p])

for p in SK['places']:
    add_place(p['name'], p['lon'], p['lat'], p['type'], pop(p.get('pop')), True)
for cc, d in NB.items():
    for p in d['places']:
        if p['type'] == 'village' and cc in ('pl', 'ua') and pop(p.get('pop')) < 1000:
            # malé obce ďaleko od Slovenska vynecháme
            if not (17.5 <= p['lon'] <= 23.5 and p['lat'] <= 50.2): continue
        add_place(p['name'], p['lon'], p['lat'], p['type'], pop(p.get('pop')))
# Natural Earth mimo pokrytej oblasti
for f in ne('ne_10m_populated_places'):
    p = f['properties']
    lon, lat = p['LONGITUDE'], p['LATITUDE']
    if not (EU_BBOX[0] <= lon <= EU_BBOX[2] and EU_BBOX[1] <= lat <= EU_BBOX[3]): continue
    if COVER.contains(Point(lon, lat)): continue
    mz = p.get('MIN_ZOOM') or 6
    if mz > 9: continue
    popv = int(p.get('POP_MAX') or 0)
    tp = 0 if p.get('ADM0CAP') or popv >= 1_000_000 else 1 if popv >= 100_000 else 2
    name = p.get('NAME') or p.get('NAME_EN')
    lab['p'].append([E5(lon), E5(lat), name, max(3, int(round(mz))), tp, popv])

# ---- čísla ciest ----
def shields_from(roads, sk=False):
    by = defaultdict(list)
    for r in roads:
        c = r['cls']
        ref = (r['tags'].get('ref') or '').split(';')[0].strip()
        if not ref: continue
        cls = {'motorway': 0, 'trunk': 2, 'primary': 3, 'secondary': 4}.get(c)
        if cls is None: continue
        if cls == 4 and not sk: continue
        by[(ref, cls)].append(r['coords'])
    for (ref, cls), lines in by.items():
        # body každých ~ N km pozdĺž ciest s týmto číslom
        for spacing, minz in ((25000, 7 if cls <= 2 else 9), (8000, 10 if cls <= 3 else 11), (2500, 12 if cls <= 3 else 13)):
            if cls == 4 and spacing == 25000: continue
            acc = spacing / 2
            for coords in lines:
                for (x1, y1), (x2, y2) in zip(coords, coords[1:]):
                    d = math.hypot((x2 - x1) * 111320 * math.cos(math.radians(y1)), (y2 - y1) * 110540)
                    acc += d
                    if acc >= spacing:
                        acc = 0
                        lab['s'].append([E5((x1 + x2) / 2), E5((y1 + y2) / 2), ref, cls, minz])
shields_from(SK['roads'], True)
for d in NB.values(): shields_from(d['roads'])

print({k: len(v) for k, v in lab.items()})
os.makedirs(TILES, exist_ok=True)
open(f'{TILES}/labels.js', 'w').write('KPMAP_LABELS(' + json.dumps(lab, separators=(',', ':'), ensure_ascii=False) + ');\n')
print('labels.js', round(os.path.getsize(f'{TILES}/labels.js') / 1e6, 2), 'MB')

# ---- názvy ulíc do dlaždíc dz 12 ----
EXT = 4096
def merc(lon, lat):
    s = math.sin(math.radians(lat))
    return (lon + 180) / 360, 0.5 - math.log((1 + s) / (1 - s)) / (4 * math.pi)
PRIO = {'primary': 6, 'secondary': 5, 'tertiary': 4, 'trunk': 6, 'unclassified': 3, 'residential': 2, 'living_street': 1, 'pedestrian': 1, 'service': 0}
MINZ = {'primary': 14, 'secondary': 14, 'tertiary': 15, 'trunk': 14, 'unclassified': 15, 'residential': 15, 'living_street': 16, 'pedestrian': 16, 'service': 17}
by_tile = defaultdict(list)
for r in SK['roads']:
    name = r['tags'].get('name')
    if not name or r['cls'] not in PRIO: continue
    pts = [merc(x, y) for x, y in r['coords']]
    segs = []; total = 0
    for a, b in zip(pts, pts[1:]):
        d = math.hypot(b[0] - a[0], b[1] - a[1]); segs.append((a, b, d)); total += d
    m80 = 80 / (40075016 * 0.66)  # ~80 m v jednotkách projekcie
    if total < m80: continue
    step = 500 / (40075016 * 0.66)
    targets = [total / 2] if total < step * 1.5 else [step / 2 + i * step for i in range(int(total / step))]
    for tgt in targets:
        acc = 0
        for a, b, d in segs:
            if acc + d >= tgt and d > 0:
                t = (tgt - acc) / d
                X, Y = a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t
                ang = math.degrees(math.atan2(b[1] - a[1], b[0] - a[0]))
                tx, ty = int(X * 4096), int(Y * 4096)
                by_tile[(tx, ty)].append([int((X * 4096 - tx) * EXT), int((Y * 4096 - ty) * EXT), int(round(ang * 10)), name, MINZ[r['cls']], PRIO[r['cls']]])
                break
            acc += d
added = 0
for f in glob.glob(f'{TILES}/12-*.js'):
    s = open(f).read()
    m = re.match(r'KPMAP_ADD\("([^"]+)",(.*)\);\s*$', s, re.S)
    key, tiles = m.group(1), json.loads(m.group(2))
    for k in list(tiles):
        _, x, y = map(int, k.split('/'))
        t = by_tile.get((x, y))
        if t:
            tiles[k] = {'g': tiles[k], 't': t}; added += len(t)
    open(f, 'w').write(f'KPMAP_ADD("{key}",' + json.dumps(tiles, separators=(',', ':'), ensure_ascii=False) + ');\n')
print('názvy ulíc', added)
