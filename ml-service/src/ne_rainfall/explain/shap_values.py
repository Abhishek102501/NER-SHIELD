"""Exact TreeSHAP attributions for the rainfall and landslide models."""

from __future__ import annotations

import json
from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Optional, Sequence, Tuple

import numpy as np

try:
    import xgboost as xgb
except ImportError as exc:  # pragma: no cover
    raise ImportError("XGBoost is required for SHAP: pip install xgboost") from exc


@dataclass
class FeatureContribution:
    """One feature's share of one prediction."""

    feature: str
    value: float          # the feature's own value for this sample
    shap_scaled: float    # exact contribution in model output space
    effect_mm: float      # marginal effect on the forecast, in mm (not additive)

    @property
    def direction(self) -> str:
        if self.shap_scaled > 0:
            return "increased"
        if self.shap_scaled < 0:
            return "decreased"
        return "no effect"

    def to_dict(self) -> Dict[str, Any]:
        return {
            "feature": self.feature,
            "value": round(float(self.value), 4),
            "shap_scaled": round(float(self.shap_scaled), 6),
            "effect_mm": round(float(self.effect_mm), 4),
            "direction": self.direction,
        }


@dataclass
class LocalExplanation:
    """Why the model produced this one number.

    ``shap_scaled`` values satisfy ``base_scaled + sum(shap) == prediction_scaled``
    exactly.  ``effect_mm`` values do not sum to ``prediction_mm`` and are not
    meant to -- see the module docstring.
    """

    horizon: int                       # 0-based
    lead_time_min: int
    prediction_mm: float
    prediction_scaled: float
    base_scaled: float
    base_mm: float
    contributions: List[FeatureContribution]
    additivity_error: float
    units_note: str = (
        "shap_scaled is exact and additive in the model's (log1p+min-max) "
        "output space. effect_mm is the millimetre change from removing that "
        "one feature's contribution -- exact per feature, deliberately not "
        "additive, because expm1 is non-linear."
    )

    def top(self, n: int = 10, by: str = "abs") -> List[FeatureContribution]:
        """Most influential features.

        ``by="abs"`` ranks by magnitude regardless of sign (the usual view);
        ``"positive"`` / ``"negative"`` isolate the drivers in one direction.
        """
        if by == "abs":
            key, items = (lambda c: abs(c.shap_scaled)), self.contributions
        elif by == "positive":
            key = lambda c: c.shap_scaled
            items = [c for c in self.contributions if c.shap_scaled > 0]
        elif by == "negative":
            key = lambda c: -c.shap_scaled
            items = [c for c in self.contributions if c.shap_scaled < 0]
        else:
            raise ValueError(f"by must be abs/positive/negative, got {by!r}")
        return sorted(items, key=key, reverse=True)[:n]

    def narrate(self, n: int = 5) -> str:
        from ne_rainfall.explain.narrate import narrate as _narrate

        return _narrate(self, n=n)

    def to_dict(self, top: Optional[int] = 15) -> Dict[str, Any]:
        items = self.top(top) if top else self.contributions
        return {
            "horizon": self.horizon,
            "lead_time_min": self.lead_time_min,
            "prediction_mm": round(self.prediction_mm, 3),
            "base_mm": round(self.base_mm, 3),
            "additivity_error": float(f"{self.additivity_error:.3g}"),
            "units_note": self.units_note,
            "contributions": [c.to_dict() for c in items],
        }

    def __repr__(self) -> str:
        return (
            f"<LocalExplanation +{self.lead_time_min}min "
            f"{self.prediction_mm:.2f}mm, {len(self.contributions)} features>"
        )


