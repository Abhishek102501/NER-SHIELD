"""Gradient-boosted rainfall nowcasting.

A *direct* multi-horizon regressor: one XGBoost model per lead time, each
predicting that horizon straight from the input window.  The alternative --
one model applied recursively -- compounds its own error across twelve steps
and is consistently worse for precipitation.

Why a tree model belongs alongside the LSTM here rather than replacing it:

* On a dataset this size (tens of thousands of windows, ~90 engineered
  predictors) boosted trees are a genuinely competitive baseline, and they
  train in seconds rather than hours.
* They are interpretable.  ``feature_importance()`` answers "which upwind
  gauge actually drives Guwahati's 6-hour forecast" -- a question the LSTM
  cannot answer and which matters for operational trust.
* They degrade gracefully with missing inputs, which a gauge network does
  constantly.

What they give up: no shared representation across horizons, and no ability to
extrapolate beyond the training range -- a tree can never predict a rainfall
total higher than it saw in training.  For a region containing Mawsynram that
is a real limitation, and it is why ``docs/XGBOOST.md`` recommends the
ensemble rather than the tree alone.
"""

from __future__ import annotations

import json
import warnings
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Optional, Sequence, Tuple

import numpy as np

try:
    import xgboost as xgb
except ImportError as exc:  # pragma: no cover
    raise ImportError(
        "XGBoost is required for this model: pip install xgboost"
    ) from exc


DEFAULT_PARAMS: Dict[str, Any] = {
    "n_estimators": 600,
    "max_depth": 6,
    "learning_rate": 0.05,
    "subsample": 0.8,
    "colsample_bytree": 0.8,
    "min_child_weight": 5,
    "reg_lambda": 1.0,
    "reg_alpha": 0.0,
    "objective": "reg:squarederror",
    "tree_method": "hist",
    "n_jobs": -1,
    "random_state": 42,
}

# IMD 24-hour rainfall warning categories (mm).  Used for the classifier heads
# and by the risk engine.  See ne_rainfall/risk/thresholds.py.
IMD_HEAVY_MM = 64.5
IMD_VERY_HEAVY_MM = 115.6


