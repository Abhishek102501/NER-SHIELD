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
