"""Generates a small, reproducible SYNTHETIC demo scene (Sentinel-2 composite
+ Slope + DEM, correctly georeferenced and spatially aligned) on demand,
instead of committing a real satellite dataset to the repo.

This is NOT real Sentinel-2 imagery and detections run against it are NOT
real landslide predictions — see LANDSLIDE_INFERENCE_MODE and the "mode"
field every API response carries. It exists purely so the demo account (and
the automated tests) can exercise the real validation/preprocessing/tiling/
polygonization pipeline without needing licensed satellite data.

To use real data instead: obtain Sentinel-2 L1C bands + a DEM/slope pair for
your area of interest (e.g. via Copernicus Open Access Hub + SRTM), reproject
them onto one common grid/CRS/resolution, and upload them through
POST /landslide/analyze instead of demo_dataset=true. See README.md.
"""

from __future__ import annotations

import tempfile
from pathlib import Path

import numpy as np
import rasterio
from rasterio.transform import from_origin

DEMO_SIZE = 256  # 2x2 patches at the default 128px patch size
DEMO_CRS = "EPSG:4326"
# Roughly Sikkim, matching the rest of NER-SHIELD's demo geography — not a
# real imagery footprint, just a plausible center point for the synthetic grid.
DEMO_ORIGIN_LON = 88.50
DEMO_ORIGIN_LAT = 27.20
DEMO_PIXEL_SIZE_DEG = 0.0005  # ~55m at this latitude


def _synthetic_dem(size: int, rng: np.random.Generator) -> np.ndarray:
    yy, xx = np.mgrid[0:size, 0:size]
    ridge = 1200 + 400 * np.sin(xx / 30) + 250 * np.cos(yy / 22)
    noise = rng.normal(0, 15, size=(size, size))
    return (ridge + noise).astype(np.float32)


def _synthetic_slope_from_dem(dem: np.ndarray) -> np.ndarray:
    gy, gx = np.gradient(dem)
    slope_rad = np.arctan(np.sqrt(gx**2 + gy**2))
    return np.degrees(slope_rad).astype(np.float32)


def _synthetic_sentinel(size: int, slope: np.ndarray, rng: np.random.Generator) -> np.ndarray:
    """12 bands, loosely shaped so steeper areas read as sparser vegetation
    (lower NIR-ish bands) — deterministic given the RNG seed, not meant to
    resemble real spectral signatures."""
    bands = np.zeros((12, size, size), dtype=np.float32)
    veg_suppression = np.clip(slope / 45.0, 0, 1)
    for b in range(12):
        base = 0.15 + 0.02 * b
        variation = rng.normal(0, 0.03, size=(size, size))
        bands[b] = np.clip(base - 0.08 * veg_suppression + variation, 0.0, 1.0)
    return bands


def generate_demo_scene(output_dir: str | Path | None = None, seed: int = 42) -> dict[str, str]:
    """Writes sentinel.tif (12-band), slope.tif, dem.tif into `output_dir`
    (a fresh temp dir if not given) and returns their paths. Deterministic
    for a given seed.
    """
    out = Path(output_dir) if output_dir else Path(tempfile.mkdtemp(prefix="ns_landslide_demo_"))
    out.mkdir(parents=True, exist_ok=True)

    rng = np.random.default_rng(seed)
    dem = _synthetic_dem(DEMO_SIZE, rng)
    slope = _synthetic_slope_from_dem(dem)
    sentinel = _synthetic_sentinel(DEMO_SIZE, slope, rng)

    transform = from_origin(DEMO_ORIGIN_LON, DEMO_ORIGIN_LAT, DEMO_PIXEL_SIZE_DEG, DEMO_PIXEL_SIZE_DEG)
    profile_base = {
        "driver": "GTiff",
        "height": DEMO_SIZE,
        "width": DEMO_SIZE,
        "crs": DEMO_CRS,
        "transform": transform,
        "dtype": "float32",
    }

    sentinel_path = out / "sentinel.tif"
    with rasterio.open(sentinel_path, "w", count=12, **profile_base) as dst:
        dst.write(sentinel)

    slope_path = out / "slope.tif"
    with rasterio.open(slope_path, "w", count=1, **profile_base) as dst:
        dst.write(slope[np.newaxis, :, :])

    dem_path = out / "dem.tif"
    with rasterio.open(dem_path, "w", count=1, **profile_base) as dst:
        dst.write(dem[np.newaxis, :, :])

    return {"sentinel": str(sentinel_path), "slope": str(slope_path), "dem": str(dem_path)}
