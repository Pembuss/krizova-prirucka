# Offline vyhľadávanie (gaz.js), dôležité miesta (poi.js) a úkryty CO zo zoznamov miest (geokódované podľa adries OSM).
import os as _os
WORK = _os.environ.get('KP_MAPWORK') or _os.path.join(_os.path.dirname(_os.path.abspath(__file__)), '..', '.mapwork')  # pracovný priečinok (raw/, out/, shelters/, tiles/)
import json, math, pickle, glob, os, re, sys, unicodedata
from collections import defaultdict, Counter

OUT = sys.argv[1] if len(sys.argv) > 1 else WORK + '/tiles'
RAW = WORK + '/raw'
SK = pickle.load(open(WORK + '/out/sk.pkl', 'rb'))
NB = {os.path.basename(f)[3:5]: pickle.load(open(f, 'rb')) for f in glob.glob(WORK + '/out/nb_*.pkl')}
E5 = lambda v: int(round(v * 1e5))

def norm(s):
    s = unicodedata.normalize('NFKD', s or '').encode('ascii', 'ignore').decode().lower()
    return re.sub(r'[^a-z0-9]+', ' ', s).strip()
def dist(a, b):
    return math.hypot((a[0] - b[0]) * 111320 * math.cos(math.radians(a[1])), (a[1] - b[1]) * 110540)

# ---------- obce ----------
places = [p for p in SK['places']]
towns = [p for p in places if p['type'] in ('city', 'town', 'village')]
GRID = defaultdict(list)
for p in towns: GRID[(int(p['lon'] * 10), int(p['lat'] * 10))].append(p)
def nearest_town(lon, lat, types=('city', 'town', 'village'), maxd=12000):
    best, bd = None, maxd
    gx, gy = int(lon * 10), int(lat * 10)
    for i in range(gx - 2, gx + 3):
        for j in range(gy - 2, gy + 3):
            for p in GRID.get((i, j), ()):
                if p['type'] not in types: continue
                d = dist((lon, lat), (p['lon'], p['lat']))
                if d < bd: best, bd = p, d
    return best

# ---------- adresy (na geokódovanie úkrytov a priradenie ulíc k obciam) ----------
addr = SK['addr']  # (street, city, conscr, streetnum, housenumber, postcode, lon, lat)
by_city_street = defaultdict(list)
street_city = defaultdict(Counter)
for a in addr:
    st, city = a[0], a[1]
    if st and city:
        by_city_street[(norm(city), norm(st))].append(a)
        street_city[norm(st)][city] += 1

# ---------- ulice ----------
CTX = []; CTXI = {}
def ctx(name):
    if name not in CTXI: CTXI[name] = len(CTX); CTX.append(name)
    return CTXI[name]
