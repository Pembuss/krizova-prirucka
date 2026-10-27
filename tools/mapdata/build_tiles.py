# Zostaví offline vektorové dlaždice pre aplikáciu Krízová príručka.
# Vstupy: Natural Earth (Európa), OSM extrakty (Slovensko detailne, susedia hlavné cesty).
# Výstup: priečinok s balíkmi *.js (fungujú aj pri otvorení z disku – načítajú sa cez <script>).
#
# Úrovne dát (dz) a priblíženia mapy, pre ktoré slúžia:
#   dz 3  → z 0–5   Európa (Natural Earth)
#   dz 6  → z 6–8   Európa (NE) + hlavné cesty a rieky strednej Európy (OSM)
#   dz 9  → z 9–11  stredná Európa (OSM), Slovensko podrobnejšie
#   dz 12 → z 12–18 Slovensko v plnom detaile (OSM)
import os as _os
WORK = _os.environ.get('KP_MAPWORK') or _os.path.join(_os.path.dirname(_os.path.abspath(__file__)), '..', '.mapwork')  # pracovný priečinok (raw/, out/, shelters/, tiles/)
import json, math, os, pickle, sys, time, glob
from collections import defaultdict
from multiprocessing import Pool
import shapely
from shapely.geometry import shape, LineString, Polygon, MultiPolygon, box, mapping
from shapely.ops import unary_union

RAW = WORK + '/raw'
OUT = sys.argv[1] if len(sys.argv) > 1 else WORK + '/tiles'
EXTENT = 4096
EU_BBOX = (-25.0, 34.0, 45.0, 71.5)

# ---------- projekcia (Web Mercator, jednotkový štvorec) ----------
def merc(lon, lat):
    lat = max(min(lat, 85.0), -85.0)
    x = (lon + 180.0) / 360.0
    s = math.sin(math.radians(lat))
    y = 0.5 - math.log((1 + s) / (1 - s)) / (4 * math.pi)
    return x, y
def merc_coords(coords):
    return [merc(x, y) for x, y in coords]
def geom_merc(g):
    return shapely.transform(g, lambda a: _merc_arr(a))
def _merc_arr(a):
    import numpy as np
    lon = a[:, 0]; lat = np.clip(a[:, 1], -85, 85)
    x = (lon + 180.0) / 360.0
    s = np.sin(np.radians(lat))
    y = 0.5 - np.log((1 + s) / (1 - s)) / (4 * np.pi)
    return np.column_stack([x, y])
def px(z):  # veľkosť 1 pixelu pri priblížení z v jednotkách projekcie
    return 1.0 / (256 * 2 ** z)

# ---------- triedy prvkov (poradie = poradie kreslenia) ----------
CLASSES = [
    # plochy
    'ocean', 'urban', 'residential', 'commercial', 'industrial', 'military', 'cemetery', 'park', 'green', 'forest', 'wetland', 'water',
    # čiary – vody a hranice
    'stream', 'canal', 'river', 'river_ne', 'admin4', 'admin2',
    # železnice
    'tram', 'rail',
    # cesty (od najnižšej)
    'path', 'track', 'service', 'pedestrian', 'living_street', 'residential_rd', 'unclassified',
    'tertiary', 'secondary', 'primary', 'trunk', 'motorway', 'link',
    'tertiary_t', 'secondary_t', 'primary_t', 'trunk_t', 'motorway_t',
    'road_ne_minor', 'road_ne_major', 'ferry',
]
CID = {c: i for i, c in enumerate(CLASSES)}
POLY = set(CLASSES[:12])

ROAD_CLS = {
    'motorway': 'motorway', 'motorway_link': 'link', 'trunk': 'trunk', 'trunk_link': 'link',
    'primary': 'primary', 'primary_link': 'link', 'secondary': 'secondary', 'secondary_link': 'link',
    'tertiary': 'tertiary', 'tertiary_link': 'link', 'unclassified': 'unclassified', 'residential': 'residential_rd',
    'living_street': 'living_street', 'pedestrian': 'pedestrian', 'service': 'service', 'track': 'track', 'road': 'unclassified',
}
MAIN = {'motorway', 'trunk', 'primary', 'secondary', 'tertiary'}

