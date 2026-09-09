"""Turns a raw hazard-zone DataFrame into the numeric matrix XGBoost trains
and predicts on. Used by BOTH training and inference — the transform must be
identical in both places, so it lives here once, not duplicated.
"""

from __future__ import annotations

import pandas as pd

from nershield_ml.data.schema import CATEGORICAL_FEATURES, CATEGORICAL_VALUES, NUMERIC_FEATURES

# The exact, stable column order the model is trained/served on. One-hot
# columns are named "<feature>__<value>" and always appear in this order
# regardless of which categories are present in a given batch — this is what
# lets a single-row inference request produce the same columns a training
# batch does.
def encoded_feature_columns() -> list[str]:
    cols = list(NUMERIC_FEATURES)
    for feature in CATEGORICAL_FEATURES:
        for value in CATEGORICAL_VALUES[feature]:
            cols.append(f"{feature}__{value}")
    return cols


def transform(df: pd.DataFrame) -> pd.DataFrame:
    """Encodes `df` (must contain every column in NUMERIC_FEATURES +
    CATEGORICAL_FEATURES) into the fixed-width numeric matrix the model uses.

    Unknown categorical values are silently encoded as all-zero (none of that
    feature's one-hot columns fire) rather than raising — a genuinely novel
    soil type/lithology at inference time should degrade gracefully, not
    crash the request.
    """
    numeric = df[NUMERIC_FEATURES].astype(float)

    one_hot_frames = []
    for feature in CATEGORICAL_FEATURES:
        for value in CATEGORICAL_VALUES[feature]:
            col_name = f"{feature}__{value}"
            one_hot_frames.append((df[feature] == value).astype(float).rename(col_name))

    encoded = pd.concat([numeric, *one_hot_frames], axis=1)
    return encoded[encoded_feature_columns()]
