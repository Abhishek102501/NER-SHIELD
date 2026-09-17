# Integrating into an existing project

The package is designed to be imported, not forked. One checkpoint file is the
only thing your application needs to pin — station order, block order, scaler,
horizon and frequency all travel inside it.

---

## Install

As a dependency of your project:

```bash
pip install -e /path/to/NorthEast_Rainfall_Forecasting
```

or vendor the folder and add it to `sys.path`. No global state, no import-time
side effects, no network calls on import.

---

## The three-line version

```python
from ne_rainfall import RainfallForecaster

fc = RainfallForecaster.load("Models/northeast_lstm_torch.pt")
forecast = fc.predict_latest()      # fetches its own inputs from open APIs
print(forecast.to_dict())           # JSON-ready
```

`predict_latest()` makes outbound HTTP calls. In a request handler, run it on a
schedule and cache the result instead — see "Serving" below.

---

## The contract

### What the model expects

```python
fc.describe()
# {
#   'region': 'North East India',
#   'model': 'lstm_torch',
#   'target_station': 'Guwahati',
#   'stations': ['Guwahati', 'Dibrugarh', ...],     # 37, order is significant
#   'blocks': ['rainfall', 'wind_speed', 'nwp_precip'],
#   'n_features': 111,
#   'n_steps_in': 12,
#   'n_steps_out': 12,
#   'freq': '1h',
#   'lead_times_min': [60, 120, ..., 720],
#   'training_metrics': {...}
# }
```

`fc.feature_names` gives the exact column order as `block::station` strings.
**Column order is not checked at runtime for unlabelled input** — a silently
permuted matrix produces confident nonsense. Pass a `DataFrame` with named
columns and the forecaster reorders for you:

```python
df = pd.DataFrame(my_data, columns=fc.feature_names)   # 12 rows x 111 cols
forecast = fc.predict(df)
```

### What it returns

`ForecastResult` — millimetres, non-negative, one value per lead time:

```python
forecast.rainfall_mm     # [0.4, 1.2, 3.8, ...]  len == n_steps_out
forecast.total_mm        # sum over the horizon
forecast.valid_times     # list[datetime]
forecast.to_frame()      # pandas DataFrame
forecast.to_dict()       # JSON-serialisable
forecast.warnings        # per-station upstream failures, if any
```

`to_dict()` shape:

```json
{
  "station": "Guwahati",
  "region": "North East India",
  "model": "lstm_torch",
  "units": "mm",
  "issued_at": "2026-09-14T09:00:00",
  "total_mm": 12.43,
  "steps": [
    {"valid_time": "2026-09-14T10:00:00", "lead_time_min": 60, "rainfall_mm": 0.42}
  ],
  "warnings": []
}
```

---

## Feeding your own data

If your project already has gauge or sensor data, skip the download layer
entirely:

```python
import numpy as np, pandas as pd
from ne_rainfall import RainfallForecaster

fc = RainfallForecaster.load("Models/northeast_lstm_torch.pt")

window = pd.DataFrame(index=range(fc.n_steps_in), columns=fc.feature_names, dtype=float)
for station in fc.stations:
    window[f"rainfall::{station}"]   = my_rain_mm[station]      # mm per step
    window[f"wind_speed::{station}"] = my_wind_ms[station]      # m/s
    window[f"nwp_precip::{station}"] = my_nwp_mm[station]       # mm per step

forecast = fc.predict(window)
```

Units matter: rainfall and NWP precipitation in **millimetres accumulated over
one step**, wind speed in **m/s**. The scaler was fitted on those units and
cannot detect that you passed cm/h.

### Batch scoring

```python
windows = np.stack([...])           # (n, 12, 111)
mm = fc.predict_batch(windows)      # (n, 12) in millimetres
```

---

## Serving

### Cached, scheduled refresh (recommended)

The upstream APIs are rate-limited and the inputs only change once per step, so
forecast on a timer and serve from cache:

```python
import threading, time

_cache = {"forecast": None, "at": 0.0}
_lock = threading.Lock()
TTL = 15 * 60

def current_forecast(fc):
    with _lock:
        if _cache["forecast"] is None or time.time() - _cache["at"] > TTL:
            _cache["forecast"] = fc.predict_latest()
            _cache["at"] = time.time()
        return _cache["forecast"]
```

A working FastAPI service is in `examples/fastapi_service.py`, and
`examples/integrate_minimal.py` is the smallest complete integration.

### Cost and latency

