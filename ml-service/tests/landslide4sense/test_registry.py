"""Tests for LandslideModelRegistry checkpoint loading/validation. Every
LandslideSettings() construction here passes every mode-relevant field
explicitly (inference_mode, model_path, device) rather than relying on class
defaults — once a real ml-service/.env sets LANDSLIDE_INFERENCE_MODE=real,
BaseSettings would otherwise silently pick that up for any field not passed
explicitly, breaking the isolation these tests need (same gotcha hit and
documented for NortheastRainfallSettings)."""

from __future__ import annotations

from pathlib import Path

import torch

from nershield_ml.landslide4sense.config import LandslideSettings
from nershield_ml.landslide4sense.model.registry import LandslideModelRegistry
from nershield_ml.landslide4sense.model.unet import unet


def test_mock_mode_never_loads_a_model():
    settings = LandslideSettings(inference_mode="mock", model_path=None, device="cpu")
    registry = LandslideModelRegistry(settings)
    registry.load()
    assert registry.is_loaded is False
    assert "mock" in registry.load_error.lower()


def test_real_mode_without_model_path_reports_clear_error():
    settings = LandslideSettings(inference_mode="real", model_path=None, device="cpu")
    registry = LandslideModelRegistry(settings)
    registry.load()
    assert registry.is_loaded is False
    assert "LANDSLIDE_MODEL_PATH" in registry.load_error


def test_real_mode_with_missing_file_reports_clear_error(tmp_path: Path):
    missing = tmp_path / "does_not_exist.pt"
    settings = LandslideSettings(inference_mode="real", model_path=missing, device="cpu")
    registry = LandslideModelRegistry(settings)
    registry.load()
    assert registry.is_loaded is False
    assert "not found" in registry.load_error.lower()


def test_real_mode_with_wrong_shaped_checkpoint_fails_clearly(tmp_path: Path):
    # A checkpoint for a *different* n_channels — same class, incompatible shapes.
    wrong_model = unet(n_classes=2, n_channels=3)
    bad_ckpt = tmp_path / "wrong_shape.pt"
    torch.save(wrong_model.state_dict(), bad_ckpt)

    settings = LandslideSettings(inference_mode="real", model_path=bad_ckpt, device="cpu")
    registry = LandslideModelRegistry(settings)
    registry.load()
    assert registry.is_loaded is False
    assert "checkpoint failed to load" in registry.load_error.lower()


def test_real_mode_with_garbage_file_fails_clearly(tmp_path: Path):
    garbage = tmp_path / "garbage.pt"
    garbage.write_bytes(b"not a real checkpoint")

    settings = LandslideSettings(inference_mode="real", model_path=garbage, device="cpu")
    registry = LandslideModelRegistry(settings)
    registry.load()
    assert registry.is_loaded is False
    assert "checkpoint failed to load" in registry.load_error.lower()


def test_real_mode_with_valid_matching_checkpoint_loads(tmp_path: Path):
    # A correctly-shaped (if untrained/random-weight) checkpoint must load
    # and pass the forward-pass sanity check.
    model = unet(n_classes=2, n_channels=14)
    ckpt = tmp_path / "valid.pt"
    torch.save(model.state_dict(), ckpt)

    settings = LandslideSettings(inference_mode="real", model_path=ckpt, device="cpu")
    registry = LandslideModelRegistry(settings)
    registry.load()
    assert registry.is_loaded is True
    assert registry.load_error is None
    assert registry.current.device == "cpu"
