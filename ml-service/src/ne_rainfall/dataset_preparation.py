"""Build the model-ready feature matrix for a region.

Direct replacement for the original ``dataset_preparation.py``, which read four
Google Drive spreadsheets and wrote a 111-column CSV.  The output contract is
identical -- ``(n_timesteps, n_blocks * n_stations)`` float matrix, blocks in
config order, target station in column 0 -- so every downstream script from the
Mumbai repo works unchanged.

What is different:

* stations, bounding box and season come from config, not from literals;
* the NWP block is snapped to the nearest grid node by great-circle distance;
* a manifest is written next to the matrix recording provenance, station order,
  season mask and row count, so a checkpoint can be traced back to the exact
  data that produced it.
"""

from __future__ import annotations

import json
from dataclasses import dataclass, asdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import numpy as np
import pandas as pd

from ne_rainfall.config import Config, load_config
from ne_rainfall.data import SourceUnavailable, get_source
from ne_rainfall.stations import StationSet, load_stations, map_stations_to_grid

# Canonical variable requested from a source, per feature block.
BLOCK_VARIABLES = {
    "rainfall": "rainfall",
    "wind_speed": "wind_speed",
    "nwp_precip": "nwp_precip",
    "temperature": "temperature",
    "humidity": "humidity",
    "cape": "cape",
}


@dataclass
class DatasetManifest:
    """Everything needed to reproduce or audit a built matrix."""

    region: str
    built_at: str
    freq: str
    start_date: str
    end_date: str
    blocks: List[str]
    stations: List[str]
    target_station: str
    n_rows: int
    n_features: int
    season_window: str
    sources: Dict[str, str]
    nwp_grid: Dict[str, List[float]]
    missing_fraction: float
    notes: List[str]

    def save(self, path: Path) -> None:
        path.write_text(json.dumps(asdict(self), indent=2), encoding="utf-8")

    @staticmethod
    def load(path: str | Path) -> "DatasetManifest":
        return DatasetManifest(**json.loads(Path(path).read_text(encoding="utf-8")))


def season_mask(index: pd.DatetimeIndex, start_md: str, end_md: str) -> np.ndarray:
    """Boolean mask for the wet season, inclusive of both endpoints.

    Handles a window that wraps the new year (not needed for India, but the
    function is region-agnostic and a wrap-around config should not misbehave).
    """
    sm, sd = (int(x) for x in start_md.split("-"))
    em, ed = (int(x) for x in end_md.split("-"))
    month, day = index.month, index.day
    after_start = (month > sm) | ((month == sm) & (day >= sd))
    before_end = (month < em) | ((month == em) & (day <= ed))
    if (sm, sd) <= (em, ed):
        return np.asarray(after_start & before_end)
    return np.asarray(after_start | before_end)


def fetch_block(
    block: str,
    stations: StationSet,
    cfg: Config,
    source_key: str,
    grid: Optional[Dict[str, Tuple[float, float]]] = None,
    verbose: bool = True,
) -> pd.DataFrame:
    """One feature block: one column per station, in station order."""
    variable = BLOCK_VARIABLES[block]
    src = get_source(source_key, cache_dir=str(cfg.path_for("raw_dir") / "cache"))
    start, end = cfg.data["start_date"], cfg.data["end_date"]

    columns: Dict[str, pd.Series] = {}
    for i, st in enumerate(stations, 1):
        # The NWP block is sampled at the model grid node, exactly as the
        # Mumbai code pulled `Prec_{lat}_{lon}` for the closest GFS cell.
        lat, lon = (grid[st.name] if grid else (st.lat, st.lon))
        if verbose:
            print(f"  [{block}] {i:>2}/{len(stations)} {st.name:<20} "
                  f"({lat:.2f}N, {lon:.2f}E)", flush=True)
        df = src.fetch_point(lat, lon, start, end, {variable: variable}, cfg.freq)
        df = src.conform(df, start, end, cfg.freq)
        columns[st.name] = df[variable]

    out = pd.DataFrame(columns)
    out.columns = pd.MultiIndex.from_product([[block], out.columns])
    return out


