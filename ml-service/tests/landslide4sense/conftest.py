"""Small synthetic GeoTIFF fixtures for Landslide4Sense tests — deliberately
NOT real satellite data, just enough structure (right band count, CRS,
resolution, alignment) to exercise validation/preprocessing/tiling/GIS code.
"""

from __future__ import annotations

from pathlib import Path

import numpy as np
import pytest
import rasterio
from rasterio.transform import from_origin

SIZE = 64
CRS = "EPSG:4326"
ORIGIN_LON = 90.0
ORIGIN_LAT = 26.0
PIXEL_DEG = 0.001


def _write_raster(path: Path, count: int, size: int, crs: str, transform, dtype="float32") -> None:
    rng = np.random.default_rng(0)
    data = rng.uniform(0, 1, size=(count, size, size)).astype(dtype)
    with rasterio.open(
        path, "w", driver="GTiff", height=size, width=size, count=count, crs=crs, transform=transform, dtype=dtype
    ) as dst:
        dst.write(data)


@pytest.fixture
def aligned_scene(tmp_path: Path) -> dict[str, str]:
    transform = from_origin(ORIGIN_LON, ORIGIN_LAT, PIXEL_DEG, PIXEL_DEG)
    sentinel = tmp_path / "sentinel.tif"
    slope = tmp_path / "slope.tif"
    dem = tmp_path / "dem.tif"
    _write_raster(sentinel, 12, SIZE, CRS, transform)
    _write_raster(slope, 1, SIZE, CRS, transform)
    _write_raster(dem, 1, SIZE, CRS, transform)
    return {"sentinel": str(sentinel), "slope": str(slope), "dem": str(dem)}


@pytest.fixture
def wrong_band_count_scene(tmp_path: Path) -> dict[str, str]:
    transform = from_origin(ORIGIN_LON, ORIGIN_LAT, PIXEL_DEG, PIXEL_DEG)
    sentinel = tmp_path / "sentinel.tif"
    slope = tmp_path / "slope.tif"
    dem = tmp_path / "dem.tif"
    _write_raster(sentinel, 10, SIZE, CRS, transform)  # wrong: should be 12
    _write_raster(slope, 1, SIZE, CRS, transform)
    _write_raster(dem, 1, SIZE, CRS, transform)
    return {"sentinel": str(sentinel), "slope": str(slope), "dem": str(dem)}


@pytest.fixture
def crs_mismatch_scene(tmp_path: Path) -> dict[str, str]:
    transform = from_origin(ORIGIN_LON, ORIGIN_LAT, PIXEL_DEG, PIXEL_DEG)
    sentinel = tmp_path / "sentinel.tif"
    slope = tmp_path / "slope.tif"
    dem = tmp_path / "dem.tif"
    _write_raster(sentinel, 12, SIZE, CRS, transform)
    _write_raster(slope, 1, SIZE, "EPSG:3857", transform)  # wrong CRS
    _write_raster(dem, 1, SIZE, CRS, transform)
    return {"sentinel": str(sentinel), "slope": str(slope), "dem": str(dem)}


@pytest.fixture
def misaligned_scene(tmp_path: Path) -> dict[str, str]:
    transform = from_origin(ORIGIN_LON, ORIGIN_LAT, PIXEL_DEG, PIXEL_DEG)
    shifted_transform = from_origin(ORIGIN_LON + 0.05, ORIGIN_LAT, PIXEL_DEG, PIXEL_DEG)
    sentinel = tmp_path / "sentinel.tif"
    slope = tmp_path / "slope.tif"
    dem = tmp_path / "dem.tif"
    _write_raster(sentinel, 12, SIZE, CRS, transform)
    _write_raster(slope, 1, SIZE, CRS, shifted_transform)  # wrong: shifted extent
    _write_raster(dem, 1, SIZE, CRS, transform)
    return {"sentinel": str(sentinel), "slope": str(slope), "dem": str(dem)}
