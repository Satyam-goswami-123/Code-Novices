from typing import Optional, List, Dict
"""Predictive patrol-route optimizer.

Input: station_id (or district_id, or lat/lng).
Output: ordered waypoints through highest-risk cells using a nearest-neighbor tour,
plus a Google-Maps URL.
"""
from urllib.parse import quote
from . import analytics
from .db import get_conn


def _nearest_neighbor_tour(start, points):
    """Greedy NN TSP. Returns ordered list with `start` first."""
    order = [start]
    remaining = list(points)
    cur = start
    while remaining:
        nxt = min(remaining, key=lambda p: (p["lat"]-cur["lat"])**2 + (p["lng"]-cur["lng"])**2)
        order.append(nxt); remaining.remove(nxt); cur = nxt
    return order


def route_for_station(station_id: Optional[int] = None, district_id: Optional[int] = None,
                      months: int = 3, max_waypoints: int = 6,
                      crime_type: Optional[str] = None) -> dict:
    conn = get_conn()
    try:
        if station_id:
            st = conn.execute("""SELECT id,name,lat,lng,district_id FROM stations
                                 WHERE id=?""",(station_id,)).fetchone()
            if not st: return {"error":"station not found"}
            start = {"lat": st["lat"], "lng": st["lng"], "name": st["name"]}
            district_id = st["district_id"]
        elif district_id:
            d = conn.execute("SELECT name,lat,lng FROM districts WHERE id=?",
                             (district_id,)).fetchone()
            start = {"lat": d["lat"], "lng": d["lng"], "name": d["name"]+" HQ"}
        else:
            return {"error":"station_id or district_id required"}
    finally:
        conn.close()

    # Pull recent hotspots in this district
    hot = analytics.hotspots(months=months, crime_type=crime_type, top=400)
    conn = get_conn()
    try:
        dname = conn.execute("SELECT name FROM districts WHERE id=?",
                             (district_id,)).fetchone()["name"]
    finally:
        conn.close()
    in_district = [h for h in hot if h["district"] == dname]
    in_district.sort(key=lambda h: h["intensity"], reverse=True)
    picks = in_district[:max_waypoints]
    if not picks:
        return {"error":"no recent hotspots in jurisdiction", "start": start}

    tour = _nearest_neighbor_tour(start, [{"lat":p["lat"],"lng":p["lng"],
                                           "intensity":p["intensity"],
                                           "count":p["count"],
                                           "name":f"Hotspot {p['count']} cases"} for p in picks])
    # close loop back to start
    tour.append(start)

    # google maps url
    coords = "/".join(f"{p['lat']:.5f},{p['lng']:.5f}" for p in tour)
    maps_url = f"https://www.google.com/maps/dir/{coords}"

    # rough total distance (km, Haversine approx)
    def hav(a,b):
        from math import radians, sin, cos, sqrt, atan2
        R=6371
        la1,lo1,la2,lo2 = map(radians,[a["lat"],a["lng"],b["lat"],b["lng"]])
        dla=la2-la1; dlo=lo2-lo1
        x = sin(dla/2)**2 + cos(la1)*cos(la2)*sin(dlo/2)**2
        return 2*R*atan2(sqrt(x), sqrt(1-x))
    dist_km = round(sum(hav(tour[i],tour[i+1]) for i in range(len(tour)-1)), 2)
    return {"start": start, "tour": tour, "google_maps_url": maps_url,
            "distance_km": dist_km, "waypoints": len(tour)-2,
            "district": dname, "months_basis": months}
