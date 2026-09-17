"""Strict validation of the 14-channel input (12 Sentinel-2 bands + Slope +
DEM) before any preprocessing or inference runs. Never continues silently on
invalid data — every failure raises a `LandslideValidationError` carrying one
of the documented error codes so the API/frontend can show a specific,
actionable message instead of a stack trace.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

import rasterio
from rasterio.io import DatasetReader

from nershield_ml.landslide4sense.config import CHANNEL_ORDER

ErrorCode = Literal[
    "INVALID_BAND_COUNT",
    "MISSING_BAND",
    "MISSING_DEM",
    "MISSING_SLOPE",
    "CRS_MISMATCH",
    "RESOLUTION_MISMATCH",
    "EXTENT_MISMATCH",
    "INVALID_RASTER",
    "UNSUPPORTED_FORMAT",
    "EMPTY_RASTER",
]


class LandslideValidationError(ValueError):
    def __init__(self, code: ErrorCode, message: str):
        self.code = code
        super().__init__(message)


# Sentinel-2 bands come as one 12-band raster (band order = B1..B12, the
# competition's own convention) plus two single-band rasters (Slope, DEM).
REQUIRED_SENTINEL_BANDS = 12


@dataclass
class ValidatedInput:
    sentinel: DatasetReader
    slope: DatasetReader
    dem: DatasetReader
    width: int
    height: int
    crs: str
    transform: rasterio.Affine
    resolution: tuple[float, float]


def _open_raster(path: str, label: str) -> DatasetReader:
    try:
        ds = rasterio.open(path)
    except rasterio.errors.RasterioIOError as exc:
        raise LandslideValidationError(
            "INVALID_RASTER", f"{label} could not be read as a raster: {exc}"
        ) from exc
    if ds.driver not in {"GTiff", "COG", "HDF5"}:
        raise LandslideValidationError(
            "UNSUPPORTED_FORMAT",
            f"{label} is a '{ds.driver}' file — expected GeoTIFF (or a COG).",
        )
    if ds.width == 0 or ds.height == 0:
        raise LandslideValidationError("EMPTY_RASTER", f"{label} has zero-size dimensions.")
    return ds


def validate_inputs(sentinel_path: str, slope_path: str, dem_path: str) -> ValidatedInput:
    """Opens and cross-validates the three source rasters. Raises
    `LandslideValidationError` on the first problem found; never returns a
    partially-valid result.
    """
    sentinel = _open_raster(sentinel_path, "Sentinel-2 composite")
    slope = _open_raster(slope_path, "Slope raster")
    dem = _open_raster(dem_path, "DEM raster")

    if sentinel.count != REQUIRED_SENTINEL_BANDS:
        raise LandslideValidationError(
            "INVALID_BAND_COUNT",
            f"Sentinel-2 composite has {sentinel.count} bands, expected "
            f"{REQUIRED_SENTINEL_BANDS} (B1-B12).",
        )
    if slope.count != 1:
        raise LandslideValidationError(
            "MISSING_SLOPE", f"Slope raster must be single-band, got {slope.count} bands."
        )
    if dem.count != 1:
        raise LandslideValidationError(
            "MISSING_DEM", f"DEM raster must be single-band, got {dem.count} bands."
        )

    if sentinel.crs is None or slope.crs is None or dem.crs is None:
        raise LandslideValidationError(
            "CRS_MISMATCH", "One or more inputs has no CRS defined — cannot georeference results."
        )
    if not (sentinel.crs == slope.crs == dem.crs):
        raise LandslideValidationError(
            "CRS_MISMATCH",
            f"CRS mismatch: sentinel={sentinel.crs}, slope={slope.crs}, dem={dem.crs}. "
            "All three inputs must share a CRS (reproject before upload).",
        )

    # Resolution: allow tiny float drift (<1%) from resampling, reject anything larger.
    res_s, res_sl, res_d = sentinel.res, slope.res, dem.res
    def _close(a: float, b: float) -> bool:
        return abs(a - b) <= 0.01 * max(abs(a), abs(b), 1e-9)

    if not (_close(res_s[0], res_sl[0]) and _close(res_s[1], res_sl[1])):
        raise LandslideValidationError(
            "RESOLUTION_MISMATCH", f"Slope resolution {res_sl} does not match Sentinel-2 {res_s}."
        )
    if not (_close(res_s[0], res_d[0]) and _close(res_s[1], res_d[1])):
        raise LandslideValidationError(
            "RESOLUTION_MISMATCH", f"DEM resolution {res_d} does not match Sentinel-2 {res_s}."
        )

    if sentinel.width != slope.width or sentinel.height != slope.height:
        raise LandslideValidationError(
            "EXTENT_MISMATCH",
            f"Slope raster is {slope.width}x{slope.height}px, expected "
            f"{sentinel.width}x{sentinel.height}px (same grid as the Sentinel-2 composite).",
        )
    if sentinel.width != dem.width or sentinel.height != dem.height:
        raise LandslideValidationError(
            "EXTENT_MISMATCH",
            f"DEM raster is {dem.width}x{dem.height}px, expected "
            f"{sentinel.width}x{sentinel.height}px (same grid as the Sentinel-2 composite).",
        )
    if not sentinel.transform.almost_equals(slope.transform) or not sentinel.transform.almost_equals(
        dem.transform
    ):
        raise LandslideValidationError(
            "EXTENT_MISMATCH",
            "Sentinel-2, Slope and DEM rasters are not spatially aligned "
            "(different geotransform) — reproject/resample them onto one common grid first.",
        )

    if sentinel.width < 32 or sentinel.height < 32:
        raise LandslideValidationError(
            "INVALID_RASTER",
            f"Scene is {sentinel.width}x{sentinel.height}px — too small to tile meaningfully.",
        )

    assert len(CHANNEL_ORDER) == REQUIRED_SENTINEL_BANDS + 2  # 12 bands + Slope + DEM

    return ValidatedInput(
        sentinel=sentinel,
        slope=slope,
        dem=dem,
        width=sentinel.width,
        height=sentinel.height,
        crs=str(sentinel.crs),
        transform=sentinel.transform,
        resolution=res_s,
    )
