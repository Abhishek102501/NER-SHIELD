"""Loads hazard-zone training data from CSV or GeoParquet, validated against
the column contract in `schema.py`. This is the ONLY place that reads training
data from disk — training and evaluation code call into here, never open a
file directly.
"""

from __future__ import annotations

from pathlib import Path

import geopandas as gpd
import pandas as pd

from nershield_ml.data.schema import ALL_COLUMNS, TARGET_COLUMN, SPATIAL_GROUP_COLUMN


class DataContractError(ValueError):
    """Raised when a dataset does not satisfy the documented column contract."""


def load_hazard_zones(path: str | Path) -> pd.DataFrame:
    """Loads a hazard-zone dataset from `.csv`, `.parquet`, or `.geoparquet`
    and validates it against the column contract.

    Geometry columns (if present, in a GeoParquet) are dropped — this model
    trains on tabular features only; geometry is upstream's job (deriving
    slope/aspect/curvature/etc. from a DEM) not this model's.
    """
    path = Path(path)
    if not path.exists():
        raise FileNotFoundError(f"Training data not found: {path}")

    if path.suffix == ".csv":
        df = pd.read_csv(path)
    elif path.suffix in (".parquet", ".geoparquet"):
        try:
            gdf = gpd.read_parquet(path)
            df = pd.DataFrame(gdf.drop(columns=["geometry"], errors="ignore"))
        except (ValueError, ImportError):
            df = pd.read_parquet(path)
    else:
        raise DataContractError(
            f"Unsupported file extension {path.suffix!r} — expected .csv, .parquet, "
            ".geoparquet."
        )

    _validate_contract(df, source=str(path))
    return df


def _validate_contract(df: pd.DataFrame, *, source: str) -> None:
    missing = [c for c in ALL_COLUMNS if c not in df.columns]
    if missing:
        raise DataContractError(
            f"{source}: missing required column(s) {missing}. "
            f"Expected columns: {ALL_COLUMNS}"
        )

    if df[TARGET_COLUMN].isna().any():
        raise DataContractError(f"{source}: {TARGET_COLUMN} contains null values.")

    unexpected_labels = set(df[TARGET_COLUMN].unique()) - {0, 1}
    if unexpected_labels:
        raise DataContractError(
            f"{source}: {TARGET_COLUMN} must be binary (0/1), found {unexpected_labels}."
        )

    if df[SPATIAL_GROUP_COLUMN].isna().any():
        raise DataContractError(
            f"{source}: {SPATIAL_GROUP_COLUMN} (spatial CV group) contains null values — "
            "every zone must be assigned to a district/watershed."
        )

    if df[SPATIAL_GROUP_COLUMN].nunique() < 2:
        raise DataContractError(
            f"{source}: {SPATIAL_GROUP_COLUMN} has fewer than 2 distinct values — "
            "spatially blocked cross-validation requires multiple districts/watersheds."
        )
