from nershield_ml.landslide4sense.inference.validation import (
    LandslideValidationError,
    validate_inputs,
)

import pytest


def test_aligned_scene_passes(aligned_scene):
    result = validate_inputs(aligned_scene["sentinel"], aligned_scene["slope"], aligned_scene["dem"])
    assert result.width == 64
    assert result.height == 64
    assert str(result.crs) in ("EPSG:4326", "4326")


def test_wrong_band_count_rejected(wrong_band_count_scene):
    with pytest.raises(LandslideValidationError) as exc:
        validate_inputs(
            wrong_band_count_scene["sentinel"], wrong_band_count_scene["slope"], wrong_band_count_scene["dem"]
        )
    assert exc.value.code == "INVALID_BAND_COUNT"


def test_crs_mismatch_rejected(crs_mismatch_scene):
    with pytest.raises(LandslideValidationError) as exc:
        validate_inputs(crs_mismatch_scene["sentinel"], crs_mismatch_scene["slope"], crs_mismatch_scene["dem"])
    assert exc.value.code == "CRS_MISMATCH"


def test_misaligned_extent_rejected(misaligned_scene):
    with pytest.raises(LandslideValidationError) as exc:
        validate_inputs(misaligned_scene["sentinel"], misaligned_scene["slope"], misaligned_scene["dem"])
    assert exc.value.code == "EXTENT_MISMATCH"


def test_missing_file_rejected(aligned_scene, tmp_path):
    with pytest.raises(LandslideValidationError) as exc:
        validate_inputs(str(tmp_path / "nope.tif"), aligned_scene["slope"], aligned_scene["dem"])
    assert exc.value.code == "INVALID_RASTER"
