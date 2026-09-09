"""Generates a SYNTHETIC hazard-zone dataset so the training/inference pipeline
is runnable end-to-end before real geospatial data exists.

╔══════════════════════════════════════════════════════════════════════════╗
║  EVERY row this module produces is synthetic. It must never be presented ║
║  as, merged with, or mistaken for real hazard-zone data.                 ║
╚══════════════════════════════════════════════════════════════════════════╝

Every marker below exists specifically so synthetic data cannot silently leak
into a real pipeline:
  - `zone_id` values are prefixed "SYN-".
  - `district` values are prefixed "SYNTHETIC_DISTRICT_".
  - The default output filename is `synthetic_hazard_zones.csv` — never a name
    that could pass for real data.
  - A `data_source` column set to `"synthetic"` on every row (dropped before
    training, exactly like `zone_id`/`district`, but present in the file
    itself as a permanent, greppable marker of provenance).

The label is generated from a deliberately simple, documented logistic
function of slope, rainfall, drainage proximity, NDVI and historical incident
count, plus noise — enough real signal that a trained model beats chance
(so the pipeline's metrics reporting can be sanity-checked), but this is NOT
a substitute for real susceptibility labels and must be replaced before any
real deployment decision is made on this model's output.
"""

from __future__ import annotations

import argparse
from pathlib import Path

import numpy as np
import pandas as pd

from nershield_ml.data.schema import CATEGORICAL_VALUES, NUMERIC_RANGES

SYNTHETIC_ZONE_ID_PREFIX = "SYN-"
SYNTHETIC_DISTRICT_PREFIX = "SYNTHETIC_DISTRICT_"
DEFAULT_OUTPUT_FILENAME = "synthetic_hazard_zones.csv"
N_SYNTHETIC_DISTRICTS = 8


def generate_synthetic_hazard_zones(
    n_rows: int = 2000, *, seed: int = 42
) -> pd.DataFrame:
    """Returns a synthetic hazard-zone DataFrame matching the full column
    contract in `schema.py`, including the label and the `data_source` marker.
    """
    rng = np.random.default_rng(seed)

    districts = [f"{SYNTHETIC_DISTRICT_PREFIX}{i:02d}" for i in range(N_SYNTHETIC_DISTRICTS)]

    def uniform(col: str) -> np.ndarray:
        lo, hi = NUMERIC_RANGES[col]
        return rng.uniform(lo, hi, n_rows)

    slope = uniform("slope")
    elevation = uniform("elevation")
    aspect = uniform("aspect")
    curvature = uniform("curvature")
    drainage_proximity = uniform("drainage_proximity")
    ndvi = uniform("ndvi")
    rainfall_3d = uniform("rainfall_3d")
    rainfall_7d = np.clip(rainfall_3d + uniform("rainfall_7d") * 0.5, 0, None)
    rainfall_15d = np.clip(rainfall_7d + uniform("rainfall_15d") * 0.5, 0, None)
    historical_incident_count = rng.poisson(1.2, n_rows)

    land_cover = rng.choice(CATEGORICAL_VALUES["land_cover"], n_rows)
    soil_type = rng.choice(CATEGORICAL_VALUES["soil_type"], n_rows)
    lithology = rng.choice(CATEGORICAL_VALUES["lithology"], n_rows)

    # Deliberately simple, documented risk signal — steeper slope, closer
    # drainage, heavier antecedent rainfall, sparser vegetation and more prior
    # incidents all push risk up. Coefficients are illustrative, not derived
    # from any real susceptibility study.
    logit = (
        -6.5
        + 0.05 * slope
        - 0.0006 * drainage_proximity
        + 0.0025 * rainfall_15d
        - 1.5 * ndvi
        + 0.35 * historical_incident_count
        + rng.normal(0, 1.0, n_rows)  # noise
    )
    prob = 1 / (1 + np.exp(-logit))
    landslide_occurred = rng.binomial(1, prob)

    df = pd.DataFrame(
        {
            "zone_id": [f"{SYNTHETIC_ZONE_ID_PREFIX}{i:06d}" for i in range(n_rows)],
            "district": rng.choice(districts, n_rows),
            "slope": slope,
            "elevation": elevation,
            "aspect": aspect,
            "curvature": curvature,
            "drainage_proximity": drainage_proximity,
            "land_cover": land_cover,
            "soil_type": soil_type,
            "lithology": lithology,
            "ndvi": ndvi,
            "rainfall_3d": rainfall_3d,
            "rainfall_7d": rainfall_7d,
            "rainfall_15d": rainfall_15d,
            "historical_incident_count": historical_incident_count,
            "landslide_occurred": landslide_occurred,
            "data_source": "synthetic",
        }
    )
    return df


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--n-rows", type=int, default=2000)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument(
        "--out",
        type=Path,
        default=Path("data") / DEFAULT_OUTPUT_FILENAME,
        help="Output path. Must contain 'synthetic' in the filename.",
    )
    args = parser.parse_args()

    if "synthetic" not in args.out.name.lower():
        raise SystemExit(
            f"Refusing to write to {args.out} — output filename must contain "
            "'synthetic' so it can never be mistaken for real data."
        )

    df = generate_synthetic_hazard_zones(n_rows=args.n_rows, seed=args.seed)
    args.out.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(args.out, index=False)
    print(
        f"Wrote {len(df)} SYNTHETIC rows to {args.out} "
        f"({df['landslide_occurred'].mean():.1%} positive class)."
    )


if __name__ == "__main__":
    main()
