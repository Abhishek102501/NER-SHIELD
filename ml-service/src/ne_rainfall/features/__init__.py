"""Feature engineering for the tree-based models.

The LSTM and Transformer consume the raw ``(n, n_steps_in, n_features)``
window directly -- learning their own temporal summary is the point of a
recurrent model.  XGBoost cannot: it needs one flat, fixed-width row per
sample, and its accuracy depends almost entirely on what that row contains.

Two builders live here:

* :mod:`~ne_rainfall.features.tabular` turns a rainfall window into a row of
  named, physically meaningful predictors (lags, accumulations, upwind
  aggregates, the NWP forecast itself, cyclical time).
* :mod:`~ne_rainfall.features.spectral` turns a Landslide4Sense 14-band pixel
  stack into reflectance indices plus terrain, for the susceptibility model.

Both emit ``feature_names`` alongside the matrix, so ``model.feature_importance()``
reports something a hydrologist can read instead of ``f412``.
"""

from ne_rainfall.features.tabular import (
    TabularFeatureBuilder,
    build_tabular_features,
)
from ne_rainfall.features.spectral import (
    BAND_NAMES,
    L4S_MEAN,
    L4S_STD,
    SpectralFeatureBuilder,
    spectral_indices,
)

__all__ = [
    "TabularFeatureBuilder",
    "build_tabular_features",
    "SpectralFeatureBuilder",
    "spectral_indices",
    "BAND_NAMES",
    "L4S_MEAN",
    "L4S_STD",
]