def build_dataset(
    cfg: Optional[Config] = None,
    verbose: bool = True,
    write: bool = True,
) -> Tuple[pd.DataFrame, DatasetManifest]:
    """Fetch every block, align, mask to season and write the matrix."""
    cfg = cfg or load_config()
    stations = load_stations(cfg.stations_path)
    target = cfg.model["target_station"]
    stations = stations.reordered_with_target_first(target)

    n_expected = cfg.expected_n_features(len(stations))
    if n_expected != int(cfg.model["n_features"]):
        raise ValueError(
            f"config mismatch: {len(cfg.blocks)} blocks x {len(stations)} stations "
            f"= {n_expected} features, but model.n_features = "
            f"{cfg.model['n_features']}. Fix one or the other -- a silent "
            "mismatch here makes every checkpoint incompatible."
        )

    grid = map_stations_to_grid(
        stations, cfg.region["bbox"], float(cfg.data["nwp_grid_step"])
    )

    obs_source = cfg.data["sources"]["observed"]
    nwp_source = cfg.data["sources"]["nwp"]
    notes: List[str] = []

    frames = []
    used_sources: Dict[str, str] = {}
    for block in cfg.blocks:
        is_nwp = block.startswith("nwp")
        key = nwp_source if is_nwp else obs_source
        if is_nwp and key == "gfs":
            # The live GFS endpoint only reaches ~92 days back; a multi-year
            # training block needs the historical-forecast archive instead.
            key = "gfs_archive"
            notes.append(
                "NWP block built from Open-Meteo historical forecast archive "
                "(gfs_seamless); the live 'gfs' endpoint only covers ~92 past days "
                "and is used by predict.py for inference."
            )
        if verbose:
            print(f"[block] {block} <- {key}")
        try:
            frames.append(
                fetch_block(block, stations, cfg, key,
                            grid=grid if is_nwp else None, verbose=verbose)
            )
            used_sources[block] = key
        except (SourceUnavailable, ValueError) as exc:
            raise SystemExit(f"could not build block {block!r}: {exc}")

    data = pd.concat(frames, axis=1)

    # --- NWP becomes a forecast, not a hindcast --------------------------
    # The original shifted the GFS columns left by one 15-minute step so that
    # at time t the model sees the NWP value *for* t+1 rather than for t.
    shift = int(cfg.data.get("nwp_shift_steps", 1))
    nwp_cols = [c for c in data.columns if str(c[0]).startswith("nwp")]
    if shift and nwp_cols:
        data[nwp_cols] = data[nwp_cols].shift(-shift)

    # --- season mask -----------------------------------------------------
    mask = season_mask(
        data.index, cfg.season["start_month_day"], cfg.season["end_month_day"]
    )
    data = data.loc[mask]

    # --- gap handling ----------------------------------------------------
    missing_before = float(data.isna().mean().mean())
    # A short gap in a reanalysis series is interpolation-safe; a long one is
    # not, and dropping whole rows (as the original `dropna()` did) silently
    # splices non-adjacent times into one 12-step window.  Interpolate up to
    # one hour, then drop what remains and record it.
    max_gap = max(1, int(60 / _minutes(cfg.freq)))
    data = data.interpolate(limit=max_gap, limit_direction="both")
    before_rows = len(data)
    data = data.dropna()
    dropped = before_rows - len(data)
    if dropped:
        notes.append(
            f"{dropped} rows ({dropped / max(before_rows,1):.2%}) dropped after "
            f"interpolating gaps up to {max_gap} steps."
        )

    if data.empty:
        raise SystemExit(
            "dataset is empty after masking and gap handling -- check "
            "data.start_date/end_date and the season window in your config."
        )

    manifest = DatasetManifest(
        region=cfg.region["name"],
        built_at=datetime.now(timezone.utc).isoformat(timespec="seconds"),
        freq=cfg.freq,
        start_date=cfg.data["start_date"],
        end_date=cfg.data["end_date"],
        blocks=cfg.blocks,
        stations=stations.names,
        target_station=target,
        n_rows=len(data),
        n_features=data.shape[1],
        season_window=f"{cfg.season['start_month_day']}..{cfg.season['end_month_day']}",
        sources=used_sources,
        nwp_grid={k: list(v) for k, v in grid.items()},
        missing_fraction=round(missing_before, 6),
        notes=notes,
    )

    if write:
        out_dir = cfg.path_for("processed_dir")
        out_dir.mkdir(parents=True, exist_ok=True)
        csv_path = out_dir / f"{cfg.slug}_features.csv"
        npy_path = out_dir / f"{cfg.slug}_features.npy"
        data.to_csv(csv_path)
        np.save(npy_path, data.to_numpy(dtype=np.float32))
        manifest.save(out_dir / f"{cfg.slug}_manifest.json")
        if verbose:
            print(f"\nwrote {csv_path}  ({data.shape[0]} x {data.shape[1]})")
            print(f"wrote {npy_path}")
            for n in notes:
                print(f"note: {n}")

    return data, manifest


def _minutes(freq: str) -> int:
    return int(pd.Timedelta(pd.tseries.frequencies.to_offset(freq)).total_seconds() // 60)


def load_matrix(cfg: Optional[Config] = None) -> np.ndarray:
    """Load a previously built matrix as a plain float array."""
    cfg = cfg or load_config()
    npy = cfg.path_for("processed_dir") / f"{cfg.slug}_features.npy"
    if npy.exists():
        return np.load(npy)
    csv = cfg.path_for("processed_dir") / f"{cfg.slug}_features.csv"
    if csv.exists():
        return pd.read_csv(csv, index_col=0, header=[0, 1]).to_numpy(dtype=np.float32)
    raise FileNotFoundError(
        f"no built dataset for region {cfg.slug!r}. Run:  python -m ne_rainfall.cli build-data"
    )


if __name__ == "__main__":
    build_dataset()
