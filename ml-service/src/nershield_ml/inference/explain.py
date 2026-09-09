"""SHAP-based explanation for a single prediction — the `factors` returned by
POST /predict come from here, never from a hand-picked heuristic.
"""

from __future__ import annotations

from typing import Any

import numpy as np
import pandas as pd
import shap


def _base_tree_model(calibrated_model: Any) -> Any:
    """CalibratedClassifierCV wraps the fitted XGBoost model (itself wrapped
    in a `sklearn.frozen.FrozenEstimator` — see training/train.py) inside
    `calibrated_classifiers_[0]`. SHAP's TreeExplainer needs the raw tree
    model, not either wrapper — calibration only applies a monotonic
    rescaling to the model's output, so the base model's feature attributions
    remain a valid explanation of the calibrated score.
    """
    calibrated = calibrated_model.calibrated_classifiers_[0]
    # sklearn renamed `base_estimator` -> `estimator` around 1.4.
    inner = getattr(calibrated, "estimator", None) or getattr(calibrated, "base_estimator")
    # Unwrap FrozenEstimator, if present (sklearn >=1.6's cv="prefit" replacement).
    return getattr(inner, "estimator", inner)


def top_contributing_factors(
    calibrated_model: Any, X_row: pd.DataFrame, *, top_n: int = 5
) -> list[dict]:
    """Returns the `top_n` features with the largest |SHAP value| for this one
    row, as `[{"feature": ..., "contribution": ...}, ...]`, sorted by
    contribution magnitude, descending.
    """
    base_model = _base_tree_model(calibrated_model)
    explainer = shap.TreeExplainer(base_model)
    shap_values = explainer.shap_values(X_row)

    values = np.asarray(shap_values).reshape(-1)
    order = np.argsort(-np.abs(values))[:top_n]

    return [
        {
            "feature": X_row.columns[i],
            "contribution": round(float(values[i]), 4),
        }
        for i in order
    ]
