from datetime import datetime, timedelta, timezone

import pytest

from nershield_ml.northeast_rainfall.config import SEQUENCE_LENGTH, STATION_ORDER
from nershield_ml.northeast_rainfall.inference.preprocessing import HistoricalObservation


def _obs_at(ts: datetime, value: float) -> HistoricalObservation:
    return HistoricalObservation(
        timestamp=ts,
        rainfall={s: value for s in STATION_ORDER},
        wind_speed={s: 3.0 for s in STATION_ORDER},
        nwp_precip={s: value for s in STATION_ORDER},
    )


@pytest.fixture
def valid_window() -> list[HistoricalObservation]:
    start = datetime(2026, 6, 1, tzinfo=timezone.utc)
    return [_obs_at(start + timedelta(minutes=60 * i), value=1.0 + 0.2 * i) for i in range(SEQUENCE_LENGTH)]


@pytest.fixture
def short_window() -> list[HistoricalObservation]:
    start = datetime(2026, 6, 1, tzinfo=timezone.utc)
    return [_obs_at(start + timedelta(minutes=60 * i), value=1.0) for i in range(SEQUENCE_LENGTH - 1)]