@dataclass
class XGBRainfallModel:
    """One booster per lead time, plus optional exceedance classifiers."""

    n_steps_out: int = 12
    params: Dict[str, Any] = field(default_factory=lambda: dict(DEFAULT_PARAMS))
    early_stopping_rounds: Optional[int] = 50
    classifier_thresholds: Sequence[float] = ()
    feature_names: Optional[List[str]] = None

    regressors: List[Any] = field(default_factory=list, init=False)
    classifiers: Dict[float, List[Any]] = field(default_factory=dict, init=False)
    best_iterations: List[int] = field(default_factory=list, init=False)

    # -- training ------------------------------------------------------------
    def fit(
        self,
        x: np.ndarray,
        y: np.ndarray,
        eval_set: Optional[Tuple[np.ndarray, np.ndarray]] = None,
        verbose: bool = True,
    ) -> "XGBRainfallModel":
        """Fit every horizon.

        ``y`` is ``(n, n_steps_out)`` in scaled units, matching the LSTM's
        target so the two are directly comparable.  ``eval_set`` enables early
        stopping; without it the full ``n_estimators`` are used, which on this
        data overfits noticeably past ~400 trees.
        """
        x = np.asarray(x, dtype=np.float32)
        y = np.asarray(y, dtype=np.float32)
        if y.ndim != 2 or y.shape[1] != self.n_steps_out:
            raise ValueError(
                f"y must be (n, {self.n_steps_out}), got {y.shape}"
            )
        if len(x) != len(y):
            raise ValueError(f"x has {len(x)} rows, y has {len(y)}")

        self.regressors = []
        self.best_iterations = []

        for h in range(self.n_steps_out):
            params = dict(self.params)
            if eval_set is not None and self.early_stopping_rounds:
                params["early_stopping_rounds"] = self.early_stopping_rounds
            model = xgb.XGBRegressor(**params)

            fit_kwargs: Dict[str, Any] = {"verbose": False}
            if eval_set is not None:
                fit_kwargs["eval_set"] = [(eval_set[0], eval_set[1][:, h])]

            with warnings.catch_warnings():
                warnings.simplefilter("ignore")
                model.fit(x, y[:, h], **fit_kwargs)

            best = getattr(model, "best_iteration", None)
            self.best_iterations.append(
                int(best) if best is not None else int(params["n_estimators"])
            )
            self.regressors.append(model)
            if verbose:
                print(
                    f"  horizon {h + 1:>2}/{self.n_steps_out}  "
                    f"trees={self.best_iterations[-1]}",
                    flush=True,
                )

        if self.feature_names is None and hasattr(x, "columns"):
            self.feature_names = list(x.columns)
        return self

    def fit_classifiers(
        self,
        x: np.ndarray,
        y_mm: np.ndarray,
        thresholds: Optional[Sequence[float]] = None,
        eval_set: Optional[Tuple[np.ndarray, np.ndarray]] = None,
        verbose: bool = True,
    ) -> "XGBRainfallModel":
        """Fit exceedance probability heads, in millimetres.

        A regressor trained under MSE systematically under-predicts extremes,
        so reading "will this exceed 64.5 mm" off the regression is unreliable
        exactly where it matters.  A dedicated classifier per threshold gives a
        calibrated probability instead, which is what the risk engine consumes.

        ``scale_pos_weight`` is set from the observed class balance; heavy-rain
        events are a low-single-digit percentage of steps and an unweighted
        classifier collapses to predicting "no" everywhere.
        """
        thresholds = list(thresholds if thresholds is not None else self.classifier_thresholds)
        if not thresholds:
            return self

        x = np.asarray(x, dtype=np.float32)
        y_mm = np.asarray(y_mm, dtype=np.float32)
        self.classifiers = {}

        for thr in thresholds:
            heads = []
            for h in range(self.n_steps_out):
                label = (y_mm[:, h] >= thr).astype(np.int32)
                pos = int(label.sum())
                if pos == 0:
                    if verbose:
                        print(
                            f"  [skip] no training events above {thr} mm at "
                            f"horizon {h + 1}; head not fitted"
                        )
                    heads.append(None)
                    continue

                params = dict(self.params)
                params.update(
                    objective="binary:logistic",
                    eval_metric="aucpr",
                    scale_pos_weight=float((len(label) - pos) / pos),
                )
                if eval_set is not None and self.early_stopping_rounds:
                    params["early_stopping_rounds"] = self.early_stopping_rounds
                clf = xgb.XGBClassifier(**params)

                fit_kwargs: Dict[str, Any] = {"verbose": False}
                if eval_set is not None:
                    fit_kwargs["eval_set"] = [
                        (eval_set[0], (eval_set[1][:, h] >= thr).astype(np.int32))
                    ]
                with warnings.catch_warnings():
                    warnings.simplefilter("ignore")
                    clf.fit(x, label, **fit_kwargs)
                heads.append(clf)
            self.classifiers[float(thr)] = heads
            if verbose:
                fitted = sum(h is not None for h in heads)
                print(f"  exceedance head @ {thr} mm: {fitted}/{self.n_steps_out} horizons")
        return self

    # -- inference -----------------------------------------------------------
    def predict(self, x: np.ndarray) -> np.ndarray:
        """``(n, n_steps_out)`` in the same scaled units as the training target."""
        self._check_fitted()
        x = np.asarray(x, dtype=np.float32)
        out = np.empty((len(x), self.n_steps_out), dtype=np.float32)
        for h, model in enumerate(self.regressors):
            out[:, h] = model.predict(x)
        # The scaled target is a min-max of log1p rainfall, so it cannot be
        # negative; trees can extrapolate slightly below zero at leaf edges.
        return np.clip(out, 0.0, None)

    def predict_exceedance(self, x: np.ndarray) -> Dict[float, np.ndarray]:
        """Per-threshold exceedance probabilities, ``(n, n_steps_out)`` each."""
        self._check_fitted()
        x = np.asarray(x, dtype=np.float32)
        out: Dict[float, np.ndarray] = {}
        for thr, heads in self.classifiers.items():
            p = np.zeros((len(x), self.n_steps_out), dtype=np.float32)
            for h, clf in enumerate(heads):
                if clf is not None:
                    p[:, h] = clf.predict_proba(x)[:, 1]
            out[thr] = p
        return out

    # -- interpretation ------------------------------------------------------
    def feature_importance(
        self, horizon: Optional[int] = None, kind: str = "gain", top: int = 20
    ) -> List[Tuple[str, float]]:
        """Ranked predictors, averaged across horizons unless one is named."""
        self._check_fitted()
        models = (
            [self.regressors[horizon]] if horizon is not None else self.regressors
        )
        totals: Dict[int, float] = {}
        for m in models:
            score = m.get_booster().get_score(importance_type=kind)
            for key, val in score.items():
                totals[int(key[1:])] = totals.get(int(key[1:]), 0.0) + float(val)

        names = self.feature_names
        ranked = sorted(totals.items(), key=lambda kv: kv[1], reverse=True)[:top]
        denom = float(len(models))
        return [
            (names[i] if names and i < len(names) else f"f{i}", v / denom)
            for i, v in ranked
        ]

    def _check_fitted(self) -> None:
        if not self.regressors:
            raise RuntimeError("model is not fitted; call fit() first")

    # -- persistence ---------------------------------------------------------
    def save(self, directory: str | Path) -> Path:
        """Write boosters as XGBoost-native JSON plus a metadata sidecar.

        Native JSON rather than pickle: it survives library upgrades, is
        inspectable, and can be loaded by XGBoost bindings in other languages
        if the host application is not Python.
        """
        self._check_fitted()
        d = Path(directory)
        d.mkdir(parents=True, exist_ok=True)
        for h, m in enumerate(self.regressors):
            m.save_model(d / f"reg_h{h:02d}.json")
        clf_index: Dict[str, List[Optional[str]]] = {}
        for thr, heads in self.classifiers.items():
            files: List[Optional[str]] = []
            for h, clf in enumerate(heads):
                if clf is None:
                    files.append(None)
                    continue
                fn = f"clf_{thr:g}mm_h{h:02d}.json"
                clf.save_model(d / fn)
                files.append(fn)
            clf_index[f"{thr:g}"] = files

        (d / "xgb_meta.json").write_text(
            json.dumps(
                {
                    "kind": "xgb_rainfall",
                    "n_steps_out": self.n_steps_out,
                    "params": self.params,
                    "best_iterations": self.best_iterations,
                    "feature_names": self.feature_names,
                    "classifier_files": clf_index,
                    "xgboost_version": xgb.__version__,
                },
                indent=2,
            ),
            encoding="utf-8",
        )
        return d

    @classmethod
    def load(cls, directory: str | Path) -> "XGBRainfallModel":
        d = Path(directory)
        meta_path = d / "xgb_meta.json"
        if not meta_path.exists():
            raise FileNotFoundError(f"no xgb_meta.json in {d}")
        meta = json.loads(meta_path.read_text(encoding="utf-8"))

        model = cls(
            n_steps_out=int(meta["n_steps_out"]),
            params=meta.get("params", dict(DEFAULT_PARAMS)),
            feature_names=meta.get("feature_names"),
        )
        model.best_iterations = meta.get("best_iterations", [])
        for h in range(model.n_steps_out):
            reg = xgb.XGBRegressor()
            reg.load_model(d / f"reg_h{h:02d}.json")
            model.regressors.append(reg)

        for thr_s, files in (meta.get("classifier_files") or {}).items():
            heads: List[Any] = []
            for fn in files:
                if fn is None:
                    heads.append(None)
                    continue
                clf = xgb.XGBClassifier()
                clf.load_model(d / fn)
                heads.append(clf)
            model.classifiers[float(thr_s)] = heads
        return model
