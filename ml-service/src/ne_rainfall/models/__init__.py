"""Model architectures.

The neural architectures are deliberately unchanged from the Mumbai repo in
shape and capacity: the same 4-layer/64-hidden LSTM, the same 5-layer Keras
stack, the same 6-layer Transformer with 3-way positional encoding.  Keeping
``n_features = 111`` means a Mumbai checkpoint is a valid initialisation for
the North East model, which is the cheapest accuracy win available when moving
region (see ``train.py --init-from``).

What did change is mechanical, not architectural:
  * hyperparameters come from config instead of module-level globals;
  * hidden/cell state is allocated on the input's device, so the PyTorch LSTM
    actually runs on GPU (the original hard-allocated on CPU and would raise a
    device mismatch under CUDA);
  * dropout between LSTM layers is exposed, off by default for parity.

The gradient-boosted models (:class:`XGBRainfallModel`,
:class:`XGBLandslideModel`) are additions, not replacements -- see
``docs/XGBOOST.md``.

Imports are lazy: PyTorch, TensorFlow and XGBoost are independent optional
dependencies, and pulling this package must not force all three on a host that
only installed one.
"""

from typing import TYPE_CHECKING, Any

if TYPE_CHECKING:  # pragma: no cover - for type checkers only
    from ne_rainfall.models.lstm_torch import LSTMModel, build_lstm_torch
    from ne_rainfall.models.xgb_landslide import XGBLandslideModel
    from ne_rainfall.models.xgb_rainfall import XGBRainfallModel

_LAZY = {
    "LSTMModel": "ne_rainfall.models.lstm_torch",
    "build_lstm_torch": "ne_rainfall.models.lstm_torch",
    "load_mumbai_checkpoint": "ne_rainfall.models.lstm_torch",
    "build_lstm_tf": "ne_rainfall.models.lstm_tf",
    "TransformerModel": "ne_rainfall.models.transformer",
    "build_transformer": "ne_rainfall.models.transformer",
    "make_transformer_windows": "ne_rainfall.models.transformer",
    "XGBRainfallModel": "ne_rainfall.models.xgb_rainfall",
    "XGBLandslideModel": "ne_rainfall.models.xgb_landslide",
}

__all__ = sorted(_LAZY)


def __getattr__(name: str) -> Any:
    """Import the backing module only when its model is actually requested."""
    module = _LAZY.get(name)
    if module is None:
        raise AttributeError(f"module {__name__!r} has no attribute {name!r}")
    import importlib

    return getattr(importlib.import_module(module), name)


def __dir__():
    return sorted(set(__all__) | set(globals()))
