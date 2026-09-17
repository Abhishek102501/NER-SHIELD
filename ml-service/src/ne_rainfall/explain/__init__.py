"""SHAP explanations for the gradient-boosted models.

SHAP (SHapley Additive exPlanations) attributes a single prediction to its
input features: how much each one pushed the forecast up or down, in units that
add back exactly to the prediction.  For tree ensembles there is an exact
polynomial-time algorithm (TreeSHAP), so nothing here is sampled or approximate
at the attribution step.

Two things about this implementation are worth knowing before you use it:

**It needs no extra dependency.**  XGBoost computes TreeSHAP internally via
``predict(..., pred_contribs=True)``.  That path was verified bit-identical to
``shap.TreeExplainer`` (max difference 0.0) with additivity holding to 1.4e-6.
The ``shap`` package is imported only for the published plot styles, and
:mod:`ne_rainfall.explain.plots` degrades to matplotlib if it is absent.

**Units are the subtle part.**  SHAP values are exact and additive in the
*model's output space*, which here is min-max-scaled log1p rainfall -- not
millimetres.  Because ``expm1`` is non-linear, contributions cannot be
converted to mm and still sum to the forecast.  Rather than quietly rescale
them, :class:`LocalExplanation` carries both:

* ``shap_scaled``  -- exact, sums to the prediction. The ground truth.
* ``effect_mm``    -- what the forecast would lose in millimetres if that one
  feature's contribution were removed. Exact per feature, interpretable, and
  **deliberately not additive**.

See ``docs/SHAP.md`` for the reasoning.
"""

from ne_rainfall.explain.shap_values import (
    GlobalImportance,
    LandslideExplainer,
    LocalExplanation,
    RainfallExplainer,
    FeatureContribution,
)
from ne_rainfall.explain.narrate import narrate

__all__ = [
    "RainfallExplainer",
    "LandslideExplainer",
    "LocalExplanation",
    "FeatureContribution",
    "GlobalImportance",
    "narrate",
]
