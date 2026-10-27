# Cestná sieť pre offline trasy (route.js): Slovensko podrobne, susedné krajiny hlavné cesty.
# Formát: uzly a hrany kódované varint + base64 (načíta sa cez <script> aj z disku).
import os as _os
WORK = _os.environ.get('KP_MAPWORK') or _os.path.join(_os.path.dirname(_os.path.abspath(__file__)), '..', '.mapwork')  # pracovný priečinok (raw/, out/, shelters/, tiles/)
import base64, json, math, os, pickle, glob, re, sys
from collections import defaultdict, Counter

OUT = sys.argv[1] if len(sys.argv) > 1 else WORK + '/tiles'
SK = pickle.load(open(WORK + '/out/sk.pkl', 'rb'))
del SK['addr'], SK['areas']
NB = {os.path.basename(f)[3:5]: pickle.load(open(f, 'rb')) for f in glob.glob(WORK + '/out/nb_*.pkl')}

CLS = ['motorway', 'trunk', 'primary', 'secondary', 'tertiary', 'unclassified', 'residential', 'living_street', 'pedestrian', 'cycleway', 'link', 'track']
CI = {c: i for i, c in enumerate(CLS)}
BASE = {'motorway_link': 'link', 'trunk_link': 'link', 'primary_link': 'link', 'secondary_link': 'link', 'tertiary_link': 'link', 'road': 'unclassified'}
SPEED = {'motorway': 110, 'trunk': 90, 'primary': 75, 'secondary': 65, 'tertiary': 55, 'unclassified': 45, 'residential': 30,
         'living_street': 10, 'pedestrian': 5, 'cycleway': 5, 'link': 50, 'track': 15, 'service': 15}
NO = ('no', 'private')

def keep(r):
    c = r['cls']
    c = BASE.get(c, c)
    if c not in CI: return None
    t = r['tags']
    if c == 'track' and t.get('tracktype') not in ('grade1', 'grade2'): return None
    if c == 'service' and (t.get('service') in ('parking_aisle', 'driveway', 'drive-through', 'emergency_access') or t.get('access') in NO): return None
    return c

def flags(c, t, orig):
    car = c not in ('pedestrian', 'cycleway', 'track') and t.get('access') not in NO and t.get('motor_vehicle') not in NO and t.get('motorcar') not in NO and t.get('vehicle') not in NO
    if c == 'track' and t.get('motor_vehicle') in ('yes', 'designated'): car = True
    fast = orig in ('motorway', 'motorway_link', 'trunk', 'trunk_link')
    foot = not fast and t.get('foot') not in NO and t.get('access') not in NO or t.get('foot') in ('yes', 'designated')
    bike = not fast and c != 'pedestrian' and t.get('bicycle') not in NO and t.get('access') not in NO or t.get('bicycle') in ('yes', 'designated')
    ow = t.get('oneway')
    fwd = bwd = False
    if ow in ('yes', '1', 'true') or t.get('junction') in ('roundabout', 'circular') or c == 'motorway': fwd = True
    elif ow == '-1': bwd = True
    f = 0
    if fwd: f |= 1
    if bwd: f |= 2
    if car: f |= 4
    if foot: f |= 8
    if bike: f |= 16
    if t.get('bridge') not in (None, 'no'): f |= 32
    if t.get('tunnel') not in (None, 'no', 'building_passage'): f |= 64
    if t.get('junction') in ('roundabout', 'circular'): f |= 128
    return f

def speed(c, t):
    s = SPEED[c]
    m = re.match(r'^\s*(\d+)', t.get('maxspeed', '') or '')
    if m:
        v = int(m.group(1))
        if 5 <= v <= 140: s = min(s * 1.25, v * 0.9) if c != 'motorway' else min(120, v * 0.9)
    return max(5, int(round(s)))

ways = []
seen_ids = set()
for r in SK['roads']:
    seen_ids.add(r['id'])
    c = keep(r)
    if c: ways.append((c, r['tags'], r['coords'], r['nodes'], r['cls']))
