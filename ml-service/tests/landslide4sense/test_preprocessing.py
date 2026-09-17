import numpy as np

from nershield_ml.landslide4sense.config import CHANNEL_MEAN, CHANNEL_STD, NUM_CHANNELS
from nershield_ml.landslide4sense.inference.preprocessing import preprocess
from nershield_ml.landslide4sense.inference.validation import validate_inputs


def test_preprocess_shape_and_channel_count(aligned_scene):
    validated = validate_inputs(aligned_scene["sentinel"], aligned_scene["slope"], aligned_scene["dem"])
    scene = preprocess(validated)
    assert scene.array.shape == (NUM_CHANNELS, 64, 64)
    assert NUM_CHANNELS == 14


def test_preprocess_applies_official_normalization(aligned_scene):
    validated = validate_inputs(aligned_scene["sentinel"], aligned_scene["slope"], aligned_scene["dem"])
    scene = preprocess(validated)
    # Raw source pixels are uniform(0, 1); after (x - mean) / std each channel's
    # values should sit near (0.5 - mean[c]) / std[c], confirming the exact
    # per-channel constants were actually applied (not swapped/omitted).
    for c in range(NUM_CHANNELS):
        expected_center = (0.5 - CHANNEL_MEAN[c]) / CHANNEL_STD[c]
        assert abs(float(np.mean(scene.array[c])) - expected_center) < 0.15


def test_preprocess_preserves_georeferencing(aligned_scene):
    validated = validate_inputs(aligned_scene["sentinel"], aligned_scene["slope"], aligned_scene["dem"])
    scene = preprocess(validated)
    assert scene.transform == validated.transform
    assert str(scene.crs) == validated.crs
    assert scene.width == validated.width
    assert scene.height == validated.height
