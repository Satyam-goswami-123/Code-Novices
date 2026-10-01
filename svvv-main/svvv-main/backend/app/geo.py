"""Generate approximate district polygons via Voronoi tessellation
clipped to a Voidhack bounding box. Good enough for a choropleth demo."""
from .db import get_conn

# Lazy imports
_geo_loaded = False
Voronoi = None
np = None

def _ensure_geo_imports():
    global Voronoi, np, _geo_loaded
    if not _geo_loaded:
        try:
            from scipy.spatial import Voronoi as _V
            import numpy as _np
            Voronoi = _V
            np = _np
            _geo_loaded = True
        except ImportError:
            pass


# Voidhack bbox (approx)
KA_BBOX = {"min_lat": 11.5, "max_lat": 18.5, "min_lng": 74.0, "max_lng": 78.6}


def _clip_to_bbox(poly):
    # Sutherland-Hodgman against bbox
    b = KA_BBOX
    edges = [
        ("xmin", b["min_lng"]), ("xmax", b["max_lng"]),
        ("ymin", b["min_lat"]), ("ymax", b["max_lat"]),
    ]
    out = list(poly)
    for kind, val in edges:
        inp = out; out = []
        if not inp: break
        S = inp[-1]
        for E in inp:
            if kind == "xmin":
                S_in = S[0] >= val; E_in = E[0] >= val
            elif kind == "xmax":
                S_in = S[0] <= val; E_in = E[0] <= val
            elif kind == "ymin":
                S_in = S[1] >= val; E_in = E[1] >= val
            else:
                S_in = S[1] <= val; E_in = E[1] <= val
            if E_in:
                if not S_in:
                    out.append(_intersect(S, E, kind, val))
                out.append(E)
            elif S_in:
                out.append(_intersect(S, E, kind, val))
            S = E
    return out


def _intersect(p1, p2, kind, val):
    x1,y1 = p1; x2,y2 = p2
    if kind in ("xmin","xmax"):
        t = (val - x1) / (x2 - x1) if x2 != x1 else 0
        return (val, y1 + t*(y2-y1))
    else:
        t = (val - y1) / (y2 - y1) if y2 != y1 else 0
        return (x1 + t*(x2-x1), val)


def districts_geojson():
    conn = get_conn()
    try:
        rows = [dict(r) for r in conn.execute(
            "SELECT id,name,lat,lng FROM districts").fetchall()]
    finally:
        conn.close()

    # Add far-away "ghost" points so border cells are bounded
    pts = [(r["lng"], r["lat"]) for r in rows]
    ghost = [(60, 0),(90, 0),(60, 30),(90, 30),(75, -10),(75, 40),(50, 15),(100, 15)]
    arr = np.array(pts + ghost)
    vor = Voronoi(arr)

    features = []
    for i, r in enumerate(rows):
        region_idx = vor.point_region[i]
        verts_idx = vor.regions[region_idx]
        if -1 in verts_idx or not verts_idx:
            continue
        poly = [tuple(vor.vertices[j]) for j in verts_idx]  # (x,y) = (lng,lat)
        clipped = _clip_to_bbox(poly)
        if len(clipped) < 3: continue
        # Close ring
        if clipped[0] != clipped[-1]:
            clipped.append(clipped[0])
        features.append({
            "type":"Feature",
            "properties": {"id": r["id"], "name": r["name"], "lat": r["lat"], "lng": r["lng"]},
            "geometry": {"type":"Polygon",
                         "coordinates": [[(float(x), float(y)) for x,y in clipped]]}
        })
    return {"type":"FeatureCollection","features":features}