@dataclass
class GlobalImportance:
    """Mean |SHAP| over a dataset -- which features matter in general."""

    feature_names: List[str]
    mean_abs_shap: np.ndarray            # (n_features,) averaged over horizons
    per_horizon: np.ndarray              # (n_horizons, n_features)
    lead_times_min: List[int]
    n_samples: int

    def top(self, n: int = 20, horizon: Optional[int] = None) -> List[Tuple[str, float]]:
        vals = self.mean_abs_shap if horizon is None else self.per_horizon[horizon]
        order = np.argsort(vals)[::-1][:n]
        return [(self.feature_names[i], float(vals[i])) for i in order]

    def to_frame(self):
        import pandas as pd

        df = pd.DataFrame(
            self.per_horizon.T,
            index=self.feature_names,
            columns=[f"+{lt}min" for lt in self.lead_times_min],
        )
        df.insert(0, "mean", self.mean_abs_shap)
        return df.sort_values("mean", ascending=False)

    def save(self, path: str | Path) -> None:
        Path(path).write_text(
            json.dumps(
                {
                    "n_samples": self.n_samples,
                    "lead_times_min": self.lead_times_min,
                    "ranking": [
                        {"feature": f, "mean_abs_shap": round(v, 6)}
                        for f, v in self.top(len(self.feature_names))
                    ],
                },
                indent=2,
            ),
            encoding="utf-8",
        )


# --------------------------------------------------------------------------
def _iteration_range(booster_model) -> Optional[Tuple[int, int]]:
    """The tree range the model's own ``predict`` uses.

    This matters more than it looks.  Every booster here was fitted with early
    stopping, so ``model.predict`` evaluates only trees ``0..best_iteration``
    while a raw ``booster.predict`` evaluates *all* of them.  Attributing over
    the full set produces SHAP values that do not add up to the prediction the
    rest of the library reports -- measured at 0.074 against an exact tolerance
    of ~1e-7 on this project's own checkpoints.  Silently wrong explanations
    are worse than no explanations, so the range is matched explicitly and the
    residual is reported on every result as ``additivity_error``.
    """
    getter = getattr(booster_model, "_get_iteration_range", None)
    if callable(getter):
        try:
            rng = getter(None)
            if rng and rng[1]:
                return (int(rng[0]), int(rng[1]))
        except Exception:
            pass
    best = getattr(booster_model, "best_iteration", None)
    if best is not None:
        return (0, int(best) + 1)
    return None


def _tree_shap(booster_model, x: np.ndarray, n_features: int) -> Tuple[np.ndarray, float]:
    """Exact TreeSHAP via XGBoost itself.

    Returns ``(values[n, n_features], base)``.  XGBoost appends the base value
    as a final column; it is identical for every row, so it is split out here.

    This is the same algorithm ``shap.TreeExplainer`` runs -- verified
    bit-identical, max difference 0.0 -- but it avoids making ``shap`` a hard
    dependency of the core explanation path.
    """
    booster = booster_model.get_booster()
    dmatrix = xgb.DMatrix(np.asarray(x, dtype=np.float32))
    kwargs: Dict[str, Any] = {"pred_contribs": True}
    rng = _iteration_range(booster_model)
    if rng is not None:
        kwargs["iteration_range"] = rng
    raw = booster.predict(dmatrix, **kwargs)
    if raw.ndim != 2 or raw.shape[1] != n_features + 1:
        raise RuntimeError(
            f"unexpected pred_contribs shape {raw.shape}; expected "
            f"(n, {n_features + 1})"
        )
    return raw[:, :-1], float(raw[0, -1])


