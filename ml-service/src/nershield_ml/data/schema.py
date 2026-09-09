"""The feature schema for a hazard zone — the single source of truth for column
names/types, shared by the data loader, the training pipeline, and the /predict
API's request model. Do not duplicate this list elsewhere.

Column contract for the training CSV/GeoParquet:

| Column                    | Type    | Description                                             |
|---------------------------|---------|-----------------------------------------------------------|
| zone_id                   | str     | Unique hazard-zone identifier                            |
| district                  | str     | District/watershed name — the spatial CV grouping key    |
| slope                     | float   | Degrees, 0-90                                             |
| elevation                 | float   | Meters above sea level                                    |
| aspect                    | float   | Slope-facing direction, degrees 0-360 (0/360 = north)      |
| curvature                 | float   | Profile curvature; negative = concave, positive = convex   |
| drainage_proximity        | float   | Distance to nearest drainage line/river, meters            |
| land_cover                | str     | Categorical: forest, cropland, built_up, barren, grassland |
| soil_type                 | str     | Categorical: e.g. clay, loam, sandy, laterite              |
| lithology                 | str     | Categorical: dominant rock/geological unit                 |
| ndvi                      | float   | Normalized Difference Vegetation Index, -1 to 1             |
| rainfall_3d               | float   | Antecedent rainfall, past 3 days, mm                        |
| rainfall_7d                | float   | Antecedent rainfall, past 7 days, mm                        |
| rainfall_15d               | float   | Antecedent rainfall, past 15 days, mm                        |
| historical_incident_count  | int     | Count of prior recorded landslide incidents in the zone      |
| landslide_occurred          | int     | Target label, 1/0 — landslide occurred (training data only)  |

`district` and `landslide_occurred` are training-only columns — they are never
part of the inference feature vector.
"""

from __future__ import annotations

# Numeric feature columns, in the exact order the model is trained/served on.
NUMERIC_FEATURES: list[str] = [
    "slope",
    "elevation",
    "aspect",
    "curvature",
    "drainage_proximity",
    "ndvi",
    "rainfall_3d",
    "rainfall_7d",
    "rainfall_15d",
    "historical_incident_count",
]

# Categorical feature columns — one-hot encoded during feature engineering.
CATEGORICAL_FEATURES: list[str] = [
    "land_cover",
    "soil_type",
    "lithology",
]

FEATURE_COLUMNS: list[str] = NUMERIC_FEATURES + CATEGORICAL_FEATURES

TARGET_COLUMN = "landslide_occurred"

# The spatial cross-validation grouping key — whole districts/watersheds are
# held out together so no zone in the training fold shares a boundary with a
# zone in the validation fold. See training/train.py.
SPATIAL_GROUP_COLUMN = "district"

ZONE_ID_COLUMN = "zone_id"

ALL_COLUMNS: list[str] = (
    [ZONE_ID_COLUMN, SPATIAL_GROUP_COLUMN] + FEATURE_COLUMNS + [TARGET_COLUMN]
)

# Allowed categorical values — used both to validate training data and to
# build a stable one-hot encoding that does not shift if a category is absent
# from a given batch.
LAND_COVER_VALUES: list[str] = ["forest", "cropland", "built_up", "barren", "grassland"]
SOIL_TYPE_VALUES: list[str] = ["clay", "loam", "sandy", "laterite", "silt"]
LITHOLOGY_VALUES: list[str] = [
    "gneiss",
    "schist",
    "sandstone",
    "shale",
    "limestone",
    "alluvium",
]

CATEGORICAL_VALUES: dict[str, list[str]] = {
    "land_cover": LAND_COVER_VALUES,
    "soil_type": SOIL_TYPE_VALUES,
    "lithology": LITHOLOGY_VALUES,
}

# Plausible numeric ranges — used by the synthetic data generator and as a
# sanity check on real data, not a hard validation constraint.
NUMERIC_RANGES: dict[str, tuple[float, float]] = {
    "slope": (0.0, 90.0),
    "elevation": (0.0, 5500.0),
    "aspect": (0.0, 360.0),
    "curvature": (-5.0, 5.0),
    "drainage_proximity": (0.0, 5000.0),
    "ndvi": (-1.0, 1.0),
    "rainfall_3d": (0.0, 600.0),
    "rainfall_7d": (0.0, 1200.0),
    "rainfall_15d": (0.0, 2000.0),
    "historical_incident_count": (0, 20),
}
