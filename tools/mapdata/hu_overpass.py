# Maďarsko z Overpass (JSON „out body geom“) → out/nb_hu.pkl v rovnakom tvare ako extract_nb.py
import os as _os
WORK = _os.environ.get('KP_MAPWORK') or _os.path.join(_os.path.dirname(_os.path.abspath(__file__)), '..', '.mapwork')  # pracovný priečinok (raw/, out/, shelters/, tiles/)
import json, glob, pickle, os
D = WORK + '/raw/hu'
KEEP = ('name', 'ref', 'oneway', 'junction', 'bridge', 'tunnel', 'layer', 'access', 'motor_vehicle', 'toll', 'int_ref', 'maxspeed')
roads, rails, waters, places = [], [], [], []
seen = set()
def ways(f):
    try: return json.load(open(f))['elements']
    except Exception: print('chýba/chybný', f); return []
for f in sorted(glob.glob(f'{D}/roads_*.json')) + [f'{D}/motorway.json']:
    for e in ways(f):
        if e['type'] != 'way' or e['id'] in seen or 'geometry' not in e: continue
        seen.add(e['id'])
        t = e.get('tags', {})
        coords = [(p['lon'], p['lat']) for p in e['geometry'] if p]
        if len(coords) < 2 or len(coords) != len(e['nodes']): continue
        roads.append(dict(id=e['id'], cls=t.get('highway'), tags={k: t[k] for k in KEEP if k in t}, coords=coords, nodes=e['nodes']))
for e in ways(f'{D}/rail.json'):
    if e['type'] == 'way' and 'geometry' in e:
        t = e.get('tags', {})
        rails.append(dict(id=e['id'], cls='rail', usage=t.get('usage'), tunnel=t.get('tunnel'), bridge=t.get('bridge'), coords=[(p['lon'], p['lat']) for p in e['geometry'] if p]))
for e in ways(f'{D}/rivers.json'):
    if e['type'] == 'way' and 'geometry' in e:
        t = e.get('tags', {})
        waters.append(dict(id=e['id'], cls='river', name=t.get('name'), tunnel=t.get('tunnel'), coords=[(p['lon'], p['lat']) for p in e['geometry'] if p]))
for e in ways(f'{D}/places.json'):
    t = e.get('tags', {})
    if e['type'] == 'node' and t.get('name'):
        places.append(dict(type=t.get('place'), name=t['name'], pop=t.get('population'), lon=e['lon'], lat=e['lat'], id=e['id']))
print('HU roads', len(roads), 'rails', len(rails), 'rivers', len(waters), 'places', len(places))
pickle.dump(dict(roads=roads, rails=rails, waters=waters, places=places), open(WORK + '/out/nb_hu.pkl', 'wb'), protocol=5)