* `predict()` on a prepared window: single-digit milliseconds on CPU.
* `predict_latest()`: dominated by 111 HTTP calls. Responses are cached on disk
  by `data/raw/cache`, so a repeat within a step is fast, but a cold call takes
  a minute or two. **Never call it inline in a request handler.**

---

## Retargeting

### A different station

Any of the 37 can be the target — retrain with it in column 0:

```bash
python -m ne_rainfall.train --config config/northeast.yaml   # after editing
# model.target_station: Shillong
```

Per-station checkpoints are independent files; load whichever you need.

### A different region entirely

Copy `config/northeast.yaml`, change `region.bbox`, `region.stations_file`,
`season` and `model.target_station`, and point a station CSV at your sites.
Nothing else changes. Keep the station count at 37 to stay checkpoint-compatible;
if you change it, set `model.n_features` to match — `build_dataset` refuses to
run on a mismatch rather than producing a matrix no checkpoint can read.

---

## Operational cautions

These are forecasts from a research model, and the honest framing matters if
anything downstream touches public safety:

* **Validate against IMD before operational use.** The default training data is
  ERA5 reanalysis, which smooths extreme orographic rainfall — exactly the
  events that matter most in Meghalaya. See `docs/DATA_SOURCES.md`.
* **Check the persistence baseline in your evaluation report.** A model that
  does not beat persistence has learned nothing, however good the correlation
  looks.
* **Surface `forecast.warnings`.** A forecast built from a partially failed
  fetch is still returned, with the failures listed. Do not discard them.
* **This is not a flood warning system.** It predicts rainfall at a point.
  Flood risk depends on catchment state, river stage and drainage that this
  model knows nothing about.

---

## The gradient-boosted models

Same contract, different import. `XGBRainfallForecaster` mirrors
`RainfallForecaster` method for method, returns the same `ForecastResult`, and
uses the same `feature_names` column order — so swapping one for the other is a
one-line change.

```python
from ne_rainfall import XGBRainfallForecaster

fc = XGBRainfallForecaster.load("Models/northeast_xgb_rainfall")
result = fc.predict(window, timestamps=[last_input_time])
result.rainfall_mm          # millimetres per step
result.extra["exceedance"]  # calibrated P(> threshold) per step
```

Three differences that matter:

1. **A checkpoint is a directory, not a file.** Boosters are stored as
   XGBoost-native JSON (survives library upgrades, inspectable, loadable from
   other language bindings) plus a `forecaster_meta.json` sidecar.

2. **`timestamps` is required** when the model was trained with cyclical time
   features — one per window, marking the **last input step**, not the issue
   time. The forecaster raises a clear error rather than silently
   mis-predicting. `fc.describe()["uses_time_features"]` tells you.

3. **`result.extra["exceedance"]`** carries calibrated probabilities the neural
   model has no equivalent for. Prefer these over thresholding the regression —
   see [XGBOOST.md](XGBOOST.md).

### Ensemble and risk

```python
from ne_rainfall import EnsembleForecaster, RainfallForecaster, CoupledRiskForecaster

ens = EnsembleForecaster([
    XGBRainfallForecaster.load("Models/northeast_xgb_rainfall"),
    RainfallForecaster.load("Models/northeast_lstm_torch.pt"),
])
out = ens.predict(window, timestamps=stamps)
out["spread_mm"]      # per-step disagreement -- your uncertainty

risk = CoupledRiskForecaster(xgb, landslide_model).assess(
    window, susceptibility=0.72, timestamps=stamps,
)
risk["headline_risk"]      # 0-10
risk["rainfall"]["category"]   # IMD warning class
```

### ⚠️ macOS: loading both models in one process

PyTorch and XGBoost ship separate OpenMP runtimes. Mixing them in one process
segfaults the interpreter — **in either import order**, with no exception to
catch.

`ne_rainfall` handles this by setting `OMP_NUM_THREADS=1` at import time, but
**only if it is imported before torch and xgboost**. In a web app that means
importing it at module scope, not inside a request handler that runs after
something else has already pulled in torch:

```python
import ne_rainfall           # FIRST -- before torch or xgboost
from ne_rainfall import XGBRainfallForecaster, RainfallForecaster
```

You get a `RuntimeWarning` if it was too late. `python -m ne_rainfall.cli doctor`
reports the status.

To keep full threading, install both from one channel and opt out:

```bash
conda install -c conda-forge pytorch py-xgboost
export NE_RAINFALL_SKIP_OMP_GUARD=1
```

If you would rather not think about it: **run the two models in separate
processes**. That is the one approach with no caveats.
