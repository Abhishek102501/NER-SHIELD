"""Sentinel-2 + terrain features for the landslide susceptibility model.

Band layout follows the Landslide4Sense 2022 benchmark exactly
(github.com/iarai/Landslide4Sense-2022): 14 bands per pixel, Sentinel-2
B1-B12 plus ALOS PALSAR slope (B13) and DEM (B14), all resampled to ~10 m.

``L4S_MEAN`` / ``L4S_STD`` are the per-band statistics published with the
benchmark's own dataloader.  They are reproduced here so a model trained on the
official split and a model trained on North East imagery are normalised
identically -- otherwise the two are not comparable and a benchmark-pretrained
model cannot be applied to new tiles.

A CNN learns its own band combinations.  A tree cannot form ratios between
columns, so the standard spectral indices have to be computed explicitly -- and
those indices are exactly what distinguishes fresh landslide scars: bare soil
where vegetation was, with high brightness and low NDVI, on steep ground.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, List, Optional, Sequence, Tuple

import numpy as np

BAND_NAMES: Tuple[str, ...] = (
    "B1_coastal", "B2_blue", "B3_green", "B4_red",
    "B5_rededge1", "B6_rededge2", "B7_rededge3", "B8_nir",
    "B9_watervapour", "B10_cirrus", "B11_swir1", "B12_swir2",
    "B13_slope", "B14_dem",
)

# Published with the Landslide4Sense baseline dataloader.
L4S_MEAN: Tuple[float, ...] = (
    -0.4914, -0.3074, -0.1277, -0.0625, 0.0439, 0.0803, 0.0644,
    0.0802, 0.3000, 0.4082, 0.0823, 0.0516, 0.3338, 0.7819,
)
L4S_STD: Tuple[float, ...] = (
    0.9325, 0.8775, 0.8860, 0.8869, 0.8857, 0.8418, 0.8354,
    0.8491, 0.9061, 1.6072, 0.8848, 0.9232, 0.9018, 1.2913,
)

_EPS = 1e-6

# Index positions into the 14-band stack.
_B = {name.split("_")[0]: i for i, name in enumerate(BAND_NAMES)}


def _ratio(a: np.ndarray, b: np.ndarray) -> np.ndarray:
    """Normalised difference, guarded against a zero denominator."""
    return (a - b) / (a + b + _EPS)


def spectral_indices(bands: np.ndarray) -> Tuple[np.ndarray, List[str]]:
    """Derive indices from a ``(n_pixels, 14)`` band matrix.

    Returns ``(indices, names)``.  Input may be raw or normalised; the indices
    are ratios, so normalisation shifts them but preserves their ordering and
    therefore every split a tree would make.
    """
    b = np.asarray(bands, dtype=np.float32)
    if b.ndim != 2 or b.shape[1] != len(BAND_NAMES):
        raise ValueError(f"expected (n_pixels, 14), got {b.shape}")

    blue, green, red = b[:, _B["B2"]], b[:, _B["B3"]], b[:, _B["B4"]]
    nir, swir1, swir2 = b[:, _B["B8"]], b[:, _B["B11"]], b[:, _B["B12"]]
    re1 = b[:, _B["B5"]]
    slope, dem = b[:, _B["B13"]], b[:, _B["B14"]]

    cols: Dict[str, np.ndarray] = {
        # Vegetation loss is the primary scar signal.
        "NDVI": _ratio(nir, red),
        "NDWI": _ratio(green, nir),
        "NDMI": _ratio(nir, swir1),
        # Bare soil index -- exposed regolith in a fresh scar.
        "BSI": _ratio(swir1 + red, nir + blue),
        # Overall reflectance; scars are brighter than the canopy they replaced.
        "brightness": np.sqrt(
            np.clip(red ** 2 + green ** 2 + blue ** 2, 0.0, None) / 3.0
        ),
        "SAVI": 1.5 * (nir - red) / (nir + red + 0.5 + _EPS),
        "rededge_ndvi": _ratio(nir, re1),
        "swir_ratio": swir1 / (swir2 + _EPS),
        # Terrain interactions: a tree splits far better on these products than
        # on slope and index separately.
        "slope_x_bsi": slope * _ratio(swir1 + red, nir + blue),
        "slope_x_ndvi": slope * _ratio(nir, red),
        "dem_x_slope": dem * slope,
    }
    names = list(cols)
    return np.stack([cols[k] for k in names], axis=1).astype(np.float32), names


@dataclass
class SpectralFeatureBuilder:
    """14 bands -> bands + indices (+ optional neighbourhood texture).

    ``normalise`` applies the benchmark's per-band statistics.  Leave it on
    whenever the model may be shared with, or compared against, a
    Landslide4Sense-trained baseline.
    """

    normalise: bool = True
    include_indices: bool = True
    include_texture: bool = False
    _names: Optional[List[str]] = None

    @property
    def feature_names(self) -> List[str]:
        if self._names is None:
            raise RuntimeError("call transform() before reading feature_names")
        return list(self._names)

    def transform(self, bands: np.ndarray) -> np.ndarray:
        b = np.asarray(bands, dtype=np.float32)
        if b.ndim != 2 or b.shape[1] != len(BAND_NAMES):
            raise ValueError(f"expected (n_pixels, 14), got {b.shape}")

        if self.normalise:
            b = (b - np.asarray(L4S_MEAN, dtype=np.float32)) / np.asarray(
                L4S_STD, dtype=np.float32
            )

        parts = [b]
        names = list(BAND_NAMES)
        if self.include_indices:
            idx, idx_names = spectral_indices(b)
            parts.append(idx)
            names.extend(idx_names)

        self._names = names
        return np.concatenate(parts, axis=1).astype(np.float32)

    def transform_patch(
        self, patch: np.ndarray, window: int = 3
    ) -> Tuple[np.ndarray, Tuple[int, int]]:
        """Flatten a ``(14, H, W)`` patch to one row per pixel.

        With ``include_texture`` a local mean over a ``window`` x ``window``
        box is appended per band -- cheap spatial context, which is the main
        thing a per-pixel tree gives up against a segmentation CNN.
        """
        p = np.asarray(patch, dtype=np.float32)
        if p.ndim != 3 or p.shape[0] != len(BAND_NAMES):
            raise ValueError(f"expected (14, H, W), got {p.shape}")
        _, h, w = p.shape
        flat = p.reshape(len(BAND_NAMES), -1).T           # (H*W, 14)
        out = self.transform(flat)

        if self.include_texture:
            sm = _box_mean(p, window)                      # (14, H, W)
            out = np.concatenate([out, sm.reshape(len(BAND_NAMES), -1).T], axis=1)
            self._names = self._names + [f"{n}_mean{window}x{window}" for n in BAND_NAMES]
        return out, (h, w)


def _box_mean(stack: np.ndarray, window: int) -> np.ndarray:
    """Box filter over (C, H, W) via a summed-area table -- no SciPy needed."""
    if window % 2 == 0:
        raise ValueError("window must be odd")
    r = window // 2
    c, h, w = stack.shape
    padded = np.pad(stack, ((0, 0), (r, r), (r, r)), mode="edge")
    cum = padded.cumsum(axis=1).cumsum(axis=2)
    cum = np.pad(cum, ((0, 0), (1, 0), (1, 0)), mode="constant")
    total = (
        cum[:, window:window + h, window:window + w]
        - cum[:, 0:h, window:window + w]
        - cum[:, window:window + h, 0:w]
        + cum[:, 0:h, 0:w]
    )
    return total / float(window * window)
