"""Generates a small, deterministic SYNTHETIC 12-hour historical window (37
stations x {rainfall, wind_speed, nwp_precip}) for demo mode and tests — NOT
real North East weather data. Values are RAW mm/m-per-s (unnormalized), same
convention `RainfallForecaster.predict()` expects.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

import numpy as np

from nershield_ml.northeast_rainfall.config import INTERVAL_MINUTES, SEQUENCE_LENGTH, STATION_ORDER
from nershield_ml.northeast_rainfall.inference.preprocessing import HistoricalObservation


def generate_demo_window(seed: int = 11, end: datetime | None = None) -> list[HistoricalObservation]:
    rng = np.random.default_rng(seed)
    end = end or datetime.now(timezone.utc).replace(minute=0, second=0, microsecond=0)

    observations: list[HistoricalObservation] = []
    # A mild, monotonically-building rain event over the 12h lookback —
    # deterministic given the seed, not meant to resemble a real storm.
    base_rain = np.linspace(1.0, 8.0, SEQUENCE_LENGTH)

    for i in range(SEQUENCE_LENGTH):
        ts = end - timedelta(minutes=INTERVAL_MINUTES * (SEQUENCE_LENGTH - 1 - i))
        rainfall = {s: max(0.0, float(base_rain[i] + rng.normal(0, 0.8))) for s in STATION_ORDER}
        wind_speed = {s: float(abs(rng.normal(3, 1.2))) for s in STATION_ORDER}
        nwp_precip = {s: float(abs(base_rain[i] * 1.1 + rng.normal(0, 1.0))) for s in STATION_ORDER}
        observations.append(
            HistoricalObservation(timestamp=ts, rainfall=rainfall, wind_speed=wind_speed, nwp_precip=nwp_precip)
        )

    return observations
