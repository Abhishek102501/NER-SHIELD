"""Configuration for the Landslide4Sense module — read once from environment
/ .env, same convention as `nershield_ml.config.Settings`. No machine-specific
paths hard-coded anywhere; everything below has an environment variable.
"""

from __future__ import annotations

from pathlib import Path
from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict

# Official channel order — see model/README references to
# dataset/landslide_dataset.py in the upstream repo. All 14 channels must be
# stacked in exactly this order for the mean/std normalization to be valid.
CHANNEL_ORDER: list[str] = [
    "B1", "B2", "B3", "B4", "B5", "B6", "B7",
    "B8", "B9", "B10", "B11", "B12", "SLOPE", "DEM",
]
NUM_CHANNELS = len(CHANNEL_ORDER)

# Exact per-channel mean/std published in the official
# dataset/landslide_dataset.py (LandslideDataSet.__init__). Never invented —
# copied verbatim from the upstream MIT-licensed source.
CHANNEL_MEAN: list[float] = [
    -0.4914, -0.3074, -0.1277, -0.0625, 0.0439, 0.0803, 0.0644,
    0.0802, 0.3000, 0.4082, 0.0823, 0.0516, 0.3338, 0.7819,
]
CHANNEL_STD: list[float] = [
    0.9325, 0.8775, 0.8860, 0.8869, 0.8857, 0.8418, 0.8354,
    0.8491, 0.9061, 1.6072, 0.8848, 0.9232, 0.9018, 1.2913,
]


class LandslideSettings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_prefix="landslide_", extra="ignore")

    # Path to a .pth checkpoint compatible with model/unet.py's `unet(n_classes=2,
    # n_channels=14)`. Not shipped in this repo — see landslide4sense/README.md.
    model_path: Path | None = None

    # "auto" picks cuda when torch.cuda.is_available(), else cpu.
    device: Literal["auto", "cpu", "cuda"] = "auto"

    # Probability threshold on the softmax "landslide" class (index 1) used to
    # binarize the mask. 0.5 reproduces the official Predict.py's argmax
    # behaviour exactly (two-class argmax == prob[1] > 0.5).
    threshold: float = 0.5

    patch_size: int = 128
    # Overlap (pixels) between adjacent tiles for large-scene inference —
    # overlapping predictions are averaged during reconstruction.
    patch_overlap: int = 16
    batch_size: int = 8

    # "real" runs the actual PyTorch model. "mock" runs the full validation /
    # preprocessing / tiling / postprocessing pipeline but substitutes a
    # deterministic, clearly-labeled synthetic probability field instead of a
    # forward pass — for demo/dev environments with no checkpoint available.
    # Never presented to the user as a real prediction (see schemas.py).
    inference_mode: Literal["real", "mock"] = "mock"

    # Minimum polygon area (m²) kept after polygonization — removes
    # single/few-pixel noise detections.
    min_polygon_area_m2: float = 500.0

    # Douglas-Peucker simplification tolerance in degrees (WGS84 output CRS).
    # Kept small deliberately — see postprocessing.py for why.
    simplify_tolerance_deg: float = 0.00005

    # Severity thresholds — configurable, not an official hazard standard.
    # See inference/postprocessing.py `classify_severity`.
    severity_area_km2_high: float = 0.05
    severity_area_km2_critical: float = 0.2
    severity_confidence_high: float = 0.75
    severity_confidence_critical: float = 0.9


landslide_settings = LandslideSettings()
