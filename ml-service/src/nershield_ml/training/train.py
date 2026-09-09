"""Trains the landslide-occurrence XGBoost classifier.

Cross-validation strategy — SPATIALLY BLOCKED, not random:
  A random train/test split lets zones from the same district/watershed land
  on both sides of the split. Adjacent zones share terrain, soil and rainfall
  patterns, so a random split leaks that spatial correlation into the "test"
  set and inflates every metric. Instead this uses GroupKFold keyed on
  `district` (see schema.SPATIAL_GROUP_COLUMN) — every fold holds out whole
  districts the model never saw during that fold's training.

Class imbalance:
  Landslide-positive zones are the minority class. `scale_pos_weight` (the
  ratio of negative to positive samples in the training fold) is passed to
  XGBoost directly rather than oversampling/undersampling the training data.
  Chosen because: (a) tree-boosting handles per-sample weighting natively and
  cheaply, (b) resampling would duplicate or synthesize zones inside CV folds,
  which risks leaking near-duplicate spatial signal across the fold boundary
  the spatial blocking exists to prevent.

Calibration:
  The final deployed model is calibrated with CalibratedClassifierCV in
  "prefit" mode: the base XGBoost model is fit on one set of districts, then
  calibration is fit on a DISJOINT held-out set of districts never seen by the
  base model — so the probabilities used as the 0-100 score are not
  calibrated on data the model has already memorized.

Reported metrics: precision, recall, PR-AUC, confusion matrix (per outer CV
fold and averaged). Accuracy and ROC-AUC are recorded for context only — see
evaluation.py's docstring for why they are not the headline numbers on an
imbalanced dataset.
"""

from __future__ import annotations

import argparse
import json
from dataclasses import asdict
from datetime import datetime, timezone
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.calibration import CalibratedClassifierCV
from sklearn.frozen import FrozenEstimator
from sklearn.model_selection import GroupKFold, GroupShuffleSplit
from xgboost import XGBClassifier

from nershield_ml.data.loader import load_hazard_zones
from nershield_ml.data.schema import SPATIAL_GROUP_COLUMN, TARGET_COLUMN
from nershield_ml.features.engineering import encoded_feature_columns, transform
from nershield_ml.training.evaluation import Metrics, evaluate

MODEL_VERSION_PREFIX = "xgb"


def _scale_pos_weight(y: np.ndarray) -> float:
    n_pos = int(y.sum())
    n_neg = len(y) - n_pos
    return n_neg / max(n_pos, 1)


def _fit_base_model(X: pd.DataFrame, y: np.ndarray) -> XGBClassifier:
    model = XGBClassifier(
        n_estimators=300,
        max_depth=4,
        learning_rate=0.05,
        subsample=0.8,
        colsample_bytree=0.8,
        scale_pos_weight=_scale_pos_weight(y),
        eval_metric="aucpr",
        random_state=42,
    )
    model.fit(X, y)
    return model


def run_spatial_cv(
    df: pd.DataFrame, *, n_splits: int = 5
) -> tuple[list[Metrics], Metrics]:
    """Runs GroupKFold (grouped by district) and returns per-fold metrics plus
    a pooled metric computed over every held-out prediction concatenated
    together — the honest estimate of how this model performs on districts it
    has never seen.
    """
    X = transform(df)
    y = df[TARGET_COLUMN].to_numpy()
    groups = df[SPATIAL_GROUP_COLUMN].to_numpy()

    n_splits = min(n_splits, df[SPATIAL_GROUP_COLUMN].nunique())
    gkf = GroupKFold(n_splits=n_splits)

    fold_metrics: list[Metrics] = []
    all_y_true, all_y_prob = [], []

    for fold_i, (train_idx, test_idx) in enumerate(gkf.split(X, y, groups)):
        model = _fit_base_model(X.iloc[train_idx], y[train_idx])
        y_prob = model.predict_proba(X.iloc[test_idx])[:, 1]

        held_out_districts = sorted(set(groups[test_idx]))
        print(f"[fold {fold_i}] held-out districts: {held_out_districts}")

        fold_metrics.append(evaluate(y[test_idx], y_prob))
        all_y_true.append(y[test_idx])
        all_y_prob.append(y_prob)

    pooled = evaluate(np.concatenate(all_y_true), np.concatenate(all_y_prob))
    return fold_metrics, pooled