for cc, d in NB.items():
    for r in d['roads']:
        if r['id'] in seen_ids: continue  # tá istá cesta v dvoch extraktoch (pri hranici)
        seen_ids.add(r['id'])
        c = keep(r)
        # v susedných krajinách stačia diaľnice, rýchlostné cesty a cesty I. triedy
        if c not in ('motorway', 'trunk', 'primary', 'link'): continue
        if c == 'link' and r['cls'] not in ('motorway_link', 'trunk_link', 'primary_link'): continue
        if c: ways.append((c, r['tags'], r['coords'], r['nodes'], r['cls']))
print('ciest', len(ways), Counter(w[0] for w in ways).most_common())

# ---- uzly: križovatky a konce ----
use = Counter()
for c, t, co, nd, o in ways:
    use.update(set(nd))
    use[nd[0]] += 1; use[nd[-1]] += 1
coord = {}
for c, t, co, nd, o in ways:
    for i, n in enumerate(nd):
        coord[n] = co[i]
junction = {n for n, k in use.items() if k > 1}
# poradie uzlov podľa Mortonovho kódu (blízke uzly → blízke čísla → menšie rozdiely)
def morton(lon, lat):
    x = int((lon + 180) / 360 * 65535); y = int((lat + 90) / 180 * 65535)
    v = 0
    for i in range(16): v |= ((x >> i) & 1) << (2 * i) | ((y >> i) & 1) << (2 * i + 1)
    return v
nodes = sorted(junction, key=lambda n: morton(*coord[n]))
nid = {n: i for i, n in enumerate(nodes)}
print('uzlov', len(nodes))

# ---- rieky pod mostmi ----
from shapely.geometry import LineString
from shapely.strtree import STRtree
wl = [w for w in SK['waters'] if w.get('name') and w['cls'] in ('river', 'canal')]
for d in NB.values(): wl += [w for w in d['waters'] if w.get('name')]
wgeom = [LineString(w['coords']) for w in wl]
wtree = STRtree(wgeom)

STR = ['']; SI = {'': 0}
def sid(s):
    s = (s or '').strip()
    if s not in SI: SI[s] = len(STR); STR.append(s)
    return SI[s]

def simplify(pts, tol):
    # Douglas–Peucker v metroch (lokálna projekcia)
    if len(pts) < 3: return pts
    lat0 = math.radians(pts[0][1]); kx = 111320 * math.cos(lat0); ky = 110540
    P = [(x * kx, y * ky) for x, y in pts]
    keep_ = [False] * len(P); keep_[0] = keep_[-1] = True
    st = [(0, len(P) - 1)]
    while st:
        a, b = st.pop()
        ax, ay = P[a]; bx, by = P[b]
        dx, dy = bx - ax, by - ay; L2 = dx * dx + dy * dy
        md, mi = 0, -1
        for i in range(a + 1, b):
            px, py = P[i]
            if L2 == 0: d = math.hypot(px - ax, py - ay)
            else:
                t = max(0, min(1, ((px - ax) * dx + (py - ay) * dy) / L2))
                d = math.hypot(px - ax - t * dx, py - ay - t * dy)
            if d > md: md, mi = d, i
        if md > tol: keep_[mi] = True; st += [(a, mi), (mi, b)]
    return [p for p, k in zip(pts, keep_) if k]

def mlen(pts):
    s = 0
    for (x1, y1), (x2, y2) in zip(pts, pts[1:]):
        s += math.hypot((x2 - x1) * 111320 * math.cos(math.radians(y1)), (y2 - y1) * 110540)
    return s

edges = []
for c, t, co, nd, o in ways:
    f = flags(c, t, o)
    if not (f & (4 | 8 | 16)): continue
    sp = speed(c, t)
    name = sid(t.get('name')); ref = sid((t.get('ref') or '').split(';')[0])
    start = 0
    for i in range(1, len(nd)):
        if nd[i] in junction or i == len(nd) - 1:
            seg = co[start:i + 1]
            u, v = nid[nd[start]], nid[nd[i]]
            if u != v or len(seg) > 2:
                L = mlen(seg)
                river = 0
                if f & 32:
                    g = LineString(seg)
                    for j in wtree.query(g):
                        if wgeom[j].intersects(g): river = sid(wl[j]['name']); break
                mid = simplify(seg, 12)[1:-1]
                edges.append((u, v, max(1, int(round(L))), CI[c], f, sp, name, ref, river, mid))
            start = i
print('hrán', len(edges), 'reťazcov', len(STR))

