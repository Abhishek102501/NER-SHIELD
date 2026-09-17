"""North East India rainfall forecasting — replaces the earlier Mumbai
rainfall module. Wraps the vendored `ne_rainfall` package (see
`src/ne_rainfall/`, copied from a local NorthEast_Rainfall_Forecasting
project that is itself an explicit regional port of
https://github.com/omkar-nitsure/Mumbai_RainFall_Forecasting), rather than
reimplementing its architecture/preprocessing by hand the way the Mumbai
module had to.

Verified facts about the vendored project (from its own source, its own
`docs/VERIFICATION.md`, and by running it directly here — not just its
README):

- Architecture: `nn.LSTM(input_size=111, hidden_size=64, num_layers=4,
  batch_first=True)` + `Linear(64, 12)` — same shape family as Mumbai's, but
  here the checkpoint's own metadata (not a hardcoded constant) carries the
  real architecture, station order, block order, scaler and horizon, so a
  mismatch between a script's stated hyperparameters and a checkpoint's real
  weights (the exact bug found in the Mumbai repo) cannot silently happen
  again.
- Input: (12, 111) — 12 hourly steps (12h lookback), 111 features = 37 North
  East stations' rainfall + 37 stations' windspeed + 37 stations' NWP
  (GFS) precipitation forecast, column order `block::station` from
  `RainfallForecaster.feature_names`.
- Output: (12,) — the next 12 hours of rainfall in mm, for one target station
  (default: Guwahati, configurable per-checkpoint).
- Normalization: log1p, then per-feature min-max fit on the training split —
  saved inside the checkpoint itself (`Scaler.to_dict()`/`from_dict()`), so
  unlike Mumbai's bare state_dict, this format is genuinely loadable and
  usable for inference without hand-extracting stats separately.
- **No validated trained checkpoint exists.** The only shipped checkpoint,
  `Models/smoke_test_DO_NOT_USE.pt` (copied here as
  `models/northeast_smoke_test_DO_NOT_USE.pt`, gitignored, never the default
  path), was fit on 54 days of data against ~146k parameters — its own
  metadata carries `mean_corr_scaled ≈ -0.05` (no skill; the project's own
  docs call it explicitly unfit for use). Because of this, this module
  defaults to `NORTHEAST_RAINFALL_INFERENCE_MODE=demo` and requires an
  operator to explicitly point `NORTHEAST_RAINFALL_MODEL_PATH` at a real
  trained checkpoint (produced via `ne_rainfall.train`) to enable "real"
  mode — mirroring the "never fake the model" rule already applied to
  Landslide4Sense.
"""
