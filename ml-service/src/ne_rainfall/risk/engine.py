"""Composite risk from a rainfall forecast and a susceptibility map.

Structure borrowed from DARPAN (ClimateTwinIndia): every risk number is
reported with a confidence, and confidence is derived from disagreement in the
inputs rather than asserted.  Here the ensemble spread between the LSTM and the
XGBoost forecast plays the role DARPAN's propagated observation variance plays
-- two models with different inductive biases agreeing is evidence; diverging
is a reason to widen the interval and say so.

The landslide coupling uses a rainfall intensity-duration (ID) threshold, the
standard empirical form in the landslide literature::

    I = a * D ** (-b)        I in mm/h, D in hours

The default constants are Caine's (1980) widely-cited global relation
(a = 14.82, b = 0.39).  **They are global, not calibrated for North East
India.**  Himalayan and Meghalaya-plateau studies report materially different
constants, and a real deployment must fit a and b against a regional landslide
inventory (Geological Survey of India publishes one).  They are exposed as
parameters for exactly that reason, and every output records which constants
produced it.
"""

from __future__ import annotations

from dataclasses import asdict, dataclass, field
from typing import Any, Dict, List, Optional, Sequence, Tuple

import numpy as np

from ne_rainfall.risk.thresholds import (
    HEAVY_MM,
    VERY_HEAVY_MM,
    categorise,
)

# Caine (1980) global intensity-duration threshold. Regional calibration needed.
CAINE_A = 14.82
CAINE_B = 0.39


def intensity_duration_exceedance(
    hourly_mm: Sequence[float],
    a: float = CAINE_A,
    b: float = CAINE_B,
) -> Dict[str, Any]:
    """Largest exceedance of an ID threshold across all durations in a forecast.

    For every duration D (1 step, 2 steps, ... the whole horizon) the mean
    intensity over the wettest run of that length is compared against
    ``a * D**-b``.  The ratio of the worst case is the trigger signal: > 1
    means some sustained burst in the forecast crosses the empirical threshold.

    Taking the wettest run rather than the leading run matters -- a storm
    arriving at hour 8 of a 12-hour forecast still triggers.
    """
    x = np.asarray(hourly_mm, dtype=np.float64).ravel()
    n = len(x)
    if n == 0:
        raise ValueError("empty forecast")

    best = {"ratio": 0.0, "duration_h": 0, "intensity_mm_h": 0.0, "threshold_mm_h": 0.0}
    csum = np.concatenate([[0.0], np.cumsum(x)])
    for d in range(1, n + 1):
        # Wettest window of length d, via the cumulative sum.
        totals = csum[d:] - csum[:-d]
        intensity = float(totals.max()) / d          # mm per step-hour
        threshold = a * (d ** -b)
        ratio = intensity / threshold if threshold > 0 else 0.0
        if ratio > best["ratio"]:
            best = {
                "ratio": round(float(ratio), 4),
                "duration_h": int(d),
                "intensity_mm_h": round(intensity, 3),
                "threshold_mm_h": round(float(threshold), 3),
            }
    best["exceeded"] = bool(best["ratio"] >= 1.0)
    best["constants"] = {"a": a, "b": b, "source": "Caine (1980), global -- "
                                                   "not calibrated for NE India"}
    return best


@dataclass
class RainfallRisk:
    station: str
    issued_for_hours: float
    total_mm: float
    peak_step_mm: float
    category: Dict[str, Any]
    exceedance: Dict[str, float]          # threshold mm -> probability
    risk_score: float                     # 0-10
    confidence: float                     # 0-1
    confidence_basis: str

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class LandslideRisk:
    susceptibility: float                 # 0-1, terrain only
    trigger: Dict[str, Any]               # ID-threshold result
    risk_score: float                     # 0-10, coupled
    confidence: float
    basis: str

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


