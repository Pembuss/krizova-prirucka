# Extrakcia slovenských dát OSM pre offline mapu (cesty, vody, plochy, obce, body, adresy).
import os as _os
WORK = _os.environ.get('KP_MAPWORK') or _os.path.join(_os.path.dirname(_os.path.abspath(__file__)), '..', '.mapwork')  # pracovný priečinok (raw/, out/, shelters/, tiles/)
import osmium, sys, pickle, time
SRC, OUT = sys.argv[1], sys.argv[2]
ROADS = {'motorway','motorway_link','trunk','trunk_link','primary','primary_link','secondary','secondary_link','tertiary','tertiary_link',
         'unclassified','residential','living_street','pedestrian','service','track','road','footway','path','cycleway','steps','bridleway'}
RAIL = {'rail','light_rail','tram','subway','narrow_gauge'}
WATERWAY = {'river','stream','canal'}
PLACES = {'city','town','village','hamlet','suburb','quarter','neighbourhood','borough'}
ADMIN_LEVELS = {'2','4','6','7','8'}
KEEP_ROAD_TAGS = ('name','ref','oneway','junction','bridge','tunnel','layer','access','motor_vehicle','motorcar','vehicle','foot','bicycle','service','tracktype','maxspeed','surface','toll','area','int_ref')

def poi_cat(t):
    a = t.get('amenity'); e = t.get('emergency')
    if t.get('shelter_type') in ('bomb_shelter',) or t.get('bunker_type') in ('bomb_shelter','air_raid_shelter','personnel_shelter','civil_defence','civil_protection') or e == 'shelter' or t.get('civil_defence') or t.get('air_raid_shelter'):
        return 'shelter'
    if t.get('military') == 'bunker' or t.get('building') == 'bunker': return 'bunker'
    if e == 'assembly_point': return 'assembly'
    if a == 'parking' and t.get('parking') == 'underground': return 'underground'
    if a == 'hospital': return 'hospital'
    if a == 'pharmacy': return 'pharmacy'
    if a in ('fire_station','police'): return 'emergency'
    if e == 'ambulance_station' or e == 'mountain_rescue': return 'emergency'
    if a == 'townhall': return 'townhall'
    if a in ('drinking_water','water_point') or (t.get('man_made') == 'water_well' and t.get('drinking_water') == 'yes') or (t.get('natural') == 'spring' and t.get('drinking_water') == 'yes'):
        return 'water'
    if a == 'fuel': return 'fuel'
    if e == 'defibrillator': return 'aed'
    if e == 'siren': return 'siren'
    return None
POI_TAGS = ('name','amenity','emergency','shelter_type','bunker_type','building','military','parking','man_made','natural','drinking_water','operator','opening_hours','capacity','access','phone','contact:phone','wheelchair','description','addr:street','addr:place','addr:housenumber','addr:city','historic','location','indoor','level')

def area_kind(t):
    n = t.get('natural'); l = t.get('landuse'); w = t.get('waterway'); le = t.get('leisure')
    if n == 'water' or w == 'riverbank' or l in ('reservoir','basin') or t.get('water'): return 'water'
    if n == 'wetland': return 'wetland'
    if l == 'forest' or n == 'wood': return 'forest'
    if l in ('residential',): return 'residential'
    if l in ('industrial','railway','quarry'): return 'industrial'
    if l in ('commercial','retail'): return 'commercial'
    if le in ('park','garden') and t.get('access') not in ('private',): return 'park'
    if l in ('cemetery',) or t.get('amenity') == 'grave_yard': return 'cemetery'
    if l in ('meadow','grass','orchard','vineyard','allotments') or n in ('grassland','heath','scrub'): return 'green'
    if l == 'military': return 'military'
    if n in ('bare_rock','scree') : return 'rock'
    return None

class Rel(osmium.SimpleHandler):
    def __init__(s):
        super().__init__(); s.admin = {}; s.routes = {}
    def relation(s, r):
        t = r.tags
        if t.get('boundary') == 'administrative' and t.get('admin_level') in ADMIN_LEVELS:
            lvl = t.get('admin_level')
            for m in r.members:
                if m.type == 'w' and m.role in ('outer','inner',''):
                    prev = s.admin.get(m.ref)
                    s.admin[m.ref] = min(prev, int(lvl)) if prev else int(lvl)
            s.routes.setdefault('adminrels', []).append((r.id, lvl, t.get('name'), t.get('ISO3166-1') or t.get('ISO3166-2') or ''))

