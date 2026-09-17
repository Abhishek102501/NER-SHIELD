"""Risk inference: turn forecasts into decision-ready, confidence-bearing output.

The framing follows the DARPAN / ClimateTwinIndia layering
(github.com/aadityat23/ClimateTwinIndia): a state estimate is not a decision,
so every risk number here carries a confidence and every threshold is an
official IMD category rather than an invented cut-off.

Two products:

* :class:`~ne_rainfall.risk.engine.RainfallRisk` -- exceedance of IMD warning
  categories over the forecast horizon, with confidence.
* :class:`~ne_rainfall.risk.engine.LandslideRisk` -- susceptibility (terrain,
  from the Landslide4Sense model) combined with a rainfall trigger, which is
  the coupling that matters for the North East.
"""

from ne_rainfall.risk.thresholds import (
    IMD_CATEGORIES,
    IMDCategory,
    categorise,
    category_names,
)
from ne_rainfall.risk.engine import (
    LandslideRisk,
    RainfallRisk,
    RiskEngine,
    intensity_duration_exceedance,
)

__all__ = [
    "IMD_CATEGORIES",
    "IMDCategory",
    "categorise",
    "category_names",
    "RiskEngine",
    "RainfallRisk",
    "LandslideRisk",
    "intensity_duration_exceedance",
]