class RainfallExplainer:
    """SHAP for the multi-horizon rainfall model.

    One booster per lead time means one explanation per lead time.  A forecast
    for +1 h and one for +12 h genuinely rest on different features, and
    collapsing them into a single story would hide that.
    """

    def __init__(self, forecaster):
        from ne_rainfall.predict_xgb import XGBRainfallForecaster

        if not isinstance(forecaster, XGBRainfallForecaster):
            raise TypeError(
                "RainfallExplainer needs an XGBRainfallForecaster; "
                f"got {type(forecaster).__name__}. SHAP here is TreeSHAP, which "
                "is exact for tree ensembles only -- see docs/SHAP.md for what "
                "to do about the neural models."
            )
        self.fc = forecaster
        self.model = forecaster.model
        self.scaler = forecaster.scaler

    @classmethod
    def from_forecaster(cls, forecaster) -> "RainfallExplainer":
        return cls(forecaster)

    @classmethod
    def load(cls, directory: str | Path) -> "RainfallExplainer":
        from ne_rainfall.predict_xgb import XGBRainfallForecaster

        return cls(XGBRainfallForecaster.load(directory))

    # -- properties ----------------------------------------------------------
    @property
    def predictor_names(self) -> List[str]:
        names = self.fc.predictor_names
        if not names:
            raise RuntimeError(
                "this checkpoint carries no predictor names, so SHAP output "
                "cannot be labelled; retrain with ne_rainfall.train_xgb"
            )
        return names

    @property
    def n_horizons(self) -> int:
        return self.fc.n_steps_out

    # -- millimetre effects --------------------------------------------------
    def _effect_mm(self, pred_scaled: float, shap_row: np.ndarray) -> np.ndarray:
        """Millimetre effect of removing each feature's contribution.

        ``inverse(pred) - inverse(pred - phi_i)`` per feature.  Exact for each
        feature taken alone, and deliberately not summed: the inverse transform
        is non-linear, so any attempt to make millimetre contributions add up
        to the forecast would have to fudge them.
        """
        full_mm = float(self.scaler.inverse(np.array([pred_scaled]), 0)[0])
        without = self.scaler.inverse(pred_scaled - shap_row, 0)
        return full_mm - np.asarray(without, dtype=np.float64)

    # -- local ---------------------------------------------------------------
    def explain(
        self,
        window,
        horizon: int = 0,
        timestamps=None,
    ) -> LocalExplanation:
        """Explain one horizon of one forecast."""
        if not 0 <= horizon < self.n_horizons:
            raise IndexError(
                f"horizon must be in 0..{self.n_horizons - 1}, got {horizon}"
            )
        x = self._featurise(window, timestamps)
        if len(x) != 1:
            raise ValueError("explain() takes one window; use explain_batch()")
        return self._explain_row(x, 0, horizon)

    def explain_all_horizons(self, window, timestamps=None) -> List[LocalExplanation]:
        x = self._featurise(window, timestamps)
        return [self._explain_row(x, 0, h) for h in range(self.n_horizons)]

    def _explain_row(self, x: np.ndarray, row: int, horizon: int) -> LocalExplanation:
        names = self.predictor_names
        booster_model = self.model.regressors[horizon]
        values, base = _tree_shap(booster_model, x, len(names))

        shap_row = values[row]
        pred_scaled = float(booster_model.predict(x[row : row + 1])[0])
        additivity = abs(base + shap_row.sum() - pred_scaled)

        effects = self._effect_mm(pred_scaled, shap_row)
        contributions = [
            FeatureContribution(
                feature=names[i],
                value=float(x[row, i]),
                shap_scaled=float(shap_row[i]),
                effect_mm=float(effects[i]),
            )
            for i in range(len(names))
        ]
        # The model clips at zero; report the clipped forecast so the
        # explanation matches what predict() actually returns.
        pred_mm = float(self.scaler.inverse(np.array([max(pred_scaled, 0.0)]), 0)[0])
        return LocalExplanation(
            horizon=horizon,
            lead_time_min=self.fc.lead_times_min[horizon],
            prediction_mm=pred_mm,
            prediction_scaled=pred_scaled,
            base_scaled=base,
            base_mm=float(self.scaler.inverse(np.array([max(base, 0.0)]), 0)[0]),
            contributions=contributions,
            additivity_error=float(additivity),
        )

    # -- global --------------------------------------------------------------
    def global_importance(
        self,
        windows=None,
        x_features: Optional[np.ndarray] = None,
        timestamps=None,
        max_samples: int = 2000,
        verbose: bool = False,
    ) -> GlobalImportance:
        """Mean |SHAP| per feature, per horizon, over a sample of windows.

        This is a better global ranking than XGBoost's built-in ``gain``: gain
        counts how useful a split was during *training*, while mean |SHAP|
        measures actual influence on *predictions* over data you choose, and is
        consistent across models.
        """
        x = x_features if x_features is not None else self._featurise(windows, timestamps)
        if len(x) > max_samples:
            # Deterministic subsample: SHAP over every window is wasteful and
            # the ranking stabilises well before a few thousand rows.
            idx = np.linspace(0, len(x) - 1, max_samples).astype(int)
            x = x[idx]

        names = self.predictor_names
        per_h = np.empty((self.n_horizons, len(names)), dtype=np.float64)
        for h in range(self.n_horizons):
            values, _ = _tree_shap(self.model.regressors[h], x, len(names))
            per_h[h] = np.abs(values).mean(axis=0)
            if verbose:
                print(f"  horizon {h + 1}/{self.n_horizons}", flush=True)

        return GlobalImportance(
            feature_names=names,
            mean_abs_shap=per_h.mean(axis=0),
            per_horizon=per_h,
            lead_times_min=self.fc.lead_times_min,
            n_samples=len(x),
        )

    def shap_matrix(
        self, windows=None, horizon: int = 0, x_features=None, timestamps=None
    ) -> Tuple[np.ndarray, np.ndarray, List[str]]:
        """``(shap_values, feature_values, names)`` -- the input to any plot."""
        x = x_features if x_features is not None else self._featurise(windows, timestamps)
        names = self.predictor_names
        values, _ = _tree_shap(self.model.regressors[horizon], x, len(names))
        return values, x, names

    # -- helper --------------------------------------------------------------
    def _featurise(self, window, timestamps) -> np.ndarray:
        raw = self.fc._as_array(window)
        return self.fc._featurise(raw, timestamps=timestamps)


