# NER-SHIELD ML Service

Phase 1: an XGBoost binary classifier that scores a hazard zone's landslide
risk (0-100), served over FastAPI. No U-Net, no LSTM — those are later
phases.

## Setup

```bash
cd ml-service
python -m venv .venv
.venv\Scripts\activate        # Windows
# source .venv/bin/activate   # macOS/Linux
pip install -e ".[dev]"
copy .env.example .env        # Windows; cp on macOS/Linux
```

## Data

No real hazard-zone dataset exists yet. Generate a **synthetic** one (every
row is clearly marked — see `src/nershield_ml/data/synthetic.py`'s module
docstring) so the pipeline is runnable end-to-end:

```bash
python -m nershield_ml.data.synthetic --n-rows 2000 --out data/synthetic_hazard_zones.csv
```

To train on real data instead, provide a CSV or GeoParquet matching the
column contract documented in `src/nershield_ml/data/schema.py`
(`slope`, `elevation`, `aspect`, `curvature`, `drainage_proximity`,
`land_cover`, `soil_type`, `lithology`, `ndvi`, `rainfall_3d`, `rainfall_7d`,
`rainfall_15d`, `historical_incident_count`, `zone_id`, `district`,
`landslide_occurred`). `district` must have at least 2 distinct values — it's
the spatial cross-validation grouping key.

## Train

```bash
python -m nershield_ml.training.train data/synthetic_hazard_zones.csv
```

This runs spatially-blocked cross-validation (whole districts held out per
fold — see `training/train.py`'s module docstring for why), prints
precision/recall/PR-AUC/confusion-matrix per fold and pooled, then fits and
calibrates the final model and writes it to `models/model_<version>.joblib`
(plus a `.json` metadata sidecar and an updated `models/latest.json` pointer).

## Serve

```bash
uvicorn nershield_ml.api.main:app --host 0.0.0.0 --port 8000 --reload
```

Port 8000 matches the Spring Boot backend's `AI_SERVICE_BASE_URL` default
(`backend/.env.example`) — keep them in sync if you change either.

### `GET /health`

```json
{"status": "UP", "model_loaded": true, "model_version": "xgb-20260909-020000", "last_trained": "2026-09-09T02:00:00+00:00"}
```

Field names match `backend/src/main/java/com/nershield/ai/dto/AIHealthResponse.java`
exactly.

### `POST /predict`

Request body: one hazard zone's raw feature vector (see
`api/schemas.py::HazardZoneFeatures` for the full field list/ranges — same
example is in that model's `json_schema_extra`, and in the interactive docs
at `/docs`).

Response:

```json
{
  "score": 71,
  "risk_band": "High",
  "confidence": 0.42,
  "model_version": "xgb-20260909-020000",
  "factors": [
    {"feature": "rainfall_15d", "contribution": 0.83},
    {"feature": "slope", "contribution": 0.61},
    {"feature": "drainage_proximity", "contribution": -0.34}
  ]
}
```

`factors` come from SHAP TreeExplainer on the base model — never a
hand-picked heuristic. If no model is loaded, `/predict` returns `503`, never
a fabricated score.

## Tests

```bash
pytest
```

## Landslide4Sense

