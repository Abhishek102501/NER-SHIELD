"""Turns one hazard-zone feature vector into a risk score, band, confidence
and SHAP-backed explanation. This is the only place score/band math lives —
the API layer just calls this and serializes the result.
"""

from __future__ import annotations

from dataclasses import dataclass

import pandas as pd

from nershield_ml.features.engineering import transform
from nershield_ml.inference.explain import top_contributing_factors
from nershield_ml.inference.model_registry import LoadedModel

# Risk bands — upper bounds inclusive.
RISK_BANDS: list[tuple[int, int, str]] = [
    (0, 24, "Low"),
    (25, 49, "Moderate"),
    (50, 74, "High"),
    (75, 100, "Severe"),
]


def risk_band_for_score(score: int) -> str:
    for lo, hi, band in RISK_BANDS:
        if lo <= score <= hi:
            return band
    raise ValueError(f"Score {score} out of the 0-100 range.")


@dataclass
class Prediction:
    score: int
    risk_band: str
    confidence: float
    factors: list[dict]


def predict(loaded: LoadedModel, feature_row: dict) -> Prediction:
    """`feature_row` must contain every raw feature column in
    `schema.NUMERIC_FEATURES + schema.CATEGORICAL_FEATURES`. Encoding happens
    here via the same `transform()` used at training time.
    """
    df = pd.DataFrame([feature_row])
    X = transform(df)

    prob = float(loaded.model.predict_proba(X)[0, 1])
    score = round(prob * 100)
    score = max(0, min(100, score))

    # Distance from the least-informative prediction (p=0.5), scaled to 0-1.
    # A calibrated probability of 0.5 is maximal uncertainty; 0 or 1 is
    # maximal confidence.
    confidence = round(abs(prob - 0.5) * 2, 4)

    factors = top_contributing_factors(loaded.model, X)

    return Prediction(
        score=score,
        risk_band=risk_band_for_score(score),
        confidence=confidence,
        factors=factors,
    )
