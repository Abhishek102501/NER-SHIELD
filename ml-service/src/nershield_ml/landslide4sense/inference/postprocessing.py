"""Probability raster -> binary mask -> cleaned mask -> GIS polygons.

Every polygon keeps the source raster's CRS/transform end-to-end (via
rasterio.features.shapes, which reads geometry directly in raster
coordinates using the given transform) — this is what makes detections land
in the correct real-world location rather than merely looking plausible.
"""

from __future__ import annotations

import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone

import numpy as np
import rasterio
from pyproj import Transformer
from rasterio import features
from scipy import ndimage
from shapely.geometry import mapping, shape
from shapely.ops import transform as shapely_transform

from nershield_ml.landslide4sense.config import LandslideSettings
from nershield_ml.landslide4sense.model.registry import MODEL_NAME, MODEL_VERSION

Severity = str  # "low" | "moderate" | "high" | "critical" — matches the app's existing Severity type


@dataclass
class Detection:
    id: str
    geometry: dict  # GeoJSON geometry, WGS84
    area_m2: float
    area_km2: float
    mean_probability: float
    max_probability: float
    pixel_fraction_above_threshold: float
    confidence: float
    severity: Severity
    centroid_lat: float
    centroid_lon: float
    model: str = MODEL_NAME
    model_version: str = MODEL_VERSION
    detected_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


def classify_severity(confidence: float, area_km2: float, settings: LandslideSettings) -> Severity:
    """Transparent, configurable classification — NOT an official hazard
    standard. Combines detection confidence and affected area; thresholds
    live in LandslideSettings so they can be tuned without a code change.
    """
    if confidence >= settings.severity_confidence_critical or area_km2 >= settings.severity_area_km2_critical:
        return "critical"
    if confidence >= settings.severity_confidence_high or area_km2 >= settings.severity_area_km2_high:
        return "high"
    if confidence >= 0.5:
        return "moderate"
    return "low"


def _equal_area_crs_for(lon: float, lat: float) -> str:
    """A local azimuthal-equal-area projection centered on the detection —
    accurate area for small AOIs anywhere on Earth without needing a lookup
    table of UTM zones."""
    return f"+proj=laea +lat_0={lat} +lon_0={lon} +ellps=WGS84 +datum=WGS84 +units=m +no_defs"


def to_binary_mask(probability: np.ndarray, threshold: float) -> np.ndarray:
    return probability >= threshold


def clean_mask(mask: np.ndarray) -> np.ndarray:
    """Morphological opening then closing — removes isolated single/few-pixel
    noise without eroding genuinely contiguous detections."""
    structure = np.ones((3, 3), dtype=bool)
    opened = ndimage.binary_opening(mask, structure=structure, iterations=1)
    closed = ndimage.binary_closing(opened, structure=structure, iterations=1)
    return closed


def polygonize(
    probability: np.ndarray,
    mask: np.ndarray,
    crs: str,
    transform: rasterio.Affine,
    settings: LandslideSettings,
) -> list[Detection]:
    """Connected-component labels the cleaned mask, vectorizes each
    component in its native CRS via rasterio.features.shapes (transform
    applied internally so geometry is real-world coordinates immediately),
    reprojects to WGS84 for the GeoJSON output, and computes area/confidence/
    severity per polygon.
    """
    labeled, num_features = ndimage.label(mask, structure=np.ones((3, 3), dtype=bool))
    if num_features == 0:
        return []

    to_wgs84 = Transformer.from_crs(crs, "EPSG:4326", always_xy=True).transform

    detections: list[Detection] = []
    # `features.shapes` yields (geometry_dict, value) pairs for each
    # contiguous run of equal pixel value in `labeled`, already in the
    # raster's real-world CRS because `transform` is passed through.
    for geom_dict, value in features.shapes(labeled.astype(np.int32), mask=mask, transform=transform):
        component_id = int(value)
        if component_id == 0:
            continue

        component_mask = labeled == component_id
        pixel_count = int(component_mask.sum())
        if pixel_count == 0:
            continue

        geom_native = shape(geom_dict)
        geom_wgs84 = shapely_transform(to_wgs84, geom_native)

        centroid = geom_wgs84.centroid
        equal_area_crs = _equal_area_crs_for(centroid.x, centroid.y)
        to_equal_area = Transformer.from_crs("EPSG:4326", equal_area_crs, always_xy=True).transform
        geom_equal_area = shapely_transform(to_equal_area, geom_wgs84)
        area_m2 = geom_equal_area.area

        if area_m2 < settings.min_polygon_area_m2:
            continue

        # Simplify only in the final WGS84 geometry, after area is already
        # computed from the un-simplified equal-area geometry — this is what
        # "don't over-simplify to the point the area becomes inaccurate"
        # means in practice: simplification never feeds back into area.
        geom_simplified = geom_wgs84.simplify(settings.simplify_tolerance_deg, preserve_topology=True)

        component_probs = probability[component_mask]
        mean_prob = float(component_probs.mean())
        max_prob = float(component_probs.max())
        above = float((component_probs >= settings.threshold).mean())

        # Confidence: documented as the mean predicted probability across the
        # detection's own pixels — NOT a validation-set accuracy figure, and
        # NOT the same thing as "% of the time this is a real landslide".
        confidence = mean_prob
        area_km2 = area_m2 / 1_000_000

        detections.append(
            Detection(
                id=f"LS-{uuid.uuid4().hex[:8].upper()}",
                geometry=mapping(geom_simplified),
                area_m2=round(area_m2, 1),
                area_km2=round(area_km2, 4),
                mean_probability=round(mean_prob, 4),
                max_probability=round(max_prob, 4),
                pixel_fraction_above_threshold=round(above, 4),
                confidence=round(confidence, 4),
                severity=classify_severity(confidence, area_km2, settings),
                centroid_lat=round(centroid.y, 6),
                centroid_lon=round(centroid.x, 6),
            )
        )

    return detections