streets = defaultdict(list)  # (name, city) → body
for r in SK['roads']:
    name = r['tags'].get('name')
    if not name or r['cls'] in ('footway', 'path', 'steps', 'cycleway', 'bridleway', 'track'): continue
    c = r['coords']
    mid = c[len(c) // 2]
    # obec: podľa adries na tejto ulici v okolí, inak najbližšia obec
    city = None
    n = norm(name)
    if n in street_city:
        best, bd = None, 6000
        for cname, _ in street_city[n].most_common(12):
            pts = by_city_street.get((norm(cname), n))
            if not pts: continue
            d = min(dist(mid, (p[6], p[7])) for p in pts[:: max(1, len(pts) // 20)])
            if d < bd: best, bd = cname, d
        city = best
    if not city:
        t = nearest_town(mid[0], mid[1])
        city = t['name'] if t else ''
    # body každých ~300 m (pre spätné vyhľadanie adresy)
    pts = [c[0]]; acc = 0
    for a, b in zip(c, c[1:]):
        acc += dist(a, b)
        if acc >= 300: pts.append(b); acc = 0
    if len(c) > 1: pts.append(c[-1])
    streets[(name, city)].extend(pts)
S_OUT = []
for (name, city), pts in streets.items():
    # zredukuj husté body
    keep = []
    for p in pts:
        if all(dist(p, q) > 150 for q in keep[-6:]): keep.append(p)
    flat = []; px = py = 0
    for x, y in keep[:60]:
        X, Y = E5(x), E5(y); flat += [X - px, Y - py]; px, py = X, Y  # rozdielovo (menší súbor)
    S_OUT.append([name, ctx(city) if city else -1, flat])
print('ulíc', len(S_OUT))

# ---------- miesta (obce, časti) ----------
P_OUT = []
KIND = {'city': 'city', 'town': 'town', 'village': 'village', 'hamlet': 'hamlet', 'suburb': 'suburb', 'quarter': 'quarter', 'neighbourhood': 'quarter', 'borough': 'suburb'}
def popn(v):
    try: return int(re.sub(r'[^\d]', '', str(v or '')) or 0)
    except ValueError: return 0
for p in places:
    parent = ''
    if p['type'] in ('suburb', 'quarter', 'neighbourhood', 'hamlet', 'borough'):
        t = nearest_town(p['lon'], p['lat'], ('city', 'town', 'village'), 8000)
        parent = t['name'] if t and t['name'] != p['name'] else ''
    P_OUT.append([E5(p['lon']), E5(p['lat']), p['name'], KIND[p['type']], parent, 'SK', popn(p.get('pop'))])
CCN = {'at': 'AT', 'cz': 'CZ', 'pl': 'PL', 'ua': 'UA', 'hu': 'HU'}
for cc, d in NB.items():
    for p in d['places']:
        P_OUT.append([E5(p['lon']), E5(p['lat']), p['name'], KIND[p['type']], '', CCN[cc], popn(p.get('pop'))])
# Natural Earth – mestá Európy mimo pokrytej oblasti
ne = json.load(open(f'{RAW}/ne/ne_10m_populated_places.geojson'))['features']
have = set((x[2], round(x[0] / 1e5, 1), round(x[1] / 1e5, 1)) for x in P_OUT)
for f in ne:
    p = f['properties']
    lon, lat = p['LONGITUDE'], p['LATITUDE']
    if not (-25 <= lon <= 45 and 34 <= lat <= 71.5): continue
    if p['ISO_A2'] in ('SK',): continue
    names = {p.get('NAME'), p.get('NAME_EN'), p.get('NAMEASCII')} - {None, ''}
    if any((n, round(lon, 1), round(lat, 1)) in have for n in names): continue
    nm = p.get('NAME') or p.get('NAME_EN')
    alt = p.get('NAME_EN') if p.get('NAME_EN') and p.get('NAME_EN') != nm else ''
    P_OUT.append([E5(lon), E5(lat), nm, 'city' if (p.get('POP_MAX') or 0) >= 100000 else 'town', alt, p['ISO_A2'], int(p.get('POP_MAX') or 0)])
print('miest', len(P_OUT))

# ---------- dôležité miesta (POI) ----------
CATS = ['shelter', 'cdshelter', 'bunker', 'assembly', 'underground', 'hospital', 'pharmacy', 'emergency', 'townhall', 'water', 'fuel', 'aed', 'siren']
CI = {c: i for i, c in enumerate(CATS)}
KEEPT = ['amenity', 'emergency', 'operator', 'opening_hours', 'phone', 'contact:phone', 'capacity', 'access', 'wheelchair', 'description', 'addr:street', 'addr:place', 'addr:housenumber', 'addr:city', 'historic', 'location', 'bunker_type', 'shelter_type', 'drinking_water', 'level']
POI = []
for p in SK['pois']:
    t = p['tags']
    if p['cat'] == 'bunker' and t.get('historic') or (p['cat'] == 'bunker' and t.get('bunker_type') in ('pillbox', 'artillery_cavern', 'mg_nest', 'observation', 'gun_emplacement', 'canon_loophole', 'mortar_position')):
        cat = 'bunker'
    else:
        cat = p['cat']
    POI.append([E5(p['lon']), E5(p['lat']), CI[cat], t.get('name', ''), {k: t[k] for k in KEEPT if k in t}, p['osm'][0][0] + str(p['osm'][1])])

# ---------- úkryty CO zo zoznamov miest ----------
sh = json.load(open(WORK + '/shelters/shelters_raw.json'))
ABBR = {'gen': 'generala', 'nam': 'namestie', 'm': '', 'l': '', 'n': '', 'a': ''}
def street_key(s):
    w = [x for x in norm(s).split() if x]
    w = [ABBR.get(x, x) for x in w]
    w = [x for x in w if x and not x.isdigit() or (x.isdigit() and len(w) > 1 and w.index(x) == 0)]
    return w[-1] if w else ''
def parse_addr(a):
    m = re.match(r'^(.*?)[\s,]+(\d+[A-Za-z]?)(?:\s*/\s*(\d+[A-Za-z]?))?(?:\s*[-–].*)?$', a.strip())
    if not m: return a.strip(), None, None
    st = m.group(1).strip(); n1, n2 = m.group(2), m.group(3)
    return st, n1, n2
city_pts = {}
for p in towns:
    city_pts.setdefault(norm(p['name']), (p['lon'], p['lat']))
geo_ok = Counter()
for s in sh:
    if s['lat'] is not None:
        s['geo'] = 'source'; geo_ok['source'] += 1; continue
    st, n1, n2 = parse_addr(s['address'])
    key = street_key(st)
    c = norm(s['city'])
    cands = [a for (cn, sn), lst in by_city_street.items() if cn == c and key and (sn.split()[-1:] == [key] or key in sn.split()) for a in lst]
    hit = None
    def eq(x, y): return x and y and x.lower() == y.lower()
    if n2:
        hit = next((a for a in cands if eq(a[2], n1) and eq(a[3], n2)), None) or next((a for a in cands if eq(a[3], n2)), None) or next((a for a in cands if eq(a[2], n1)), None)
    elif n1:
        hit = next((a for a in cands if eq(a[3], n1) or eq(a[4], n1)), None) or next((a for a in cands if eq(a[2], n1)), None)
    if hit:
        s['lon'], s['lat'] = hit[6], hit[7]; s['geo'] = 'address'; geo_ok['address'] += 1; continue
    if cands:
        xs = sorted(a[6] for a in cands); ys = sorted(a[7] for a in cands)
        s['lon'], s['lat'] = xs[len(xs) // 2], ys[len(ys) // 2]; s['geo'] = 'street'; geo_ok['street'] += 1
        continue
    s['geo'] = None; geo_ok['none'] += 1
    print('nenájdené:', s['city'], s['address'])
print('geokódovanie úkrytov', geo_ok)
TYPE_NAME = {'OU': 'odolný úkryt (OÚ)', 'PU': 'plynotesný úkryt (PÚ)', 'OU/PU': 'odolný alebo plynotesný úkryt (OÚ/PÚ)', 'JUBS': 'jednoduchý úkryt budovaný svojpomocne (JÚBS)'}
for s in sh:
    if s.get('lat') is None: continue
    tags = {'shelter_class': s['type'], 'addr': s['address'], 'city': s['city'] + (f" – {s['part']}" if s.get('part') else ''), 'source': s['source'], 'url': s['url']}
    if s.get('capacity'): tags['capacity'] = str(s['capacity'])
    if s.get('owner'): tags['operator'] = s['owner']
    if s.get('note'): tags['description'] = s['note']
    if s.get('geo') == 'street': tags['approx'] = '1'
    POI.append([E5(s['lon']), E5(s['lat']), CI['cdshelter'], s.get('name') or s['address'], tags, ''])
json.dump(sh, open(WORK + '/shelters/shelters_geo.json', 'w'), ensure_ascii=False, indent=0)
print('POI', len(POI), Counter(CATS[p[2]] for p in POI))

os.makedirs(OUT, exist_ok=True)
open(f'{OUT}/gaz.js', 'w').write('KPMAP_GAZ(' + json.dumps({'ctx': CTX, 'p': P_OUT, 's': S_OUT}, separators=(',', ':'), ensure_ascii=False) + ');\n')
open(f'{OUT}/poi.js', 'w').write('KPMAP_POI(' + json.dumps({'cats': CATS, 'p': POI, 'date': '2026-10-27'}, separators=(',', ':'), ensure_ascii=False) + ');\n')
for f in ('gaz.js', 'poi.js'): print(f, round(os.path.getsize(f'{OUT}/{f}') / 1e6, 2), 'MB')

# ---------- vodné toky (pre kontrolu „rieka pri dome“) ----------
from shapely.geometry import LineString as _LS
RV = []
def _len(c): return sum(math.hypot((b[0] - a[0]) * 74000, (b[1] - a[1]) * 111000) for a, b in zip(c, c[1:]))
for w in SK['waters']:
    if w['cls'] not in ('river', 'stream', 'canal') or w.get('tunnel') in ('culvert',): continue
    if not w.get('name') and _len(w['coords']) < 1000: continue  # malé bezmenné jarky vynechané
    g = _LS(w['coords']).simplify(0.0003)
    flat = []; px = py = 0
    for x, y in g.coords:
        X, Y = E5(x), E5(y); flat += [X - px, Y - py]; px, py = X, Y
    RV.append([w.get('name') or '', w['cls'][0], flat])
open(f'{OUT}/rivers.js', 'w').write('KPMAP_RIVERS(' + json.dumps({'r': RV}, separators=(',', ':'), ensure_ascii=False) + ');\n')
print('rivers.js', round(os.path.getsize(f'{OUT}/rivers.js') / 1e6, 2), 'MB', len(RV))
