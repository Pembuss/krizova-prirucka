# index.js (zoznam dlaždíc) a countries.js (hranice štátov na určenie krajiny bez internetu)
import os as _os
WORK = _os.environ.get('KP_MAPWORK') or _os.path.join(_os.path.dirname(_os.path.abspath(__file__)), '..', '.mapwork')  # pracovný priečinok (raw/, out/, shelters/, tiles/)
import json, sys
from shapely.geometry import shape, box
T = sys.argv[1] if len(sys.argv) > 1 else WORK + '/tiles'
idx = json.load(open(f'{T}/_index.json'))
idx['date'] = '2026-10-27'
idx['sources'] = ['© OpenStreetMap contributors (ODbL)', 'Natural Earth (public domain)']
open(f'{T}/index.js', 'w').write('KPMAP_INDEX(' + json.dumps(idx, separators=(',', ':')) + ');\n')
C = []
for f in json.load(open(WORK + '/raw/ne/ne_10m_admin_0_countries.geojson'))['features']:
    p = f['properties']
    cc = p['ISO_A2'] if p['ISO_A2'] != '-99' else p['ISO_A2_EH']
    g = shape(f['geometry'])
    if not g.intersects(box(-25, 34, 45, 71.5)): continue
    g = g.intersection(box(-25, 30, 50, 72)).simplify(0.01)
    polys = [g] if g.geom_type == 'Polygon' else list(getattr(g, 'geoms', []))
    out = []
    for pg in polys:
        if pg.geom_type != 'Polygon' or pg.area < 0.0004: continue
        rings = [pg.exterior] + list(pg.interiors)
        out.append([[v for x, y in r.coords for v in (round(x * 100), round(y * 100))] for r in rings])
    if not out: continue
    b = g.bounds
    C.append([cc, [round(b[0] * 100) - 1, round(b[1] * 100) - 1, round(b[2] * 100) + 1, round(b[3] * 100) + 1], out])
open(f'{T}/countries.js', 'w').write('KPMAP_COUNTRIES(' + json.dumps({'c': C}, separators=(',', ':')) + ');\n')
import os
print('index.js', os.path.getsize(f'{T}/index.js'), 'countries.js', os.path.getsize(f'{T}/countries.js'), len(C))
