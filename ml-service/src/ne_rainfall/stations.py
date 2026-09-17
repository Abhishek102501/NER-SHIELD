"""Station registry and NWP-grid mapping.

The Mumbai pipeline read ``Stations_Coordinates.csv`` and snapped each AWS
station to the nearest 0.25 deg GFS grid point.  The same idea is kept here,
with two changes that matter for the North East:

* distances use a haversine metric instead of a planar sqrt(dlat^2 + dlon^2).
  Over Mumbai's ~1 deg box the two agree; over a 9.5 deg wide domain spanning
  21.5-29.5 N the planar version mis-ranks neighbours near the edges.
* elevation is carried through, because the orographic gradient (12 m at
  Agartala to 2922 m at Tawang) is the dominant control on rainfall here.
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, Iterable, List, Optional, Sequence, Tuple

import numpy as np
import pandas as pd

EARTH_RADIUS_KM = 6371.0088


@dataclass(frozen=True)
class Station:
    station_id: str
    name: str
    state: str
    lat: float
    lon: float
    elevation_m: Optional[float] = None
    river_basin: Optional[str] = None


class StationSet:
    """An ordered collection of stations.

    Order is significant: it fixes the column order of the feature matrix and
    therefore the meaning of every weight in a trained checkpoint.  Stations
    are sorted by ``station_id`` so the order is reproducible.
    """

    def __init__(self, stations: Sequence[Station]):
        if not stations:
            raise ValueError("station set is empty")
        self._stations: List[Station] = sorted(stations, key=lambda s: s.station_id)
        seen = set()
        for s in self._stations:
            if s.name in seen:
                raise ValueError(f"duplicate station name: {s.name}")
            seen.add(s.name)

    def __len__(self) -> int:
        return len(self._stations)

    def __iter__(self) -> Iterable[Station]:
        return iter(self._stations)

    def __getitem__(self, i: int) -> Station:
        return self._stations[i]

    @property
    def names(self) -> List[str]:
        return [s.name for s in self._stations]

    def index_of(self, name: str) -> int:
        try:
            return self.names.index(name)
        except ValueError as exc:
            raise KeyError(
                f"station {name!r} not in set; known: {', '.join(self.names)}"
            ) from exc

    def get(self, name: str) -> Station:
        return self._stations[self.index_of(name)]

    def reordered_with_target_first(self, target: str) -> "StationSet":
        """Put ``target`` first.

        The original scripts always predict column 0 (``data[:, 0]``) and
        ``Andheri`` happened to sort first.  Rather than inherit that accident,
        the target station is moved to the front explicitly.
        """
        idx = self.index_of(target)
        ordered = [self._stations[idx]] + [
            s for i, s in enumerate(self._stations) if i != idx
        ]
        out = StationSet.__new__(StationSet)
        out._stations = ordered
        return out

    def to_frame(self) -> pd.DataFrame:
        return pd.DataFrame(
            [
                {
                    "station_id": s.station_id,
                    "Place": s.name,
                    "State": s.state,
                    "Lat (N)": s.lat,
                    "Long (E)": s.lon,
                    "elevation_m": s.elevation_m,
                    "river_basin": s.river_basin,
                }
                for s in self._stations
            ]
        )


def load_stations(path: str | Path) -> StationSet:
    """Read a station CSV.

    Accepts the North East schema and the original Mumbai
    ``Stations_Coordinates.csv`` schema (``Place``, ``Lat (N)``, ``Long (E)``).
    """
    df = pd.read_csv(path)
    cols = {c.lower().strip(): c for c in df.columns}

    def pick(*candidates: str) -> Optional[str]:
        for cand in candidates:
            if cand in cols:
                return cols[cand]
        return None

    name_col = pick("place", "station", "name")
    lat_col = pick("lat (n)", "lat", "latitude")
    lon_col = pick("long (e)", "lon", "longitude")
    if not (name_col and lat_col and lon_col):
        raise ValueError(
            f"{path}: need name/lat/lon columns, found {list(df.columns)}"
        )
    id_col = pick("station_id", "id")
    state_col = pick("state")
    elev_col = pick("elevation_m", "elevation")
    basin_col = pick("river_basin", "basin")

    stations: List[Station] = []
    for i, row in df.iterrows():
        elev = row[elev_col] if elev_col else None
        stations.append(
            Station(
                station_id=str(row[id_col]) if id_col else f"S{i + 1:03d}",
                name=str(row[name_col]).strip(),
                state=str(row[state_col]).strip() if state_col else "",
                lat=float(row[lat_col]),
                lon=float(row[lon_col]),
                elevation_m=None if elev is None or pd.isna(elev) else float(elev),
                river_basin=(
                    str(row[basin_col]).strip()
                    if basin_col and not pd.isna(row[basin_col])
                    else None
                ),
            )
        )
    return StationSet(stations)


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Great-circle distance in kilometres."""
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dphi = p2 - p1
    dlam = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dlam / 2) ** 2
    return 2 * EARTH_RADIUS_KM * math.asin(math.sqrt(a))


def build_grid(
    lat_min: float,
    lat_max: float,
    lon_min: float,
    lon_max: float,
    step: float = 0.25,
) -> np.ndarray:
    """Regular lat/lon grid, ``(n, 2)``, matching the NWP native spacing.

    Snapped outward to whole multiples of ``step`` so the grid lines up with
    the real GFS/ERA5 mesh instead of floating off it by a fraction of a cell.
    """
    lo_lat = math.floor(lat_min / step) * step
    hi_lat = math.ceil(lat_max / step) * step
    lo_lon = math.floor(lon_min / step) * step
    hi_lon = math.ceil(lon_max / step) * step
    lats = np.round(np.arange(lo_lat, hi_lat + step / 2, step), 4)
    lons = np.round(np.arange(lo_lon, hi_lon + step / 2, step), 4)
    return np.array([[la, lo] for la in lats for lo in lons], dtype=float)


def nearest_grid_point(grid: np.ndarray, lat: float, lon: float) -> Tuple[float, float]:
    """Nearest grid node to a station, by great-circle distance."""
    d = np.array([haversine_km(lat, lon, g[0], g[1]) for g in grid])
    j = int(np.argmin(d))
    return float(grid[j, 0]), float(grid[j, 1])


def map_stations_to_grid(
    stations: StationSet,
    bbox: Dict[str, float],
    step: float = 0.25,
) -> Dict[str, Tuple[float, float]]:
    """Station name -> nearest NWP grid node."""
    grid = build_grid(
        bbox["lat_min"], bbox["lat_max"], bbox["lon_min"], bbox["lon_max"], step
    )
    return {s.name: nearest_grid_point(grid, s.lat, s.lon) for s in stations}