class LandslideExplainer:
    """SHAP for the landslide susceptibility classifier.

    Contributions are in **log-odds**, which is the classifier's output space
    and where SHAP is additive.  Converting to probability breaks additivity
    the same way millimetres do for rainfall, so ``effect_probability`` is
    reported as a per-feature marginal and is not summed.
    """

    def __init__(self, model):
        self.model = model.model if hasattr(model, "model") else model
        if getattr(self.model, "booster", None) is None:
            raise RuntimeError("landslide model is not fitted")

    @classmethod
    def load(cls, directory: str | Path) -> "LandslideExplainer":
        from ne_rainfall.predict_xgb import LandslideRiskModel

        return cls(LandslideRiskModel.load(directory))

    @property
    def feature_names(self) -> List[str]:
        names = self.model.feature_names
        if not names:
            raise RuntimeError("model carries no feature names")
        return names

    @staticmethod
    def _sigmoid(z: np.ndarray) -> np.ndarray:
        return 1.0 / (1.0 + np.exp(-np.asarray(z, dtype=np.float64)))

    def explain_pixels(self, x: np.ndarray, top: int = 10) -> List[Dict[str, Any]]:
        """Per-pixel attribution for a ``(n, n_features)`` feature matrix."""
        names = self.feature_names
        x = np.asarray(x, dtype=np.float32)
        values, base = _tree_shap(self.model.booster, x, len(names))

        out: List[Dict[str, Any]] = []
        for row in range(len(x)):
            logit = base + values[row].sum()
            prob = float(self._sigmoid(logit))
            order = np.argsort(np.abs(values[row]))[::-1][:top]
            out.append(
                {
                    "probability": round(prob, 4),
                    "base_probability": round(float(self._sigmoid(base)), 4),
                    "units_note": (
                        "shap_log_odds is exact and additive in log-odds; "
                        "effect_probability is a per-feature marginal and does "
                        "not sum to the probability"
                    ),
                    "contributions": [
                        {
                            "feature": names[i],
                            "value": round(float(x[row, i]), 4),
                            "shap_log_odds": round(float(values[row, i]), 5),
                            "effect_probability": round(
                                prob - float(self._sigmoid(logit - values[row, i])), 5
                            ),
                            "direction": (
                                "increased" if values[row, i] > 0 else "decreased"
                            ),
                        }
                        for i in order
                    ],
                }
            )
        return out

    def global_importance(self, x: np.ndarray, max_samples: int = 5000) -> GlobalImportance:
        names = self.feature_names
        x = np.asarray(x, dtype=np.float32)
        if len(x) > max_samples:
            idx = np.linspace(0, len(x) - 1, max_samples).astype(int)
            x = x[idx]
        values, _ = _tree_shap(self.model.booster, x, len(names))
        mean_abs = np.abs(values).mean(axis=0)
        return GlobalImportance(
            feature_names=names,
            mean_abs_shap=mean_abs,
            per_horizon=mean_abs[None, :],
            lead_times_min=[0],
            n_samples=len(x),
        )
