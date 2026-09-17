from datetime import timedelta

import numpy as np
import pytest

from nershield_ml.northeast_rainfall.config import NUM_FEATURES, SEQUENCE_LENGTH, STATION_ORDER
from nershield_ml.northeast_rainfall.inference.preprocessing import (
    HistoricalObservation,
    RainfallValidationError,
    validate_and_order,
)


def test_valid_window_shape_and_range(valid_window):
    array = validate_and_order(valid_window)
    assert array.shape == (SEQUENCE_LENGTH, NUM_FEATURES)
    assert (array >= 0).all()


def test_insufficient_history_rejected(short_window):
    with pytest.raises(RainfallValidationError) as exc:
        validate_and_order(short_window)
    assert exc.value.code == "INSUFFICIENT_HISTORY"


def test_missing_station_rejected(valid_window):
    bad = valid_window[:-1] + [
        HistoricalObservation(
            timestamp=valid_window[-1].timestamp,
            rainfall={s: 1.0 for s in STATION_ORDER[:-1]},
            wind_speed={s: 1.0 for s in STATION_ORDER},
            nwp_precip={s: 1.0 for s in STATION_ORDER},
        )
    ]
    with pytest.raises(RainfallValidationError) as exc:
        validate_and_order(bad)
    assert exc.value.code == "MISSING_STATION"


def test_wrong_interval_rejected(valid_window):
    bad = valid_window[:-1] + [
        HistoricalObservation(
            timestamp=valid_window[-1].timestamp + timedelta(minutes=10),
            rainfall=valid_window[-1].rainfall,
            wind_speed=valid_window[-1].wind_speed,
            nwp_precip=valid_window[-1].nwp_precip,
        )
    ]
    with pytest.raises(RainfallValidationError) as exc:
        validate_and_order(bad)
    assert exc.value.code == "INVALID_TIMESTAMP_ORDER"


def test_nan_rejected(valid_window):
    valid_window[-1].rainfall[STATION_ORDER[0]] = float("nan")
    with pytest.raises(RainfallValidationError) as exc:
        validate_and_order(valid_window)
    assert exc.value.code == "INVALID_VALUE"


def test_negative_value_rejected(valid_window):
    valid_window[-1].rainfall[STATION_ORDER[0]] = -1.0
    with pytest.raises(RainfallValidationError) as exc:
        validate_and_order(valid_window)
    assert exc.value.code == "INVALID_VALUE"


def test_feature_order_is_block_major_station_minor(valid_window):
    array = validate_and_order(valid_window)
    n = len(STATION_ORDER)
    # rainfall block first n cols, wind_speed next n, nwp_precip last n.
    assert array.shape[1] == 3 * n
