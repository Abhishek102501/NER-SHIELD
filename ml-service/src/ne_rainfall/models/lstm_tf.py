"""Keras/TensorFlow LSTM stack (the original's "LSTM Model 1")."""

from __future__ import annotations

from typing import Any, Dict, List


def build_lstm_tf(cfg: Dict[str, Any], n_features: int, n_steps_in: int,
                  n_steps_out: int):
    """Sequential LSTM stack with a non-negative head.

    Same unit ladder as the original (100 -> 80 -> 64 -> 32 -> 16 -> Dense).
    The explicit ``Input`` layer replaces the deprecated ``input_shape=``
    argument on the first LSTM, which Keras 3 rejects.
    """
    try:
        import keras
    except ImportError as exc:  # pragma: no cover
        raise ImportError(
            "TensorFlow/Keras is required for this model: pip install tensorflow"
        ) from exc

    units: List[int] = list(cfg.get("units", [100, 80, 64, 32, 16]))
    layers = [keras.layers.Input(shape=(n_steps_in, n_features))]
    for i, u in enumerate(units):
        layers.append(keras.layers.LSTM(u, return_sequences=(i < len(units) - 1)))
    # ReLU on the head because rainfall is non-negative -- kept from the
    # original, and it stays correct under the log1p transform, since log1p of
    # a non-negative quantity is also non-negative.
    layers.append(keras.layers.Dense(n_steps_out, activation="relu"))

    model = keras.Sequential(layers)
    model.compile(optimizer="adam", loss="mse", metrics=["mae"])
    return model
