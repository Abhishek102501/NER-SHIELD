import numpy as np
from rasterio.transform import from_origin

from nershield_ml.landslide4sense.config import LandslideSettings
from nershield_ml.landslide4sense.inference.postprocessing import (
    clean_mask,
    polygonize,
    to_binary_mask,
)


def test_threshold_produces_binary_mask():
    probability = np.array([[0.1, 0.6], [0.4, 0.9]], dtype=np.float32)
    mask = to_binary_mask(probability, threshold=0.5)
    assert mask.dtype == bool
    assert mask.tolist() == [[False, True], [False, True]]


def test_clean_mask_removes_single_pixel_noise():
    mask = np.zeros((20, 20), dtype=bool)
    mask[5, 5] = True  # isolated single-pixel noise
    mask[10:15, 10:15] = True  # a real 5x5 blob
    cleaned = clean_mask(mask)
    assert not cleaned[5, 5]
    assert cleaned[12, 12]


def test_polygonize_preserves_georeferencing_and_computes_area():
    size = 64
    pixel_deg = 0.001
    transform = from_origin(90.0, 26.0, pixel_deg, pixel_deg)
    probability = np.zeros((size, size), dtype=np.float32)
    probability[10:20, 10:20] = 0.9  # a 10x10px, ~100m x 100m blob
    mask = probability > 0.5
    settings = LandslideSettings(min_polygon_area_m2=1.0)

    detections = polygonize(probability, mask, "EPSG:4326", transform, settings)

    assert len(detections) == 1
    d = detections[0]
    assert d.geometry["type"] == "Polygon"
    # ~10px * ~111m/px (at 0.001 deg) per side => ~1,100m x 1,100m => ~1.2 km^2
    assert 0.5 < d.area_km2 < 3.0
    assert 25.9 < d.centroid_lat < 26.0
    assert 90.0 < d.centroid_lon < 90.1
    assert d.confidence == d.mean_probability


def test_polygonize_drops_polygons_below_min_area():
    size = 64
    transform = from_origin(90.0, 26.0, 0.001, 0.001)
    probability = np.zeros((size, size), dtype=np.float32)
    probability[0, 0] = 0.9  # single pixel, tiny area
    mask = probability > 0.5
    settings = LandslideSettings(min_polygon_area_m2=1_000_000.0)  # 1 km^2 floor

    detections = polygonize(probability, mask, "EPSG:4326", transform, settings)
    assert detections == []
