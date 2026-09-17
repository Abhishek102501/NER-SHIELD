"""Loads the Landslide4Sense U-Net once (at API startup, mirroring
`inference.model_registry.ModelRegistry`'s pattern for the XGBoost model) and
holds it in memory. Inference requests never touch the filesystem.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass

import torch

from nershield_ml.landslide4sense.config import LandslideSettings
from nershield_ml.landslide4sense.model.unet import unet

logger = logging.getLogger("nershield_ml.landslide4sense")

MODEL_NAME = "Landslide4Sense"
MODEL_VERSION = "baseline-unet"


class CheckpointError(RuntimeError):
    """Checkpoint missing, unreadable, or incompatible with the model architecture."""


def _validate_state_dict_shapes(model: torch.nn.Module, state_dict: dict) -> None:
    """Explicit key/shape check before `load_state_dict`, so a mismatched
    checkpoint fails with a clear message naming the offending tensor rather
    than PyTorch's own (still-correct, but less specific) RuntimeError.
    """
    model_keys = set(model.state_dict().keys())
    ckpt_keys = set(state_dict.keys())
    missing = model_keys - ckpt_keys
    unexpected = ckpt_keys - model_keys
    if missing:
        raise CheckpointError(f"Checkpoint is missing {len(missing)} expected tensor(s), e.g. {sorted(missing)[:3]}")
    if unexpected:
        raise CheckpointError(
            f"Checkpoint has {len(unexpected)} unexpected tensor(s) not in this architecture, "
            f"e.g. {sorted(unexpected)[:3]}"
        )
    for key, model_tensor in model.state_dict().items():
        ckpt_tensor = state_dict[key]
        if tuple(model_tensor.shape) != tuple(ckpt_tensor.shape):
            raise CheckpointError(
                f"Shape mismatch for '{key}': checkpoint has {tuple(ckpt_tensor.shape)}, "
                f"model expects {tuple(model_tensor.shape)}"
            )


def _validate_forward_pass(model: torch.nn.Module, device: str) -> None:
    """One dummy (1, 14, 128, 128) forward pass to prove the loaded weights
    actually run inference end-to-end, not just that the state dict matched
    key-for-key. Failure here means the checkpoint loaded but is otherwise
    broken (e.g. a dtype issue) — caught by the caller like any other
    load-time problem.
    """
    dummy = torch.zeros(1, 14, 128, 128, dtype=torch.float32, device=device)
    with torch.no_grad():
        output = model(dummy)
    if tuple(output.shape) != (1, 2, 128, 128):
        raise CheckpointError(f"Forward pass produced shape {tuple(output.shape)}, expected (1, 2, 128, 128)")


def resolve_device(requested: str) -> str:
    if requested == "auto":
        return "cuda" if torch.cuda.is_available() else "cpu"
    if requested == "cuda" and not torch.cuda.is_available():
        logger.warning("LANDSLIDE_DEVICE=cuda requested but no CUDA device is available; using cpu.")
        return "cpu"
    return requested


@dataclass
class LoadedLandslideModel:
    model: torch.nn.Module
    device: str
    checkpoint_path: str


class LandslideModelRegistry:
    """Holds at most one loaded model. `load()` is called once from the
    FastAPI lifespan; a missing/invalid checkpoint is a normal, reportable
    state (`is_loaded == False`), never a crash and never a fabricated
    "loaded" status.
    """

    def __init__(self, settings: LandslideSettings):
        self.settings = settings
        self._loaded: LoadedLandslideModel | None = None
        self._load_error: str | None = None

    @property
    def is_loaded(self) -> bool:
        return self._loaded is not None

    @property
    def load_error(self) -> str | None:
        return self._load_error

    @property
    def current(self) -> LoadedLandslideModel:
        if self._loaded is None:
            raise CheckpointError(self._load_error or "Landslide4Sense model is not loaded.")
        return self._loaded

    def load(self) -> None:
        if self.settings.inference_mode == "mock":
            self._loaded = None
            self._load_error = "LANDSLIDE_INFERENCE_MODE=mock — real model intentionally not loaded."
            return

        if self.settings.model_path is None:
            self._loaded = None
            self._load_error = "LANDSLIDE_MODEL_PATH is not set."
            return

        if not self.settings.model_path.exists():
            self._loaded = None
            self._load_error = f"Checkpoint not found at configured LANDSLIDE_MODEL_PATH."
            return

        device = resolve_device(self.settings.device)
        try:
            model = unet(n_classes=2, n_channels=14)
            state_dict = torch.load(self.settings.model_path, map_location=device)
            _validate_state_dict_shapes(model, state_dict)
            model.load_state_dict(state_dict)
            model.to(device)
            model.eval()
            _validate_forward_pass(model, device)
        except Exception as exc:  # noqa: BLE001 - surfaced via load_error, not raised
            self._loaded = None
            self._load_error = f"Checkpoint failed to load: {exc.__class__.__name__}: {exc}"
            logger.exception("Failed to load Landslide4Sense checkpoint")
            return

        self._loaded = LoadedLandslideModel(
            model=model, device=device, checkpoint_path=str(self.settings.model_path)
        )
        self._load_error = None
        logger.info("Loaded Landslide4Sense checkpoint on device=%s", device)

    def reload(self) -> None:
        self.load()