def road_class(r):
    c = ROAD_CLS.get(r['cls'])
    if not c: return None
    t = r['tags']
    if c in MAIN and t.get('tunnel') in ('yes', 'building_passage', 'culvert'):
        return c + '_t'
    if c == 'service' and t.get('service') in ('parking_aisle', 'driveway', 'drive-through'):
        return None
    # poľné a lesné cesty: iba spevnené (grade1, grade2) – ostatné by balík zväčšili o desiatky MB
    if c == 'track' and t.get('tracktype') not in ('grade1', 'grade2'):
        return None
    return c

# ---------- načítanie ----------
def load_ne(name):
    d = json.load(open(f'{RAW}/ne/{name}.geojson'))
    return d['features']

def eu_clip(g):
    return g.intersection(box(*EU_BBOX))

print('načítavam…', flush=True)
T0 = time.time()
SK = pickle.load(open(WORK + '/out/sk.pkl', 'rb'))
NB = {}
for f in sorted(glob.glob(WORK + '/out/nb_*.pkl')):
    NB[os.path.basename(f)[3:5]] = pickle.load(open(f, 'rb'))
print('načítané', round(time.time() - T0), 's', list(NB), flush=True)

countries = load_ne('ne_10m_admin_0_countries')
iso = lambda p: p['ISO_A2'] if p['ISO_A2'] != '-99' else p['ISO_A2_EH']
cgeo = {}
for f in countries:
    g = shape(f['geometry'])
    if not g.intersects(box(*EU_BBOX)): continue
    cgeo[iso(f['properties'])] = g

# oblasť pokrytá OSM (stredná Európa): susedia + Slovensko
COV_BOX = {'PL': (13.5, 48.9, 24.5, 52.6), 'UA': (21.9, 47.6, 26.2, 51.0)}
cov_parts = []
for cc in ['SK', 'CZ', 'AT', 'PL', 'UA'] + (['HU'] if 'hu' in NB else []):
    g = cgeo.get(cc)
    if g is None: continue
    if cc in COV_BOX: g = g.intersection(box(*COV_BOX[cc]))
    cov_parts.append(g)
COVER = unary_union(cov_parts).buffer(0.01)
COVER_M = geom_merc(COVER)
SK_POLY = cgeo['SK']
SK_M = geom_merc(SK_POLY.buffer(0.03))
shapely.prepare(SK_M); shapely.prepare(COVER_M)
print('pokrytie OSM:', [k for k in ['SK', 'CZ', 'AT', 'PL', 'UA', 'HU'] if k == 'SK' or k.lower() in NB], flush=True)

# ---------- zber prvkov podľa úrovne ----------
# feats[dz] = list of (cls, geom_merc)
feats = {3: [], 6: [], 9: [], 12: []}
CUR = None  # spracúva sa vždy jedna úroveň (šetrí pamäť)
def add(dzs, cls, g):
    if CUR not in dzs: return
    if callable(g): g = g()
    if g is None or g.is_empty: return
    feats[CUR].append((cls, g))

