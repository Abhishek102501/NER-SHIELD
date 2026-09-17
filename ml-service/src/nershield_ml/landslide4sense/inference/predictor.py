"""Runs the tiled forward pass — real (PyTorch) or mock — and returns a
full-scene landslide-probability raster. This is the one place a "mock"
substitution is allowed, and it is always explicit: callers get back which
mode actually ran, and the mock path is a deterministic function of the real
input (slope + local texture), never `random()`, so it's at least mechanically
exercising the same downstream pipeline (thresholding, polygonization, area
calc) with a believable-shaped field instead of noise.
"""

from __future__ import annotations

import logging
from typing import Literal

import numpy as np

from nershield_ml.landslide4sense.config import CHANNEL_ORDER, LandslideSettings
from nershield_ml.landslide4sense.inference.tiling import make_tiles, reconstruct
from nershield_ml.landslide4sense.model.registry import LandslideModelRegistry

logger = logging.getLogger("nershield_ml.landslide4sense")

InferenceMode = Literal["real", "mock"]

SLOPE_CHANNEL_INDEX = CHANNEL_ORDER.index("SLOPE")


def _run_real_batch(model, device, batch: np.ndarray) -> np.ndarray:
    """`batch` is (N, 14, patch, patch) already normalized. Returns (N, patch,
    patch) landslide-class (index 1) softmax probability, matching the
    official Predict.py's `softmax(pred, dim=1)` exactly.
    """
    import torch  # local import: keeps torch out of the mock-mode/test-only import path

    with torch.no_grad():
        tensor = torch.from_numpy(batch).to(device)
        logits = model(tensor)
        probs = torch.softmax(logits, dim=1)[:, 1, :, :]
    return probs.cpu().numpy()


def _run_mock_batch(batch: np.ndarray) -> np.ndarray:
    """Deterministic, clearly-labeled stand-in for the model — NOT a real
    prediction. Derives a probability field from the (already normalized)
    slope channel: steeper + more textured patches score higher, which is at
    least directionally sane for exercising the rest of the pipeline, and is
    fully reproducible (no randomness) rather than fabricated per-run noise.
    """
    slope = batch[:, SLOPE_CHANNEL_INDEX, :, :]
    # Normalize each tile's slope into [0, 1] before combining with texture,
    # so results are stable regardless of the input scene's actual slope range.
    tile_min = slope.min(axis=(1, 2), keepdims=True)
    tile_max = slope.max(axis=(1, 2), keepdims=True)
    span = np.clip(tile_max - tile_min, 1e-6, None)
    slope_norm = (slope - tile_min) / span
    # Local texture (gradient magnitude) as a second, still-deterministic factor.
    gy, gx = np.gradient(slope, axis=(1, 2))
    texture = np.clip(np.sqrt(gy**2 + gx**2), 0, 3) / 3
    probs = np.clip(0.6 * slope_norm + 0.4 * texture, 0.0, 1.0)
    return probs.astype(np.float32)


def predict_probability(
    array: np.ndarray,
    settings: LandslideSettings,
    registry: LandslideModelRegistry,
) -> tuple[np.ndarray, InferenceMode]:
    """`array` is (14, H, W), already preprocessed/normalized. Returns
    (probability_raster (H, W) float32 in [0,1], mode actually used).
    """
    height, width = array.shape[1], array.shape[2]
    tiles = make_tiles(array, settings.patch_size, settings.patch_overlap)

    mode: InferenceMode = "real" if registry.is_loaded else "mock"
    if settings.inference_mode == "mock":
        mode = "mock"
    elif settings.inference_mode == "real" and not registry.is_loaded:
        # Explicit real mode requested but no checkpoint — this is a hard
        # failure, not a silent fallback (see section 39: never fake a "real"
        # result). Callers (predictor orchestration) must check for this.
        raise RuntimeError(
            "LANDSLIDE_INFERENCE_MODE=real but no checkpoint is loaded — "
            f"reason: {registry.load_error}"
        )

    predictions: list[tuple] = []
    batch_size = max(1, settings.batch_size)
    for start in range(0, len(tiles), batch_size):
        batch_tiles = tiles[start : start + batch_size]
        batch = np.stack([t.array for t in batch_tiles], axis=0)

        if mode == "real":
            loaded = registry.current
            probs = _run_real_batch(loaded.model, loaded.device, batch)
        else:
            probs = _run_mock_batch(batch)

        for tile, prob in zip(batch_tiles, probs):
            predictions.append((tile, prob))

    probability = reconstruct(predictions, height, width, settings.patch_size)
    return probability, mode