class H(osmium.SimpleHandler):
    def __init__(s, admin):
        super().__init__(); s.admin = admin
        s.roads=[]; s.rails=[]; s.waters=[]; s.areas=[]; s.places=[]; s.pois=[]; s.addr=[]; s.bounds=[]
    def node(s, n):
        t = n.tags
        if not len(t): return
        p = t.get('place')
        if p in PLACES and t.get('name'):
            s.places.append(dict(type=p, name=t.get('name'), pop=t.get('population'), lon=n.location.lon, lat=n.location.lat, id=n.id, name_hu=t.get('name:hu')))
        c = poi_cat(t)
        if c: s.pois.append(dict(cat=c, lon=n.location.lon, lat=n.location.lat, osm=('node', n.id), tags={k: t[k] for k in POI_TAGS if k in t}))
        if 'addr:conscriptionnumber' in t or 'addr:housenumber' in t or 'addr:streetnumber' in t:
            s.addr.append((t.get('addr:street') or t.get('addr:place') or '', t.get('addr:city') or t.get('addr:place') or '', t.get('addr:conscriptionnumber',''), t.get('addr:streetnumber',''), t.get('addr:housenumber',''), t.get('addr:postcode',''), n.location.lon, n.location.lat))
    def way(s, w):
        t = w.tags
        hw = t.get('highway'); rw = t.get('railway'); ww = t.get('waterway')
        adm = s.admin.get(w.id)
        if not (hw in ROADS or rw in RAIL or ww in WATERWAY or adm): return
        try:
            coords = [(nd.lon, nd.lat) for nd in w.nodes]
            ids = [nd.ref for nd in w.nodes]
        except osmium.InvalidLocationError:
            return
        if len(coords) < 2: return
        if hw in ROADS and t.get('area') != 'yes':
            s.roads.append(dict(id=w.id, cls=hw, tags={k: t[k] for k in KEEP_ROAD_TAGS if k in t}, coords=coords, nodes=ids))
        if rw in RAIL:
            s.rails.append(dict(id=w.id, cls=rw, service=t.get('service'), usage=t.get('usage'), tunnel=t.get('tunnel'), bridge=t.get('bridge'), coords=coords))
        if ww in WATERWAY:
            s.waters.append(dict(id=w.id, cls=ww, name=t.get('name'), tunnel=t.get('tunnel'), coords=coords))
        if adm:
            s.bounds.append(dict(id=w.id, level=adm, coords=coords))
    def area(s, a):
        t = a.tags
        k = area_kind(t)
        c = poi_cat(t)
        has_addr = 'addr:conscriptionnumber' in t or 'addr:housenumber' in t or 'addr:streetnumber' in t
        if not (k or c or has_addr): return
        try:
            polys = []
            for outer in a.outer_rings():
                ring = [(n.lon, n.lat) for n in outer]
                holes = [[(n.lon, n.lat) for n in inner] for inner in a.inner_rings(outer)]
                polys.append([ring] + holes)
        except osmium.InvalidLocationError:
            return
        if not polys: return
        if k: s.areas.append(dict(kind=k, name=t.get('name'), polys=polys, osm=a.orig_id(), from_way=a.from_way()))
        if c or has_addr:
            r = polys[0][0]
            cx = sum(x for x, _ in r) / len(r); cy = sum(y for _, y in r) / len(r)
            if c: s.pois.append(dict(cat=c, lon=cx, lat=cy, osm=('way' if a.from_way() else 'relation', a.orig_id()), tags={kk: t[kk] for kk in POI_TAGS if kk in t}))
            if has_addr: s.addr.append((t.get('addr:street') or t.get('addr:place') or '', t.get('addr:city') or t.get('addr:place') or '', t.get('addr:conscriptionnumber',''), t.get('addr:streetnumber',''), t.get('addr:housenumber',''), t.get('addr:postcode',''), cx, cy))

t0 = time.time()
r = Rel(); r.apply_file(SRC)
print('relations', len(r.admin), time.time() - t0, flush=True)
h = H(r.admin); h.apply_file(SRC, locations=True, idx='flex_mem')
print('done', time.time() - t0, {k: len(getattr(h, k)) for k in ('roads','rails','waters','areas','places','pois','addr','bounds')}, flush=True)
pickle.dump(dict(roads=h.roads, rails=h.rails, waters=h.waters, areas=h.areas, places=h.places, pois=h.pois, addr=h.addr, bounds=h.bounds, adminrels=r.routes.get('adminrels', [])), open(OUT, 'wb'), protocol=5)