def ne_feats():
    # oceán (vodná plocha mimo pevniny) – iba pre Európu
    ocean = load_ne('ne_10m_ocean')
    for f in ocean:
        g = eu_clip(shape(f['geometry']))
        add([3, 6, 9], 'ocean', geom_merc(g))
    for f in load_ne('ne_10m_lakes') + load_ne('ne_10m_lakes_europe'):
        g = shape(f['geometry'])
        if not g.intersects(box(*EU_BBOX)): continue
        sr = f['properties'].get('scalerank', 10) or 10
        g = geom_merc(eu_clip(g))
        if sr <= 3: add([3], 'water', g)
        add([6, 9], 'water', g)
    for f in load_ne('ne_10m_urban_areas'):
        g = shape(f['geometry'])
        if not g.intersects(box(*EU_BBOX)): continue
        g = geom_merc(eu_clip(g))
        if g.area > (px(5) * 6) ** 2: add([3], 'urban', g)
        add([6, 9], 'urban', g)
    for f in load_ne('ne_10m_rivers_lake_centerlines') + load_ne('ne_10m_rivers_europe'):
        g = shape(f['geometry'])
        if not g.intersects(box(*EU_BBOX)): continue
        sr = f['properties'].get('scalerank', 10) or 10
        g = eu_clip(g)
        if sr <= 5: add([3], 'river_ne', geom_merc(g))
        g2 = g.difference(COVER)
        add([6, 9], 'river_ne', geom_merc(g2))
    for f in load_ne('ne_10m_admin_0_boundary_lines_land'):
        g = shape(f['geometry'])
        if not g.intersects(box(*EU_BBOX)): continue
        g = eu_clip(g)
        add([3, 6, 9], 'admin2', geom_merc(g))
    for f in load_ne('ne_10m_roads'):
        p = f['properties']
        if p.get('continent') not in ('Europe', 'Asia', 'Africa'): continue
        g = shape(f['geometry'])
        if not g.intersects(box(*EU_BBOX)): continue
        tp = p.get('type')
        if tp in ('Ferry Route', 'Ferry, seasonal'):
            add([6, 9], 'ferry', geom_merc(eu_clip(g))); continue
        major = tp in ('Major Highway', 'Beltway') or (p.get('expressway') == 1)
        g = eu_clip(g).difference(COVER)
        if g.is_empty: continue
        gm = geom_merc(g)
        if major and (p.get('scalerank') or 10) <= 5: add([3], 'road_ne_major', gm)
        if tp in ('Major Highway', 'Secondary Highway', 'Beltway', 'Bypass', 'Road') or major:
            add([6, 9], 'road_ne_major' if major else 'road_ne_minor', gm)

def osm_lines(items, cls_fn, dzs_fn):
    for it in items:
        c = cls_fn(it)
        if not c: continue
        dzs = dzs_fn(c, it)
        if not dzs or CUR not in dzs: continue
        add(dzs, c, LineString(merc_coords(it['coords'])))

def nb_feats():
    for cc, d in NB.items():
        def rc(r):
            c = road_class(r)
            return c
        def dzs(c, r):
            base = c.replace('_t', '')
            if base in ('motorway', 'trunk', 'primary'): return [6, 9, 12]
            if base in ('secondary', 'link'): return [9, 12] if base == 'secondary' else [9, 12]
            return []
        osm_lines(d['roads'], rc, dzs)
        osm_lines(d['rails'], lambda r: 'rail' if r.get('usage') in ('main', 'branch', None) else None, lambda c, r: [9, 12] if r.get('usage') in ('main', None) else [12])
        osm_lines(d['waters'], lambda r: 'river', lambda c, r: [6, 9, 12])

