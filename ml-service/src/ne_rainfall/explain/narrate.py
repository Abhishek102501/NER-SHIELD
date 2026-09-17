"""Turn SHAP numbers into a sentence a duty forecaster can act on.

A table of 93 signed floats is not an explanation to anyone outside the team
that built the model.  This module maps predictor names back to what they
physically are and writes the attribution as prose.

It is deliberately conservative: it states magnitudes and directions, and it
does not claim causation.  SHAP says what the *model* used, which is not the
same as what *caused* the rain.
"""

from __future__ import annotations

import re
from typing import TYPE_CHECKING, Dict, List, Optional

if TYPE_CHECKING:  # pragma: no cover
    from ne_rainfall.explain.shap_values import FeatureContribution, LocalExplanation

# Physical readings for the engineered predictor families.
_BLOCK_WORDS: Dict[str, str] = {
    "rainfall": "observed rainfall",
    "wind_speed": "wind speed",
    "nwp_precip": "the NWP rainfall forecast",
    "temperature": "temperature",
    "humidity": "humidity",
    "cape": "convective available potential energy",
}

_STATIC: Dict[str, str] = {
    "tgt_elevation_m": "the target station's elevation",
    "hour_sin": "the time of day",
    "hour_cos": "the time of day",
    "doy_sin": "the point in the season",
    "doy_cos": "the point in the season",
    "month": "the calendar month",
    "region_stations_wet_now": "how many nearby stations are currently wet",
    "nwp_minus_obs_last": "the NWP's current bias against observations",
    "nwp_minus_obs_mean": "the NWP's average bias across the lookback window",
}

_STAT_WORDS: Dict[str, str] = {
    "mean": "average",
    "max": "peak",
    "std": "variability",
    "spread": "spread",
    "trend": "trend",
    "last_mean": "current average",
    "last_max": "current peak",
}


def describe_feature(name: str) -> str:
    """Plain-language reading of one engineered predictor name."""
    if name in _STATIC:
        return _STATIC[name]

    # tgt_<block>_t-<k>   e.g. tgt_rainfall_t-1
    m = re.match(r"^tgt_(\w+?)_t-(\d+)$", name)
    if m:
        block, back = m.group(1), int(m.group(2))
        step = "the latest step" if back == 1 else f"{back} steps ago"
        return f"{_BLOCK_WORDS.get(block, block)} at the target station, {step}"

    # tgt_<block>_accum<k>
    m = re.match(r"^tgt_(\w+?)_accum(\d+)$", name)
    if m:
        block, k = m.group(1), int(m.group(2))
        return (
            f"{_BLOCK_WORDS.get(block, block)} accumulated over the last "
            f"{k} step{'s' if k > 1 else ''} at the target station"
        )

    # tgt_<block>_<stat>
    m = re.match(r"^tgt_(\w+?)_(mean|max|std|trend)$", name)
    if m:
        block, stat = m.group(1), m.group(2)
        return (
            f"the {_STAT_WORDS.get(stat, stat)} of "
            f"{_BLOCK_WORDS.get(block, block)} at the target station"
        )

    # region_<block>_<stat> / upwind_<block>_<stat>
    m = re.match(r"^(region|upwind)_(\w+?)_(mean|max|std|spread|last_mean|last_max)$", name)
    if m:
        scope, block, stat = m.group(1), m.group(2), m.group(3)
        where = (
            "across the station network"
            if scope == "region"
            else "at stations upwind (south and west) of the target"
        )
        return f"the {_STAT_WORDS.get(stat, stat)} of {_BLOCK_WORDS.get(block, block)} {where}"

    # flatten mode: t-<k>|<block>|<station>
    m = re.match(r"^t-(\d+)\|(\w+?)\|(.+)$", name)
    if m:
        back, block, station = int(m.group(1)), m.group(2), m.group(3)
        return f"{_BLOCK_WORDS.get(block, block)} at {station}, {back} steps ago"

    return name.replace("_", " ")


def _fmt_mm(v: float) -> str:
    a = abs(v)
    if a >= 0.05:
        return f"{a:.2f} mm"
    if a >= 0.005:
        return f"{a:.3f} mm"
    return "a negligible amount"


def narrate(explanation: "LocalExplanation", n: int = 5) -> str:
    """Write the attribution as prose."""
    lead = explanation.lead_time_min
    lead_s = f"{lead} minutes" if lead < 120 else f"{lead / 60:.0f} hours"

    lines = [
        f"Forecast for +{lead_s}: {explanation.prediction_mm:.2f} mm "
        f"(the model's average output is {explanation.base_mm:.2f} mm).",
    ]

    up = explanation.top(n, by="positive")
    down = explanation.top(n, by="negative")

    if up:
        lines.append("")
        lines.append("Pushed the forecast UP:")
        for c in up:
            lines.append(
                f"  +{_fmt_mm(c.effect_mm):<16} {describe_feature(c.feature)}"
            )
    if down:
        lines.append("")
        lines.append("Pulled the forecast DOWN:")
        for c in down:
            lines.append(
                f"  -{_fmt_mm(c.effect_mm):<16} {describe_feature(c.feature)}"
            )

    if not up and not down:
        lines.append("")
        lines.append(
            "No feature moved this forecast materially -- the model fell back "
            "on its average output."
        )

    lines += [
        "",
        "Millimetre figures are each feature's own marginal effect and do not "
        "sum to the forecast; the exact additive decomposition is in "
        "shap_scaled. SHAP describes what the model used, not what caused the "
        "rain.",
    ]
    return "\n".join(lines)


def narrate_global(importance, n: int = 10) -> str:
    """Prose summary of a :class:`GlobalImportance` ranking."""
    lines = [
        f"Most influential predictors across {importance.n_samples} forecasts "
        f"(mean |SHAP|):",
        "",
    ]
    for rank, (name, val) in enumerate(importance.top(n), 1):
        lines.append(f"  {rank:>2}. {val:.5f}   {describe_feature(name)}")
    lines += [
        "",
        "Mean |SHAP| measures influence on actual predictions, which is a "
        "different question from XGBoost's 'gain' -- gain scores how useful a "
        "split was while training.",
    ]
    return "\n".join(lines)