def train_final_model(df: pd.DataFrame, *, calibration_frac: float = 0.2):
    """Fits the deployable model: base XGBoost on one set of districts,
    isotonic calibration (`cv="prefit"`) on a disjoint held-out set of
    districts, so calibrated probabilities are not fit on already-memorized
    data.
    """
    X = transform(df)
    y = df[TARGET_COLUMN].to_numpy()
    groups = df[SPATIAL_GROUP_COLUMN].to_numpy()

    splitter = GroupShuffleSplit(n_splits=1, test_size=calibration_frac, random_state=42)
    train_idx, calib_idx = next(splitter.split(X, y, groups))

    base_model = _fit_base_model(X.iloc[train_idx], y[train_idx])

    # FrozenEstimator marks `base_model` as already-fitted, so
    # CalibratedClassifierCV fits the calibrator directly on the (disjoint)
    # calibration set instead of re-fitting/cross-validating the base model
    # itself — the sklearn >=1.6 replacement for the old `cv="prefit"`.
    calibrated = CalibratedClassifierCV(FrozenEstimator(base_model), method="isotonic")
    calibrated.fit(X.iloc[calib_idx], y[calib_idx])

    return calibrated


def train(
    data_path: str | Path,
    *,
    model_dir: str | Path = "models",
    n_splits: int = 5,
) -> dict:
    df = load_hazard_zones(data_path)

    print(f"Loaded {len(df)} hazard zones from {data_path} "
          f"({df[SPATIAL_GROUP_COLUMN].nunique()} districts, "
          f"{df[TARGET_COLUMN].mean():.1%} positive class).")

    fold_metrics, pooled_metrics = run_spatial_cv(df, n_splits=n_splits)

    print("\n=== Spatially-blocked CV — pooled held-out metrics ===")
    print(json.dumps(pooled_metrics.to_dict(), indent=2))

    final_model = train_final_model(df)

    version = f"{MODEL_VERSION_PREFIX}-{datetime.now(timezone.utc):%Y%m%d-%H%M%S}"
    trained_at = datetime.now(timezone.utc).isoformat()

    model_dir = Path(model_dir)
    model_dir.mkdir(parents=True, exist_ok=True)
    artifact_path = model_dir / f"model_{version}.joblib"

    artifact = {
        "model": final_model,
        "feature_columns": encoded_feature_columns(),
        "version": version,
        "trained_at": trained_at,
        "data_reference": str(data_path),
        "metrics": {
            "pooled_spatial_cv": pooled_metrics.to_dict(),
            "per_fold_spatial_cv": [m.to_dict() for m in fold_metrics],
        },
    }
    joblib.dump(artifact, artifact_path)

    metadata = {k: v for k, v in artifact.items() if k != "model"}
    (model_dir / f"model_{version}.json").write_text(json.dumps(metadata, indent=2))
    (model_dir / "latest.json").write_text(
        json.dumps({"version": version, "artifact_path": artifact_path.name}, indent=2)
    )

    print(f"\nSaved model artifact: {artifact_path}")
    print(f"Updated {model_dir / 'latest.json'} -> {version}")
    return metadata


def main() -> None:
    parser = argparse.ArgumentParser(description="Train the NER-SHIELD landslide risk model.")
    parser.add_argument("data_path", type=Path, help="CSV/GeoParquet of hazard zones.")
    parser.add_argument("--model-dir", type=Path, default=Path("models"))
    parser.add_argument("--n-splits", type=int, default=5)
    args = parser.parse_args()
    train(args.data_path, model_dir=args.model_dir, n_splits=args.n_splits)


if __name__ == "__main__":
    main()
