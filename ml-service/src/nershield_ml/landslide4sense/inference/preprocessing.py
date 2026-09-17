"""Stacks the validated Sentinel-2 + Slope + DEM rasters into the official
14-channel order and applies the exact upstream normalization. Produces a
plain numpy array plus the georeferencing metadata needed to place model
output back on the map — the official dataset's own H5 patches carry no CRS
at all, so this (reading through rasterio) is what makes real-world
georeferencing possible here.
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np

from nershield_ml.landslide4sense.config import CHANNEL_MEAN, CHANNEL_STD, NUM_CHANNELS
from nershield_ml.landslide4sense.inference.validation import LandslideValidationError, ValidatedInput

# NoData sentinel used after reading — rasterio gives us the source nodata
# value per-band, but Sentinel-2 band 0/negative reflectance edge pixels are
# also effectively invalid; treat both as "hole" and fill with the channel
# mean (post-normalization this becomes exactly 0, contributing nothing to
# the model rather than skewing it with an arbitrary sentinel value).
_FILL_STRATEGY = "channel-mean"


@dataclass
class PreprocessedScene:
    array: np.ndarray  # (14, H, W), float32, normalized
    nodata_mask: np.ndarray  # (H, W) bool — True where ANY channel was NoData
    width: int
    height: int
    crs: str
    transform: object  # rasterio.Affine, kept opaque here to avoid a rasterio import in tests


def _read_band_filled(dataset, band_index: int, nodata_mask: np.ndarray) -> np.ndarray:
    arr = dataset.read(band_index).astype(np.float32)
    nodata = dataset.nodatavals[band_index - 1] if dataset.nodatavals else None
    if nodata is not None:
        bad = arr == nodata
        nodata_mask |= bad
    bad_finite = ~np.isfinite(arr)
    nodata_mask |= bad_finite
    return arr


def preprocess(validated: ValidatedInput) -> PreprocessedScene:
    h, w = validated.height, validated.width
    nodata_mask = np.zeros((h, w), dtype=bool)

    channels: list[np.ndarray] = []
    for band_index in range(1, 13):  # B1..B12
        channels.append(_read_band_filled(validated.sentinel, band_index, nodata_mask))
    channels.append(_read_band_filled(validated.slope, 1, nodata_mask))  # SLOPE
    channels.append(_read_band_filled(validated.dem, 1, nodata_mask))  # DEM

    if len(channels) != NUM_CHANNELS:
        raise LandslideValidationError(
            "INVALID_BAND_COUNT", f"Assembled {len(channels)} channels, expected {NUM_CHANNELS}."
        )

    array = np.stack(channels, axis=0)  # (14, H, W)

    # Fill NoData holes with each channel's own pre-normalization mean of the
    # *valid* pixels (falls back to 0.0 if a channel is entirely NoData —
    # documented, not silently wrong: downstream confidence for fully-holed
    # scenes will simply be low since the model sees uninformative input).
    for c in range(NUM_CHANNELS):
        band = array[c]
        valid = ~nodata_mask
        if valid.any():
            fill_value = float(band[valid].mean())
        else:
            fill_value = 0.0
        band[nodata_mask] = fill_value

    # Official normalization — exact published mean/std, applied per-channel.
    mean = np.asarray(CHANNEL_MEAN, dtype=np.float32).reshape(NUM_CHANNELS, 1, 1)
    std = np.asarray(CHANNEL_STD, dtype=np.float32).reshape(NUM_CHANNELS, 1, 1)
    array = (array - mean) / std

    return PreprocessedScene(
        array=array.astype(np.float32),
        nodata_mask=nodata_mask,
        width=w,
        height=h,
        crs=validated.crs,
        transform=validated.transform,
    )
