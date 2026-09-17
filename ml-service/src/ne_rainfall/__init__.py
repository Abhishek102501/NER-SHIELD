"""North East India rainfall nowcasting.

A region-portable rebuild of the Mumbai rainfall forecasting pipeline
(github.com/omkar-nitsure/Mumbai_RainFall_Forecasting).

The model architectures, tensor shapes and training procedure are unchanged;
only the region definition and the data-acquisition layer are new.  That means
a checkpoint trained on Mumbai can be used to warm-start the North East model,
and vice versa.

Public surface (this is what you import from a host application)::

    from ne_rainfall import RainfallForecaster, load_config

    fc = RainfallForecaster.load("Models/ne_lstm_torch.pt")
    out = fc.predict_latest()          # live 12-hour forecast, JSON-ready

or, for the gradient-boosted model and the coupled landslide risk product::

    from ne_rainfall import XGBRainfallForecaster, CoupledRiskForecaster

    xgb = XGBRainfallForecaster.load("Models/northeast_xgb_rainfall")
    risk = CoupledRiskForecaster(xgb).assess(window, susceptibility=0.7)

and to ask *why* the model said that (SHAP, exact for tree ensembles)::

    from ne_rainfall import RainfallExplainer

    why = RainfallExplainer.from_forecaster(xgb).explain(window, horizon=0)
    print(why.narrate())
"""

# Must run before PyTorch or XGBoost loads. On macOS the two ship separate
# OpenMP runtimes, and mixing them in one process segfaults the interpreter
# in either import order. See ne_rainfall/_compat.py for the full story.
from ne_rainfall._compat import ensure_openmp_safety

ensure_openmp_safety()

from ne_rainfall.config import Config, load_config
from ne_rainfall.stations import StationSet, load_stations
from ne_rainfall.predict import RainfallForecaster, ForecastResult
from ne_rainfall.predict_xgb import (
    CoupledRiskForecaster,
    EnsembleForecaster,
    LandslideRiskModel,
    XGBRainfallForecaster,
)
from ne_rainfall.risk import RiskEngine

__version__ = "1.0.0"
__all__ = [
    "Config",
    "load_config",
    "StationSet",
    "load_stations",
    "RainfallForecaster",
    "ForecastResult",
    "XGBRainfallForecaster",
    "LandslideRiskModel",
    "EnsembleForecaster",
    "CoupledRiskForecaster",
    "RiskEngine",
    "RainfallExplainer",
    "LandslideExplainer",
    "LocalExplanation",
    "FeatureContribution",
    "__version__",
]


# The SHAP explainers need XGBoost, which is an optional dependency -- resolve
# them on first access so `import ne_rainfall` works without it installed.
_LAZY = {
    "RainfallExplainer": "ne_rainfall.explain",
    "LandslideExplainer": "ne_rainfall.explain",
    "LocalExplanation": "ne_rainfall.explain",
    "FeatureContribution": "ne_rainfall.explain",
}


def __getattr__(name):
    module = _LAZY.get(name)
    if module is None:
        raise AttributeError(f"module {__name__!r} has no attribute {name!r}")
    import importlib

    return getattr(importlib.import_module(module), name)


def __dir__():
    return sorted(set(__all__) | set(globals()) | set(_LAZY))
