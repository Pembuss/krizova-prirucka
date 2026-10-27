# Hlavné cesty, železnice, rieky a obce zo susedných krajín (rýchly prechod s filtrami).
import os as _os
WORK = _os.environ.get('KP_MAPWORK') or _os.path.join(_os.path.dirname(_os.path.abspath(__file__)), '..', '.mapwork')  # pracovný priečinok (raw/, out/, shelters/, tiles/)
import osmium, sys, pickle, time
SRC, OUT = sys.argv[1], sys.argv[2]
bbox = tuple(map(float, sys.argv[3].split(','))) if len(sys.argv) > 3 else None  # minlon,minlat,maxlon,maxlat
MAIN = {'motorway','motorway_link','trunk','trunk_link','primary','primary_link','secondary','secondary_link'}
PLACES = {'city','town','village'}
KEEP = ('name','ref','oneway','junction','bridge','tunnel','layer','access','motor_vehicle','toll','int_ref','maxspeed')
def inside(lon, lat):
    return not bbox or (bbox[0] <= lon <= bbox[2] and bbox[1] <= lat <= bbox[3])
t0 = time.time()
roads, rails, waters, places = [], [], [], []
bad = 0
fp = (osmium.FileProcessor(SRC).with_locations()
      .with_filter(osmium.filter.KeyFilter('highway', 'railway', 'waterway', 'place')))
for o in fp:
    t = o.tags
    if o.is_node():
        if t.get('place') in PLACES and t.get('name') and inside(o.location.lon, o.location.lat):
            places.append(dict(type=t['place'], name=t['name'], pop=t.get('population'), lon=o.location.lon, lat=o.location.lat, id=o.id))
        continue
    if not o.is_way(): continue
    hw = t.get('highway'); rw = t.get('railway'); ww = t.get('waterway')
    if not (hw in MAIN or (rw == 'rail' and not t.get('service')) or ww == 'river'): continue
    try:
        coords = [(n.lon, n.lat) for n in o.nodes]; ids = [n.ref for n in o.nodes]
    except osmium.InvalidLocationError:
        bad += 1; continue
    if len(coords) < 2 or not any(inside(x, y) for x, y in coords): continue
    if hw in MAIN: roads.append(dict(id=o.id, cls=hw, tags={k: t[k] for k in KEEP if k in t}, coords=coords, nodes=ids))
    elif rw: rails.append(dict(id=o.id, cls='rail', usage=t.get('usage'), tunnel=t.get('tunnel'), bridge=t.get('bridge'), coords=coords))
    else: waters.append(dict(id=o.id, cls='river', name=t.get('name'), tunnel=t.get('tunnel'), coords=coords))
print(SRC, 'roads', len(roads), 'rails', len(rails), 'rivers', len(waters), 'places', len(places), 'bad', bad, round(time.time() - t0), flush=True)
pickle.dump(dict(roads=roads, rails=rails, waters=waters, places=places), open(OUT, 'wb'), protocol=5)