# ---- zlúčenie úsekov cez uzly bez križovatky (stupeň 2, rovnaké vlastnosti) ----
def attrs(e): return (e[3], e[4] & ~(32 | 64), e[5], e[6], e[7])  # trieda, príznaky (bez mosta/tunela), rýchlosť, názov, číslo
inc = defaultdict(list)
for i, e in enumerate(edges):
    inc[e[0]].append(i); inc[e[1]].append(i)
alive = [True] * len(edges)
E = [list(e) for e in edges]
merged = 0
for n, lst in list(inc.items()):
    lst = [i for i in lst if alive[i]]
    if len(lst) != 2: continue
    a, b = lst
    ea, eb = E[a], E[b]
    if a == b or attrs(ea) != attrs(eb) or (ea[4] & (32 | 64)) != (eb[4] & (32 | 64)): continue
    # orientuj: a končí v n, b začína v n (pri jednosmerkách musí smer sedieť)
    def flip(e):
        f = e[4]; nf = f & ~3
        if f & 1: nf |= 2
        if f & 2: nf |= 1
        mid = list(reversed(e[9]))
        return [e[1], e[0], e[2], e[3], nf, e[5], e[6], e[7], e[8], mid]
    if ea[1] != n: ea = flip(ea)
    if eb[0] != n: eb = flip(eb)
    if ea[1] != n or eb[0] != n or ea[0] == eb[1] or (ea[4] & 3) != (eb[4] & 3): continue
    newe = [ea[0], eb[1], ea[2] + eb[2], ea[3], ea[4], ea[5], ea[6], ea[7], ea[8] or eb[8], ea[9] + [coord[nodes[n]]] + eb[9]]
    E[a] = newe; alive[b] = False
    inc[eb[1]] = [a if x == b else x for x in inc[eb[1]]]
    merged += 1
edges = [tuple(E[i]) for i in range(len(E)) if alive[i]]
used = sorted({e[0] for e in edges} | {e[1] for e in edges})
remap = {old: i for i, old in enumerate(used)}
nodes = [nodes[i] for i in used]
edges = [(remap[e[0]], remap[e[1]]) + tuple(e[2:]) for e in edges]
print('zlúčené', merged, '→ uzlov', len(nodes), 'hrán', len(edges))

# ---- kódovanie ----
def varint(out, v):
    while True:
        b = v & 0x7F; v >>= 7
        if v: out.append(b | 0x80)
        else: out.append(b); return
def zz(v): return (v << 1) ^ (v >> 63)
E5 = lambda v: int(round(v * 1e5))
nb_ = bytearray()
px = py = 0
for n in nodes:
    x, y = E5(coord[n][0]), E5(coord[n][1])
    varint(nb_, zz(x - px)); varint(nb_, zz(y - py)); px, py = x, y
edges.sort(key=lambda e: e[0])
eb = bytearray(); gb = bytearray()
pu = 0
for u, v, L, c, f, sp, name, ref, river, mid in edges:
    varint(eb, u - pu); pu = u
    varint(eb, zz(v - u)); varint(eb, L); eb.append(c); eb.append(f); eb.append(sp)
    varint(eb, name); varint(eb, ref); varint(eb, river)
    varint(gb, len(mid))
    lx, ly = E5(coord[nodes[u]][0]), E5(coord[nodes[u]][1])
    for x, y in mid:
        X, Y = E5(x), E5(y)
        varint(gb, zz(X - lx)); varint(gb, zz(Y - ly)); lx, ly = X, Y
data = {'v': 1, 'date': '2026-10-27', 'cls': CLS, 'n': len(nodes), 'e': len(edges), 'str': STR,
        'nodes': base64.b64encode(bytes(nb_)).decode(), 'edges': base64.b64encode(bytes(eb)).decode(), 'geom': base64.b64encode(bytes(gb)).decode()}
os.makedirs(OUT, exist_ok=True)
open(f'{OUT}/route.js', 'w').write('KPMAP_ROUTE(' + json.dumps(data, separators=(',', ':'), ensure_ascii=False) + ');\n')
print('route.js', round(os.path.getsize(f'{OUT}/route.js') / 1e6, 2), 'MB', 'uzly', len(nb_), 'hrany', len(eb), 'geometria', len(gb))