def sk_feats():
    d = SK
    def dzs_road(c, r):
        base = c.replace('_t', '')
        if base in ('motorway', 'trunk', 'primary'): return [6, 9, 12]
        if base == 'secondary': return [6, 9, 12]
        if base in ('tertiary', 'link'): return [9, 12]
        if base == 'unclassified': return [9, 12]
        return [12]
    osm_lines(d['roads'], road_class, dzs_road)
    def rail_cls(r):
        if r['cls'] == 'tram': return 'tram'
        if r['cls'] in ('rail', 'narrow_gauge', 'light_rail'):
            if r.get('service') in ('yard', 'siding', 'spur', 'crossover'): return None
            return 'rail'
        return None
    osm_lines(d['rails'], rail_cls, lambda c, r: [12] if c == 'tram' else [9, 12])
    def wlen(w):
        c = w['coords']
        return sum(math.hypot((b[0] - a[0]) * 74000, (b[1] - a[1]) * 111000) for a, b in zip(c, c[1:]))
    def wcls(w):
        if w.get('tunnel') in ('culvert', 'yes'): return None
        if w['cls'] == 'stream' and not w.get('name') and wlen(w) < 400: return None
        return w['cls']
    osm_lines(d['waters'], wcls,
              lambda c, w: [6, 9, 12] if c == 'river' else ([9, 12] if c == 'canal' else [12]))
    for b in d['bounds']:
        if b['level'] == 2: add([9, 12], 'admin2', lambda: LineString(merc_coords(b['coords'])))
        elif b['level'] == 4 and CUR in (6, 9, 12):
            # iba kraje Slovenska (hranice susedných regiónov nekreslíme)
            g = LineString(b['coords'])
            if g.intersects(SK_POLY): add([6, 9, 12], 'admin4', LineString(merc_coords(b['coords'])))
    for a in d['areas']:
        k = a['kind']
        if k in ('rock',): continue
        if CUR not in (6, 9, 12): continue
        if CUR == 6 and k not in ('forest', 'water'): continue
        if CUR == 9 and k in ('green', 'park', 'cemetery'): continue
        polys = []
        for poly in a['polys']:
            if len(poly[0]) < 4: continue
            try:
                p = Polygon(merc_coords(poly[0]), [merc_coords(h) for h in poly[1:] if len(h) >= 4])
            except Exception:
                continue
            polys.append(p)
        if not polys: continue
        g = polys[0] if len(polys) == 1 else MultiPolygon(polys)
        ar = g.area / (px(12) * 256) ** 2 * (9780 * 0.66) ** 2  # približne m² (tile z12 ≈ 6,5 km)
        if k == 'green':
            continue  # lúky a trávniky vynechané (veľkosť balíka)
        if k == 'forest':
            if ar >= 1_500_000: add([6], 'forest', g)
            if ar >= 40_000: add([9], 'forest', g)
            if ar >= 5_000: add([12], 'forest', g)
        elif k == 'water':
            if ar >= 300_000: add([6], 'water', g)
            if ar >= 8_000: add([9], 'water', g)
            add([12], 'water', g)
        elif k in ('residential', 'industrial', 'commercial'):
            if ar >= 20_000: add([9], k, g)
            add([12], k, g)
        elif k in ('wetland', 'military', 'cemetery', 'park'):
            if ar >= 50_000 and k in ('wetland', 'military'): add([9], k, g)
            if ar >= 1_000: add([12], k, g)

def collect(dz):
    global CUR
    CUR = dz
    T1 = time.time()
    ne_feats(); nb_feats(); sk_feats()
    print(f'dz{dz}: zozbierané za {round(time.time() - T1)} s – {len(feats[dz])} prvkov', flush=True)

# ---------- zjednodušenie podľa úrovne ----------
# tolerancia ~ 0,5 px pri najväčšom priblížení, ktoré daná úroveň obsluhuje
TOL = {3: px(5) * 0.6, 6: px(8) * 0.6, 9: px(11) * 0.6, 12: px(15) * 0.6}
TOL_CLS = {'forest': 5.0, 'green': 5.0, 'urban': 1.5, 'wetland': 4.0, 'ocean': 1.0, 'stream': 2.5, 'track': 2.0, 'residential': 2.0, 'industrial': 2.0, 'commercial': 2.0, 'park': 2.0, 'cemetery': 2.0, 'military': 3.0}
MIN_AREA = {3: (px(5) * 3) ** 2, 6: (px(8) * 3) ** 2, 9: (px(11) * 3) ** 2, 12: (px(15) * 3) ** 2}

def prep(dz):
    out = []
    for cls, g in feats[dz]:
        tol = TOL[dz] * TOL_CLS.get(cls, 1.0)
        g = shapely.simplify(g, tol, preserve_topology=(cls in POLY))
        if g.is_empty: continue
        if cls in POLY and g.area < MIN_AREA[dz]: continue
        out.append((cls, g))
    return out

# ---------- dlaždice ----------
def tile_bounds(z, x, y):
    n = 2 ** z
    return x / n, y / n, (x + 1) / n, (y + 1) / n

def encode_coords(coords, x0, y0, s):
    out = []; px_ = py_ = 0; last = None
    for X, Y in coords:
        qx = int(round((X - x0) * s)); qy = int(round((Y - y0) * s))
        if last == (qx, qy): continue
        if last is None: out += [qx, qy]
        else: out += [qx - px_, qy - py_]
        px_, py_ = qx, qy; last = (qx, qy)
    return out

def parts(g):
    t = g.geom_type
    if t in ('LineString', 'LinearRing'): return [('l', g)]
    if t == 'Polygon': return [('p', g)]
    if t.startswith('Multi') or t == 'GeometryCollection':
        r = []
        for x in g.geoms: r += parts(x)
        return r
    return []

