"""Real-inference regression test — runs the actual trained checkpoint
(models/landslide/landslide4sense_unet.pt, if present) against a REAL,
labeled Landslide4Sense validation-split patch (fixtures/real_patch_image_10.h5
+ real_patch_mask_10.h5, copied from the official ValidData split; NOT the
synthetic scene demo_data.py generates for the UI's "Run Demo Analysis"
button).

The checkpoint itself is large (~66MB) and gitignored (see models/.gitignore
comment / README) — it is NOT committed to this repo, so this test is a
regression guard for whoever trains and places a checkpoint locally, and
SKIPS (not fails) when no checkpoint is present, e.g. in CI or a fresh clone.
This mirrors how other real-model tests in this codebase handle an optional
local artifact — see ml-service/README's northeast_rainfall section.
"""

from __future__ import annotations

from pathlib import Path

import h5py
import numpy as np
import pytest
import torch

from nershield_ml.landslide4sense.config import CHANNEL_MEAN, CHANNEL_STD, LandslideSettings
from nershield_ml.landslide4sense.model.registry import LandslideModelRegistry

FIXTURES = Path(__file__).parent / "fixtures"
CHECKPOINT_PATH = Path(__file__).parent.parent.parent / "models" / "landslide" / "landslide4sense_unet.pt"

pytestmark = pytest.mark.skipif(
    not CHECKPOINT_PATH.exists(),
    reason=(
        "No trained checkpoint at models/landslide/landslide4sense_unet.pt — "
        "gitignored, not present in a fresh clone/CI. Train one with "
        "scripts/train_landslide4sense.py to exercise this test."
    ),
)


@pytest.fixture
def real_registry() -> LandslideModelRegistry:
    settings = LandslideSettings(inference_mode="real", model_path=CHECKPOINT_PATH, device="cpu")
    registry = LandslideModelRegistry(settings)
    registry.load()
    return registry


def test_checkpoint_loads_successfully(real_registry: LandslideModelRegistry):
    assert real_registry.is_loaded is True
    assert real_registry.load_error is None
    assert real_registry.current.device == "cpu"


def test_real_inference_on_real_validation_patch_detects_true_landslide_pixels(
    real_registry: LandslideModelRegistry,
):
    """Not a demo/synthetic check — this is a real, official, labeled
    Landslide4Sense ValidData patch with a genuine landslide mask. Asserts
    the model's output probability is meaningfully higher at the true
    landslide pixels than at background, i.e. it learned a real signal
    rather than producing noise or a constant field.
    """
    with h5py.File(FIXTURES / "real_patch_image_10.h5", "r") as f:
        img = f["img"][:].astype(np.float32)  # (128, 128, 14)
    with h5py.File(FIXTURES / "real_patch_mask_10.h5", "r") as f:
        mask = f["mask"][:].astype(np.int64)  # (128, 128)

    assert mask.sum() > 0, "fixture must contain at least one real landslide pixel"

    mean = np.asarray(CHANNEL_MEAN, dtype=np.float32).reshape(14, 1, 1)
    std = np.asarray(CHANNEL_STD, dtype=np.float32).reshape(14, 1, 1)
    x = img.transpose(2, 0, 1)
    x = (x - mean) / std
    tensor = torch.from_numpy(x).unsqueeze(0)

    model = real_registry.current.model
    with torch.no_grad():
        logits = model(tensor)
        probs = torch.softmax(logits, dim=1)[0, 1, :, :].numpy()

    mean_prob_at_landslide = float(probs[mask == 1].mean())
    mean_prob_at_background = float(probs[mask == 0].mean())

    # Regression guard, not a claim of production-grade accuracy: the model
    # must separate the two classes by a wide margin on this known-positive
    # sample. Measured at training time: ~0.7-0.96 at true pixels vs ~0.13
    # background mean; a wide, forgiving margin (0.3) is used here so the
    # test tolerates re-training producing a different (but still real)
    # checkpoint without becoming flaky.
    assert mean_prob_at_landslide > mean_prob_at_background + 0.3

    preds = (probs >= 0.5).astype(np.int64)
    tp = int(((preds == 1) & (mask == 1)).sum())
    recall = tp / int(mask.sum())
    assert recall > 0.5  # weak-but-real: measured ~0.97 on this sample at training time
