"""Turns a caller-supplied historical window into the exact (12, 111) RAW
(mm / m-per-s) array `RainfallForecaster.predict()` expects — it does its own
scaling internally (see `ne_rainfall.preprocess.Scaler`), so unlike the old
Mumbai module this layer only has to validate and order, never normalize.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta

import numpy as np

from nershield_ml.northeast_rainfall.config import (
    BLOCKS,
    INTERVAL_MINUTES,
    NUM_FEATURES,
    SEQUENCE_LENGTH,
    STATION_ORDER,
)


class RainfallValidationError(ValueError):
    def __init__(self, code: str, message: str):
        self.code = code
        super().__init__(message)


@dataclass
class HistoricalObservation:
    timestamp: datetime
    rainfall: dict[str, float]
    wind_speed: dict[str, float]
    nwp_precip: dict[str, float]

    def block(self, name: str) -> dict[str, float]:
        return {"rainfall": self.rainfall, "wind_speed": self.wind_speed, "nwp_precip": self.nwp_precip}[name]


def _row_for(obs: HistoricalObservation, stations: list[str], blocks: list[str]) -> list[float]:
    missing: list[str] = []
    row: list[float] = []
    for block_name in blocks:
        group = obs.block(block_name)
        for station in stations:
            if station not in group:
                missing.append(f"{block_name}::{station}")
                row.append(0.0)
            else:
                row.append(float(group[station]))
    if missing:
        raise RainfallValidationError(
            "MISSING_STATION",
            f"Observation at {obs.timestamp.isoformat()} is missing: {', '.join(missing[:5])}"
            + (f" (+{len(missing) - 5} more)" if len(missing) > 5 else ""),
        )
    return row


def validate_and_order(
    observations: list[HistoricalObservation],
    stations: list[str] | None = None,
    blocks: list[str] | None = None,
    sequence_length: int = SEQUENCE_LENGTH,
) -> np.ndarray:
    """Returns a (sequence_length, n_features) float64 RAW array in
    `block::station` order. Raises `RainfallValidationError` on any problem
    — never returns a partially-valid window. `stations`/`blocks` default to
    the demo-mode constants; real mode passes the loaded checkpoint's own
    order instead.
    """
    stations = stations or STATION_ORDER
    blocks = blocks or BLOCKS
    n_features = len(stations) * len(blocks)

    if len(observations) < sequence_length:
        raise RainfallValidationError(
            "INSUFFICIENT_HISTORY",
            f"Need at least {sequence_length} historical observations (hourly steps), "
            f"got {len(observations)}.",
        )

    window = sorted(observations, key=lambda o: o.timestamp)[-sequence_length:]

    expected_gap = timedelta(minutes=INTERVAL_MINUTES)
    for prev, curr in zip(window, window[1:]):
        gap = curr.timestamp - prev.timestamp
        if gap != expected_gap:
            raise RainfallValidationError(
                "INVALID_TIMESTAMP_ORDER",
                f"Observations must be exactly {INTERVAL_MINUTES} minutes apart in order; "
                f"found a {gap} gap between {prev.timestamp.isoformat()} and {curr.timestamp.isoformat()}.",
            )

    rows = [_row_for(obs, stations, blocks) for obs in window]
    array = np.asarray(rows, dtype=np.float64)

    if not np.isfinite(array).all():
        raise RainfallValidationError("INVALID_VALUE", "Historical data contains NaN or infinite values.")
    if (array < 0).any():
        raise RainfallValidationError("INVALID_VALUE", "Historical rainfall/windspeed/NWP values must be non-negative.")

    assert array.shape == (sequence_length, n_features)
    return array
