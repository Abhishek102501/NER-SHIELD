"""Configuration and station/feature ordering for the North East rainfall
module — mirrors `landslide4sense.config` / the old `mumbai_rainfall.config`.

`STATION_ORDER`/`BLOCKS` below are used only for demo mode (there is no
loaded checkpoint to read them from). In real mode, the loaded
`RainfallForecaster`'s own `.stations`/`.blocks`/`.feature_names` are the
source of truth — see `model/registry.py`.
"""

from __future__ import annotations

from pathlib import Path
from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict

# 37 North East stations, in the order the vendored project's own
# data/stations_northeast.csv lists them (README table, State column order) —
# NOT invented. Real trained checkpoints carry their own authoritative order
# in .meta; this copy is used only to build demo-mode windows.
STATION_ORDER: list[str] = [
    "Guwahati", "Dibrugarh", "Jorhat", "Silchar", "Tezpur", "North Lakhimpur",
    "Dhubri", "Nagaon", "Golaghat", "Bongaigaon", "Barpeta", "Diphu",
    "Shillong", "Sohra Cherrapunji", "Mawsynram", "Tura", "Jowai",
    "Itanagar", "Pasighat", "Tawang", "Ziro", "Tezu", "Bomdila",
    "Kohima", "Dimapur", "Mokokchung",
    "Imphal", "Churachandpur", "Ukhrul",
    "Aizawl", "Lunglei", "Champhai",
    "Agartala", "Dharmanagar", "Udaipur",
    "Gangtok", "Namchi",
]

NUM_STATIONS = len(STATION_ORDER)  # 37
BLOCKS = ["rainfall", "wind_speed", "nwp_precip"]
NUM_FEATURES = NUM_STATIONS * len(BLOCKS)  # 111
SEQUENCE_LENGTH = 12  # 12h lookback, hourly
FORECAST_HORIZON = 12  # 12h ahead, hourly
INTERVAL_MINUTES = 60
DEFAULT_TARGET_STATION = "Guwahati"


class NortheastRainfallSettings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_prefix="northeast_rainfall_", extra="ignore")

    model_enabled: bool = True
    model_path: Path | None = None
    # Optional second forecaster (XGBRainfallModel, a directory checkpoint —
    # see ne_rainfall.predict_xgb). When both this and model_path load
    # successfully, real-mode forecasts become an ensemble of the two
    # (ne_rainfall.EnsembleForecaster) and confidence/confidence_available
    # are populated from their disagreement — see model/registry.py and
    # pipeline.py. Absent or failing to load is not an error: real mode
    # still runs on the LSTM alone, exactly as before this existed.
    xgb_model_path: Path | None = None
    device: Literal["auto", "cpu", "cuda"] = "auto"
    forecast_hours: int = 12
    # real = load and run the checkpoint at model_path. demo = deterministic,
    # clearly-labeled placeholder (no checkpoint needed). Code-level default
    # stays "demo" as a safe fallback for an environment with no `.env` (the
    # checkpoint itself is gitignored, so a fresh clone has neither) — see
    # README.md#north-east-rainfall-forecasting. `.env`/`.env.example` set
    # `real` for a normal dev environment, since `models/northeast_lstm_torch.pt`
    # now ships with genuinely measured skill (mean_corr_scaled ≈ 0.46).
    inference_mode: Literal["real", "demo"] = "demo"

    # Real IMD hourly rainfall-intensity breakpoints (mm/hour) — an actual
    # published meteorological standard, not invented, and unscaled (unlike
    # the earlier Mumbai module, which had to approximate a 15-minute
    # equivalent). Still NOT an official NER-SHIELD flood-warning threshold.
    severity_moderate_mm: float = 2.5
    severity_high_mm: float = 7.6
    severity_critical_mm: float = 35.5


northeast_rainfall_settings = NortheastRainfallSettings()