`src/nershield_ml/landslide4sense/` adds landslide detection/segmentation via
the official [Landslide4Sense-2022](https://github.com/iarai/Landslide4Sense-2022)
U-Net baseline (MIT license — see `THIRD_PARTY_NOTICES.md`; architecture and
per-channel normalization constants are reproduced verbatim from that repo,
not invented).

### Input: 14 channels

Every analysis needs three co-registered GeoTIFFs, all same CRS/resolution/
extent:

| Input | Bands | Notes |
|---|---|---|
| Sentinel-2 composite | 12 (B1-B12) | one multi-band raster |
| Slope | 1 | degrees |
| DEM | 1 | elevation |

Channel order fed to the model: `B1..B12, SLOPE, DEM` (see `config.py::CHANNEL_ORDER`).
Validation (`inference/validation.py`) rejects anything that doesn't match —
wrong band count, mismatched CRS, mismatched resolution/extent, unreadable or
empty rasters, non-GeoTIFF formats — with a specific error code
(`INVALID_BAND_COUNT`, `CRS_MISMATCH`, `RESOLUTION_MISMATCH`,
`EXTENT_MISMATCH`, `MISSING_DEM`, `MISSING_SLOPE`, `INVALID_RASTER`,
`UNSUPPORTED_FORMAT`, `EMPTY_RASTER`) rather than continuing on bad data.

### Model weights

**No pretrained checkpoint is committed to this repository** — it's a large
binary artifact with its own hosting/licensing on the upstream project's
side, not something to vendor into git. To run real inference:

1. Obtain the official pretrained weights (or train your own against
   `model/unet.py`, which is architecture-identical to the upstream
   `model/Networks.py`) from the Landslide4Sense-2022 project.
2. Set `LANDSLIDE_MODEL_PATH` to the `.pth` file and `LANDSLIDE_INFERENCE_MODE=real`.
3. Restart the service — startup logs and `GET /landslide/health` report
   whether the checkpoint actually loaded (`loaded: true/false`, `reason` on
   failure). The service never reports itself healthy with a model it
   couldn't actually load.

Without a checkpoint, keep `LANDSLIDE_INFERENCE_MODE=mock` (the default): a
deterministic, clearly-labeled placeholder pipeline runs instead (derived
from the slope channel, never `random()`), so the full geospatial pipeline —
validation, tiling, polygonization, area, GeoJSON — is exercisable without
real weights. Every API response carries `"mode": "real"` or `"mode": "mock"`
so this is never ambiguous to a caller.

### Config (`.env`)

See `.env.example` for `LANDSLIDE_MODEL_PATH`, `LANDSLIDE_DEVICE` (`auto`
picks CUDA if available), `LANDSLIDE_THRESHOLD`, `LANDSLIDE_PATCH_SIZE`,
`LANDSLIDE_PATCH_OVERLAP`, `LANDSLIDE_BATCH_SIZE`, `LANDSLIDE_INFERENCE_MODE`.

### API

- `POST /landslide/analyze?demo_dataset=true` — or upload `sentinel`, `slope`,
  `dem` files (multipart) instead of the demo flag. Returns `202` immediately
  with an `analysis_id`; inference runs in a background thread (see
  `jobs.py` — an honest in-memory job store, not a real queue; state does not
  survive a service restart).
- `GET /landslide/analysis/{analysis_id}` — poll for `status`
  (`queued → preprocessing → running → postprocessing → completed|failed`),
  and on completion, `summary`, `detections[]`, and `geojson` (a
  FeatureCollection ready to add as a map source).
- `GET /landslide/health` — `available`, `loaded`, `device`, `model`,
  `version`, `inference_mode`, `reason` (why not loaded, if applicable).

### Demo data

`demo_data.py` generates a small, deterministic **synthetic** scene (NOT real
Sentinel-2 imagery) on demand — used by `demo_dataset=true` and by the test
fixtures — so the repo never needs to vendor real satellite imagery. To test
against real data, obtain Sentinel-2 L1C bands and a DEM/slope pair (e.g. via
Copernicus Open Access Hub + SRTM) for your area of interest, reproject them
onto one common grid, and upload them via `POST /landslide/analyze` instead.

### Confidence, severity — and their limits

`confidence` is the **mean model probability across a detection's pixels** —
it is model output confidence, not a validated real-world accuracy statistic,
and it is not a substitute for expert hazard assessment. `severity`
(`low`/`moderate`/`high`/`critical`) is a configurable classification derived
from confidence + affected area (`postprocessing.py::classify_severity`) —
it is **not an official hazard-classification standard**. Treat both as
decision-support signals, never as guaranteed real-world outcomes.

### Tests

```bash
pytest tests/landslide4sense/
```

Covers: band/CRS/resolution/extent validation, 14-channel preprocessing
shape/normalization, tiling coverage + overlap blending, mask cleanup +
georeferenced polygonization + area/centroid correctness, and an end-to-end
mock-mode API flow (analyze → poll → completed → geojson).

## North East Rainfall Forecasting

`src/nershield_ml/northeast_rainfall/` adds a short-term rainfall forecast
for North East India using the vendored `ne_rainfall` package
(`src/ne_rainfall/`, copied from a local `NorthEast_Rainfall_Forecasting`
project — itself an explicit regional port of
[omkar-nitsure/Mumbai_RainFall_Forecasting](https://github.com/omkar-nitsure/Mumbai_RainFall_Forecasting),
MIT licensed, see `THIRD_PARTY_NOTICES.md`). This **replaces** an earlier
Mumbai-specific integration — same architecture family, but region-portable,
with a self-describing checkpoint format the original Mumbai repo lacked.

### A real, validated checkpoint now ships

**Update 2026-09-16:** `models/northeast_lstm_torch.pt` is a genuinely
trained checkpoint (4 monsoon seasons, 2021-03-23 → 2024-10-31, 37 stations,
ERA5 + GFS via Open-Meteo) with **measured positive skill**:
`mean_corr_scaled ≈ 0.459`, `mean_corr_mm ≈ 0.367`, and it beats persistence
at every lead time (see `docs/ne_rainfall/reports/MODEL_COMPARISON.md` for
the full per-horizon table and honest caveats — notably, neither this nor the
companion XGBoost model usefully predicts hourly rainfall above ~2.5mm; use
the exceedance classifier heads for threshold decisions, not the raw
regression). `NORTHEAST_RAINFALL_INFERENCE_MODE` now defaults to `real`,
pointed at this checkpoint.

The earlier `models/northeast_smoke_test_DO_NOT_USE.pt` (54 days of data,
`mean_corr_scaled ≈ -0.05`, no measured skill) is superseded and kept only for
the regression test described below, which asserts its weakness explicitly so
nobody mistakes it for usable. Every response still carries `training_metrics`
straight from the loaded checkpoint's own metadata regardless of which one is
configured — a weak/unvalidated model can never be presented without its own
numbers next to it — and the frontend surfaces an explicit warning when
`mean_corr_scaled < 0.15`.

The vendored `ne_rainfall` package was upgraded alongside the checkpoint (same
upstream project, later revision) to add `XGBRainfallForecaster`,
`EnsembleForecaster`, and `CoupledRiskForecaster` — see
`docs/ne_rainfall/INTEGRATION.md` if you want to wire those in too; only the
LSTM path (`RainfallForecaster`) is used by `nershield_ml.northeast_rainfall`
today. `docs/ne_rainfall/MIGRATION.md` documents what changed porting the
original Mumbai model to this region, and `VERIFICATION.md`/`DATA_SOURCES.md`
cover how the checkpoint's numbers were produced and where the training data
came from.

### Architecture

`nn.LSTM(input_size=111, hidden_size=64, num_layers=4, batch_first=True)` +
`Linear(64, 12)` — same shape family as the original Mumbai model. Unlike
that project, a checkpoint here is self-describing: weights, scaler,
station order, block order, frequency and horizon all travel together in
one file (`ne_rainfall.predict.RainfallForecaster.load()`), so there's no
separate hand-extracted normalization step the way the Mumbai integration
needed.

### Input / Output

- Input: `(12, 111)` — 12 hourly steps (12h lookback), 111 features = 37
  North East stations' rainfall + 37 stations' windspeed + 37 stations' NWP
  (GFS) precipitation forecast, column order `block::station`.
- Output: `(12,)` — the next 12 hours of rainfall in mm for one target
  station (default: **Guwahati**; configurable per-checkpoint via
  `model.target_station` in `config/northeast.yaml` at training time).
- 37 stations across all eight North Eastern states — see the package's
  `config.py::STATION_ORDER`.

### Normalization

`log1p` then per-feature min-max, fit on the training split only — saved
inside the checkpoint itself, applied automatically inside
`RainfallForecaster.predict()`. This module's own preprocessing layer only
validates and orders the raw (mm / m-per-s) input; it never computes or
applies scaling itself.

### Config (`.env`)

`NORTHEAST_RAINFALL_MODEL_ENABLED`, `NORTHEAST_RAINFALL_INFERENCE_MODE`
(`real`/`demo`, defaults to `demo`), `NORTHEAST_RAINFALL_MODEL_PATH`,
`NORTHEAST_RAINFALL_DEVICE`, `NORTHEAST_RAINFALL_FORECAST_HOURS` — see
`.env.example`.

### Retraining or retargeting the checkpoint

`models/northeast_lstm_torch.pt` ships pre-trained (see above) — retraining is
only needed to retarget a different station or rebuild on fresher data:

```bash
python -m ne_rainfall.cli build-data --start 2019-01-01 --end 2024-12-31
python -m ne_rainfall.cli train --model lstm_torch --epochs 30
```

`docs/ne_rainfall/config/northeast.yaml` is the reference training config
(station list, season window, target station) the shipped checkpoint was
built from — edit a copy and change `model.target_station` to retarget.
`docs/ne_rainfall/MIGRATION.md` documents warm-starting from the original
Mumbai checkpoint via `--init-from`.

### API

- `POST /rainfall/forecast/demo` — runs the pipeline against a generated
  synthetic 12-hour window (no request body needed).
- `POST /rainfall/forecast` — runs it against real historical observations
  (`historical[]` of `{timestamp, rainfall, wind_speed, nwp_precip}` per
  station).
- `GET /rainfall/health` — `available`, `loaded`, `device`, `inference_mode`,
  `reason`, `supported_stations`, `training_metrics`.
- `POST /rainfall/explain/demo?horizon=0` / `POST /rainfall/explain?horizon=0`
  — SHAP (TreeSHAP, exact) attribution for one lead time (0-11) of a forecast.
  Returns `narrative` (plain English), `contributions[]` (`shap_scaled`
  exact/additive; `effect_mm` interpretable, deliberately not additive — see
  `docs/ne_rainfall/SHAP.md`), and `additivity_error`. **Requires the XGBoost
  co-forecaster loaded** (`NORTHEAST_RAINFALL_XGB_MODEL_PATH`) — 503 if it
  isn't, since TreeSHAP is exact only for tree ensembles, never the LSTM.

### Explainability (SHAP)

**Added 2026-09-16.** `RainfallExplainer` (from the same `ne_rainfall`
package) wraps the loaded `XGBRainfallForecaster` — see
`nershield_ml.northeast_rainfall.model.registry._load_explainer` and
`pipeline.explain_forecast`. No extra dependency: XGBoost computes exact
TreeSHAP internally (`predict(..., pred_contribs=True)`); `shap` itself is
only used for plot styles the API doesn't touch. See
`docs/ne_rainfall/SHAP.md` for the full reasoning, including the units
subtlety (`shap_scaled` is exact/additive in the model's own scaled output
space; `effect_mm` is per-feature and deliberately not additive) and why the
LSTM can't be explained this way at all.

### Geographic scope

Trained only on North East India stations — every forecast response carries
`"geographic_scope": "North East India"` and `"is_generalized": false`. This
is not an India-wide rainfall model.

### Tests

```bash
pytest tests/northeast_rainfall/
```

Covers preprocessing validation (station coverage, timestamp ordering,
NaN/negative rejection), demo-mode inference, real-checkpoint inference via
the smoke-test checkpoint (skips itself if
`models/northeast_smoke_test_DO_NOT_USE.pt` isn't present — the test
explicitly asserts the checkpoint's own reported skill is weak, so nobody
later assumes it's usable), severity classification, and the forecast API.

## Package layout

```
src/nershield_ml/
├── config.py           # env-driven settings
├── data/
│   ├── schema.py        # THE column contract — single source of truth
│   ├── loader.py         # CSV/GeoParquet loading + contract validation
│   └── synthetic.py       # synthetic dataset generator (clearly marked)
├── features/
│   └── engineering.py     # raw columns -> model matrix (train AND infer use this)
├── training/
│   ├── train.py            # spatial CV, calibration, artifact saving
│   └── evaluation.py        # precision/recall/PR-AUC/confusion matrix
├── inference/
│   ├── model_registry.py    # loads the artifact, never fabricates
│   ├── explain.py            # SHAP top contributing factors
│   └── predictor.py           # score/band/confidence/factors
└── api/
    ├── main.py                # FastAPI app: /predict, /health
    └── schemas.py               # request/response models
```