def build_tile(args):
    dz, x, y, items = args
    x0, y0, x1, y1 = tile_bounds(dz, x, y)
    s = EXTENT / (x1 - x0)
    buf = (x1 - x0) * 0.02
    groups = defaultdict(list)
    for cls, g in items:
        c = shapely.clip_by_rect(g, x0 - buf, y0 - buf, x1 + buf, y1 + buf)
        if c.is_empty: continue
        for kind, p in parts(c):
            if cls in POLY:
                if kind != 'p': continue
                rings = [encode_coords(p.exterior.coords, x0, y0, s)] + [encode_coords(r.coords, x0, y0, s) for r in p.interiors]
                rings = [r for r in rings if len(r) >= 6]
                if rings: groups[cls].append(rings)
            else:
                if kind != 'l': continue
                e = encode_coords(p.coords, x0, y0, s)
                if len(e) >= 4: groups[cls].append(e)
    if not groups: return None
    return (dz, x, y, [[CID[c], groups[c]] for c in sorted(groups, key=lambda c: CID[c])])

def tiles_for(dz, items):
    from shapely.strtree import STRtree
    geoms = [g for _, g in items]
    tree = STRtree(geoms)
    xmin, ymin, xmax, ymax = shapely.total_bounds(geoms)
    n = 2 ** dz
    jobs = []
    area = SK_M if dz == 12 else COVER_M if dz == 9 else None
    if area is not None:
        ax0, ay0, ax1, ay1 = area.bounds
        xmin, ymin, xmax, ymax = max(xmin, ax0), max(ymin, ay0), min(xmax, ax1), min(ymax, ay1)
    for tx in range(max(0, int(xmin * n)), min(n - 1, int(xmax * n)) + 1):
        for ty in range(max(0, int(ymin * n)), min(n - 1, int(ymax * n)) + 1):
            x0, y0, x1, y1 = tile_bounds(dz, tx, ty)
            # dz 12 iba pre Slovensko (a pás okolo hranice), dz 9 iba pre strednú Európu
            if area is not None and not area.intersects(box(x0, y0, x1, y1)): continue
            buf = (x1 - x0) * 0.02
            idx = tree.query(box(x0 - buf, y0 - buf, x1 + buf, y1 + buf))
            if len(idx) == 0: continue
            jobs.append((dz, tx, ty, [items[i] for i in sorted(idx)]))
    return jobs

PACK_OF = {3: 0, 6: 3, 9: 6, 12: 9}  # balík = predok na tejto úrovni (dz 3 a 6 → jeden balík „eu“)
def pack_key(dz, x, y):
    if dz in (3,): return 'base'
    pz = PACK_OF[dz]
    return f'{dz}-{x >> (dz - pz)}-{y >> (dz - pz)}'

if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    for f in glob.glob(f'{OUT}/*.js'): os.remove(f)
    index = {'classes': CLASSES, 'extent': EXTENT, 'tiles': {}}
    packs = defaultdict(dict)
    import gc
    for dz in (3, 6, 9, 12):
        T = time.time()
        collect(dz)
        items = prep(dz)
        feats[dz] = []
        gc.collect()
        jobs = tiles_for(dz, items)
        print(f'dz{dz}: prvkov {len(items)}, dlaždíc {len(jobs)}', flush=True)
        for n, job in enumerate(jobs):
            r = build_tile(job)
            jobs[n] = None
            if not r: continue
            d, x, y, data = r
            packs[pack_key(d, x, y)][f'{d}/{x}/{y}'] = data
            if n % 200 == 0: print(f'  {n}/{len(jobs)}', flush=True)
        del items, jobs
        gc.collect()
        print(f'dz{dz} hotové za {round(time.time() - T)} s', flush=True)
    total = 0
    for k, tiles in packs.items():
        s = json.dumps(tiles, separators=(',', ':'), ensure_ascii=False)
        js = f'KPMAP_ADD("{k}",{s});\n'
        open(f'{OUT}/{k}.js', 'w').write(js)
        total += len(js)
        for t in tiles: index['tiles'][t] = k
    json.dump(index, open(f'{OUT}/_index.json', 'w'), separators=(',', ':'))
    print('balíkov', len(packs), 'spolu', round(total / 1e6, 1), 'MB', flush=True)