class RiskEngine:
    """Turns forecasts into IMD-referenced risk with confidence.

    ``step_hours`` is the model's time step, needed to convert a per-step
    forecast into intensities.  It comes from the checkpoint, not a guess.
    """

    def __init__(
        self,
        step_hours: float = 1.0,
        id_a: float = CAINE_A,
        id_b: float = CAINE_B,
    ):
        if step_hours <= 0:
            raise ValueError("step_hours must be positive")
        self.step_hours = float(step_hours)
        self.id_a = id_a
        self.id_b = id_b

    # -- rainfall ------------------------------------------------------------
    def rainfall_risk(
        self,
        forecast_mm: Sequence[float],
        station: str = "",
        exceedance: Optional[Dict[float, float]] = None,
        ensemble: Optional[Sequence[Sequence[float]]] = None,
    ) -> RainfallRisk:
        """Score one station's forecast.

        ``exceedance`` are calibrated probabilities from the XGBoost classifier
        heads, keyed by threshold in mm.  When they are absent the score falls
        back to the deterministic total, and the confidence is reported lower
        to reflect that there is no probabilistic information behind it.

        ``ensemble`` is a set of alternative forecasts for the same window (for
        example LSTM and XGBoost).  Their disagreement sets the confidence.
        """
        f = np.asarray(forecast_mm, dtype=np.float64).ravel()
        total = float(f.sum())
        window_h = len(f) * self.step_hours
        cat = categorise(total, window_hours=window_h)

        exc = {float(k): float(v) for k, v in (exceedance or {}).items()}

        # Risk score: severity class is the backbone, exceedance probability
        # for the two IMD warning levels lifts it within the band.  Bounded to
        # 0-10 so it composes with the landslide score.
        score = cat["severity"] * (10.0 / 6.0)
        if exc:
            lift = 0.0
            lift += 1.5 * exc.get(HEAVY_MM, 0.0)
            lift += 2.5 * exc.get(VERY_HEAVY_MM, 0.0)
            score = min(10.0, score + lift)

        confidence, basis = self._confidence(f, ensemble, has_probabilities=bool(exc))

        return RainfallRisk(
            station=station,
            issued_for_hours=window_h,
            total_mm=round(total, 2),
            peak_step_mm=round(float(f.max()) if len(f) else 0.0, 2),
            category=cat,
            exceedance={f"{k:g}": round(v, 4) for k, v in exc.items()},
            risk_score=round(float(score), 2),
            confidence=round(confidence, 3),
            confidence_basis=basis,
        )

    def _confidence(
        self,
        forecast: np.ndarray,
        ensemble: Optional[Sequence[Sequence[float]]],
        has_probabilities: bool,
    ) -> Tuple[float, str]:
        if ensemble is not None and len(ensemble) >= 2:
            members = np.asarray(ensemble, dtype=np.float64)
            totals = members.sum(axis=1)
            mean = float(np.mean(totals))
            spread = float(np.std(totals))
            # Normalised spread -> confidence. A spread equal to the mean total
            # is treated as no usable agreement.
            rel = spread / mean if mean > 1e-6 else (0.0 if spread < 1e-6 else 1.0)
            conf = float(np.clip(1.0 - rel, 0.0, 1.0))
            return conf, (
                f"ensemble of {len(members)} models, relative spread "
                f"{rel:.2f} on the horizon total"
            )
        if has_probabilities:
            return 0.6, "single deterministic forecast with calibrated exceedance heads"
        return 0.4, (
            "single deterministic forecast, no exceedance probabilities -- "
            "treat the score as indicative only"
        )

    # -- landslide -----------------------------------------------------------
    def landslide_risk(
        self,
        susceptibility: float,
        forecast_mm: Sequence[float],
        susceptibility_confidence: float = 0.5,
    ) -> LandslideRisk:
        """Couple static susceptibility with a forecast rainfall trigger.

        Multiplicative, not additive: steep bare terrain with no rain is not at
        imminent risk, and torrential rain on flat stable ground is a flood
        problem rather than a landslide one.  Only the conjunction is dangerous,
        and a sum would score either alone as moderately risky.
        """
        s = float(np.clip(susceptibility, 0.0, 1.0))
        # Per-step forecast -> mm/h intensities.
        hourly = np.asarray(forecast_mm, dtype=np.float64).ravel() / self.step_hours
        trig = intensity_duration_exceedance(hourly, a=self.id_a, b=self.id_b)

        # Saturating trigger: ratio 1.0 (at threshold) maps to ~0.5, 2.0 to ~0.8.
        ratio = float(trig["ratio"])
        trigger_strength = ratio / (1.0 + ratio)
        score = 10.0 * s * trigger_strength

        conf = float(np.clip(susceptibility_confidence, 0.0, 1.0)) * 0.8
        return LandslideRisk(
            susceptibility=round(s, 4),
            trigger=trig,
            risk_score=round(score, 2),
            confidence=round(conf, 3),
            basis=(
                "susceptibility x saturating intensity-duration trigger; "
                "ID constants are the uncalibrated global Caine (1980) values "
                "-- fit them to a GSI regional inventory before operational use"
            ),
        )

    # -- combined ------------------------------------------------------------
    def combined(
        self,
        station: str,
        forecast_mm: Sequence[float],
        susceptibility: Optional[float] = None,
        exceedance: Optional[Dict[float, float]] = None,
        ensemble: Optional[Sequence[Sequence[float]]] = None,
        susceptibility_confidence: float = 0.5,
    ) -> Dict[str, Any]:
        """One JSON-ready record combining both hazards."""
        rain = self.rainfall_risk(
            forecast_mm, station=station, exceedance=exceedance, ensemble=ensemble
        )
        out: Dict[str, Any] = {"station": station, "rainfall": rain.to_dict()}
        if susceptibility is not None:
            out["landslide"] = self.landslide_risk(
                susceptibility, forecast_mm, susceptibility_confidence
            ).to_dict()
            out["headline_risk"] = round(
                max(rain.risk_score, out["landslide"]["risk_score"]), 2
            )
            out["headline_hazard"] = (
                "landslide"
                if out["landslide"]["risk_score"] > rain.risk_score
                else "rainfall"
            )
        else:
            out["headline_risk"] = rain.risk_score
            out["headline_hazard"] = "rainfall"
        return out
