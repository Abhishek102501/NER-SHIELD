"""Landslide susceptibility from Sentinel-2 + terrain, per pixel.

Trained on Landslide4Sense 2022 (IARAI).  The benchmark metric is F1 on the
landslide class, so that is what this model tunes -- specifically it selects
the probability cut-off that maximises validation F1 rather than assuming 0.5.
With a class balance near 2% positive, 0.5 is close to the worst possible
choice; the same booster can move from F1 ~0.30 to ~0.60 on threshold alone.

This is deliberately a *susceptibility* model, not a detector: it answers "how
landslide-prone is this pixel" from stable terrain and surface conditions.  The
rainfall forecast supplies the trigger, and the two combine in
:mod:`ne_rainfall.risk.engine`.  Keeping them separate means the susceptibility
model can be trained once on a global benchmark and reused across the North
East, while the trigger updates hourly.
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Optional, Sequence, Tuple

import numpy as np

try:
    import xgboost as xgb
except ImportError as exc:  # pragma: no cover
    raise ImportError("XGBoost is required: pip install xgboost") from exc


DEFAULT_PARAMS: Dict[str, Any] = {
    "n_estimators": 500,
    "max_depth": 7,
    "learning_rate": 0.06,
    "subsample": 0.85,
    "colsample_bytree": 0.85,
    "min_child_weight": 10,
    "reg_lambda": 1.5,
    "objective": "binary:logistic",
    "eval_metric": "aucpr",     # PR-AUC, not accuracy: the classes are skewed
    "tree_method": "hist",
    "n_jobs": -1,
    "random_state": 42,
}


def f1_at(prob: np.ndarray, label: np.ndarray, threshold: float) -> Dict[str, float]:
    """Precision / recall / F1 for the positive class at one cut-off."""
    pred = prob >= threshold
    truth = label.astype(bool)
    tp = int(np.sum(pred & truth))
    fp = int(np.sum(pred & ~truth))
    fn = int(np.sum(~pred & truth))
    precision = tp / (tp + fp) if (tp + fp) else 0.0
    recall = tp / (tp + fn) if (tp + fn) else 0.0
    f1 = (
        2 * precision * recall / (precision + recall)
        if (precision + recall)
        else 0.0
    )
    return {
        "threshold": float(threshold),
        "precision": float(precision),
        "recall": float(recall),
        "f1": float(f1),
        "tp": tp, "fp": fp, "fn": fn,
    }


def best_f1_threshold(
    prob: np.ndarray, label: np.ndarray, grid: Optional[Sequence[float]] = None
) -> Dict[str, float]:
    """Sweep cut-offs and return the best by F1."""
    grid = grid if grid is not None else np.linspace(0.05, 0.95, 91)
    scored = [f1_at(prob, label, t) for t in grid]
    return max(scored, key=lambda d: d["f1"])


@dataclass
class XGBLandslideModel:
    """Binary per-pixel susceptibility classifier."""

    params: Dict[str, Any] = field(default_factory=lambda: dict(DEFAULT_PARAMS))
    early_stopping_rounds: Optional[int] = 40
    feature_names: Optional[List[str]] = None

    booster: Optional[Any] = field(default=None, init=False)
    decision_threshold: float = field(default=0.5, init=False)
    validation: Dict[str, float] = field(default_factory=dict, init=False)

    def fit(
        self,
        x: np.ndarray,
        y: np.ndarray,
        eval_set: Optional[Tuple[np.ndarray, np.ndarray]] = None,
        tune_threshold: bool = True,
        verbose: bool = True,
    ) -> "XGBLandslideModel":
        x = np.asarray(x, dtype=np.float32)
        y = np.asarray(y).astype(np.int32).ravel()
        if len(x) != len(y):
            raise ValueError(f"x has {len(x)} rows, y has {len(y)}")
        pos = int(y.sum())
        if pos == 0 or pos == len(y):
            raise ValueError(
                f"need both classes present; got {pos} positives of {len(y)}"
            )

        params = dict(self.params)
        params["scale_pos_weight"] = float((len(y) - pos) / pos)
        if eval_set is not None and self.early_stopping_rounds:
            params["early_stopping_rounds"] = self.early_stopping_rounds

        self.booster = xgb.XGBClassifier(**params)
        fit_kwargs: Dict[str, Any] = {"verbose": False}
        if eval_set is not None:
            fit_kwargs["eval_set"] = [
                (np.asarray(eval_set[0], dtype=np.float32),
                 np.asarray(eval_set[1]).astype(np.int32).ravel())
            ]
        self.booster.fit(x, y, **fit_kwargs)

        if verbose:
            print(
                f"  fitted on {len(y)} pixels "
                f"({pos} positive, {pos / len(y):.1%}), "
                f"scale_pos_weight={params['scale_pos_weight']:.1f}"
            )

        if tune_threshold and eval_set is not None:
            prob = self.predict_proba(eval_set[0])
            best = best_f1_threshold(prob, np.asarray(eval_set[1]).ravel())
            self.decision_threshold = best["threshold"]
            self.validation = best
            if verbose:
                print(
                    f"  best validation F1 = {best['f1']:.4f} at "
                    f"threshold {best['threshold']:.2f} "
                    f"(precision {best['precision']:.3f}, "
                    f"recall {best['recall']:.3f})"
                )
        return self

    # -- inference -----------------------------------------------------------
    def predict_proba(self, x: np.ndarray) -> np.ndarray:
        self._check()
        return self.booster.predict_proba(
            np.asarray(x, dtype=np.float32)
        )[:, 1].astype(np.float32)

    def predict(self, x: np.ndarray, threshold: Optional[float] = None) -> np.ndarray:
        thr = self.decision_threshold if threshold is None else threshold
        return (self.predict_proba(x) >= thr).astype(np.int8)

    def predict_patch(
        self, cube: np.ndarray, include_texture: bool = True
    ) -> np.ndarray:
        """Susceptibility map for a ``(14, H, W)`` cube, returned as ``(H, W)``."""
        from ne_rainfall.data.landslide4sense import patch_to_rows

        rows, _, (h, w) = patch_to_rows(cube, include_texture=include_texture)
        return self.predict_proba(rows).reshape(h, w)

    def feature_importance(self, kind: str = "gain", top: int = 20) -> List[Tuple[str, float]]:
        self._check()
        score = self.booster.get_booster().get_score(importance_type=kind)
        ranked = sorted(
            ((int(k[1:]), float(v)) for k, v in score.items()),
            key=lambda kv: kv[1],
            reverse=True,
        )[:top]
        names = self.feature_names
        return [
            (names[i] if names and i < len(names) else f"f{i}", v) for i, v in ranked
        ]

    def _check(self) -> None:
        if self.booster is None:
            raise RuntimeError("model is not fitted; call fit() first")

    # -- persistence ---------------------------------------------------------
    def save(self, directory: str | Path) -> Path:
        self._check()
        d = Path(directory)
        d.mkdir(parents=True, exist_ok=True)
        self.booster.save_model(d / "landslide.json")
        (d / "landslide_meta.json").write_text(
            json.dumps(
                {
                    "kind": "xgb_landslide",
                    "params": self.params,
                    "decision_threshold": self.decision_threshold,
                    "validation": self.validation,
                    "feature_names": self.feature_names,
                    "xgboost_version": xgb.__version__,
                },
                indent=2,
            ),
            encoding="utf-8",
        )
        return d

    @classmethod
    def load(cls, directory: str | Path) -> "XGBLandslideModel":
        d = Path(directory)
        meta_path = d / "landslide_meta.json"
        if not meta_path.exists():
            raise FileNotFoundError(f"no landslide_meta.json in {d}")
        meta = json.loads(meta_path.read_text(encoding="utf-8"))
        model = cls(
            params=meta.get("params", dict(DEFAULT_PARAMS)),
            feature_names=meta.get("feature_names"),
        )
        model.booster = xgb.XGBClassifier()
        model.booster.load_model(d / "landslide.json")
        model.decision_threshold = float(meta.get("decision_threshold", 0.5))
        model.validation = meta.get("validation", {})
        return model
