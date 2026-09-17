# What was verified, and what was not

This port ships code, not results. This file records exactly which claims were
executed and which were left for you to run, so nothing here has to be taken on
trust.

---

## Verified by running it

### Data acquisition — end to end, real data

```bash
python -m ne_rainfall.cli build-data --start 2023-06-01 --end 2023-07-31
```

Completed against live public endpoints. Output: **1441 rows × 111 features**
(61 days hourly, minus 0.02% gaps interpolated or dropped), written with a
provenance manifest.

Source reachability, probed directly:

| source | result |
|---|---|
| `era5` (Open-Meteo archive) | ✅ returns data |
| `nasa_power` (NASA LaRC) | ✅ returns data |
| `gfs` (Open-Meteo forecast) | ✅ returns data |
| `gfs_archive` (historical forecast) | ✅ returns data |
| `data_gov_in` catalogue API | ✅ returns resource listings |
| `imd_gridded` (imdpune.gov.in) | ❌ connection timed out |
| `india_wris` (indiawris.gov.in) | ❌ connection timed out |

The two failures are almost certainly IP-based filtering, not missing data —
both sites commonly refuse non-Indian and cloud traffic. Neither is on the
default path. Re-probe from your own network:

```bash
python -m ne_rainfall.cli sources --check
```

### Physical plausibility of the returned data

June–July 2023 totals came back consistent with the region's monsoon
climatology: Brahmaputra-valley stations 1500–2300 mm, Manipur/Tripura
345–390 mm, peak hourly 34.2 mm, wind 0–11 m/s, 0.02% missing.

It also **confirmed the documented ERA5 limitation**: Mawsynram and Sohra
ranked 7th and 8th of 37 at ~1449 mm, against IMD Jun+Jul normals of roughly
5000–6000 mm. See `DATA_SOURCES.md` for the full table and what to do about it.

### Test suite

**60 tests, all passing.** Network-free; the 21 that need PyTorch skip
themselves if it is absent.

```bash
python -m pytest tests/ -q
```

Coverage includes: config consistency across both region files, every station
inside its bounding box, haversine-vs-planar distance, grid snapping, season
masking (including a year-wrapping window), scaler invertibility and JSON round
trip, the `log1p` dynamic-range claim, train-only scaler fitting, windows
matching a naive loop, no window straddling the train/test boundary, LSTM
parameter count matching the original, Mumbai-checkpoint warm-start transfer,
graceful skipping of shape-incompatible tensors, transformer window overlap and
leakage geometry, checkpoint round trip, column-permutation safety, batch/single
prediction agreement, seed reproducibility, notebook-pickle loading, architecture
inference from weights, and the poor-match warning.

### Training and inference machinery

A 12-epoch run on the 2-month dataset completed: training loop, validation
split, early-stopping bookkeeping, evaluation, checkpointing and plots all
worked. The saved checkpoint loaded cleanly in a fresh process and produced a
12-step forecast in millimetres, with permuted-column input giving an identical
answer and `to_dict()` serialising to JSON.

### The live forecast path

`python -m ne_rainfall.cli predict <checkpoint>` ran end to end: it fetched
current ERA5 and GFS data for all 37 stations, assembled a 12x111 window, and
emitted a 12-hour forecast with valid times. Cold-cache latency was roughly two
minutes, which is why `docs/INTEGRATION.md` insists this is never called inline
in a request handler.

### The released Mumbai checkpoint

`Models/LSTM_PyTorch_Model.pth` from the upstream repo was loaded directly. Two
findings, both of which would otherwise defeat the warm start silently:

1. **It does not unpickle in a fresh process.** Saved as `torch.save(model)`
   from a Colab cell, the pickle references `__main__.LSTM_Model`. Loading it
   elsewhere raises `AttributeError: Can't get attribute 'LSTM_Model'`. Fixed
   with a scoped legacy-name shim.
2. **It is a 2-layer, 12-hidden LSTM, not the 4x64 its training script
   specifies.** Read from the tensor shapes: `lstm.weight_ih_l0` is (48, 111),
   `lstm.weight_hh_l0` is (48, 12), and there is no `l2`/`l3`. Loaded into the
   documented configuration, 1 tensor of 10 transfers. Loaded into a matching
   2x12 model, all 10 transfer and the weights demonstrably change.

The input dimension is 111, so the station-count invariant this port is built
around does hold. Both behaviours are covered by tests.

---

## Explicitly NOT verified

### No model was trained

**The 2015–2023 download and training run was not performed.** The smoke-test
run above used 54 days of training data against ~146,000 free parameters — the
validation loss bottomed at epoch 4 and rose after, and the resulting
correlation was approximately zero. That is the expected outcome of an
underdetermined fit, not a property of the architecture.

`Models/smoke_test_DO_NOT_USE.pt` is kept only so you can exercise the
inference API without training first (`python -m ne_rainfall.cli predict
Models/smoke_test_DO_NOT_USE.pt`). **It has no predictive value.** Its metrics
and plots are under `reports/smoke_test/`, labelled as such. Delete both once
you have trained a real model -- a real run writes
`Models/northeast_lstm_torch.pt`, which is what the examples and the Makefile
expect.

That run did produce one useful illustration. Skill-vs-persistence was strongly
positive (0.10–0.54) while correlation sat at ≈0 — the model had learned to
predict near-climatology, which beats persistence on squared error while
carrying no signal at all. A report showing only RMSE would have looked like
success. This is precisely why the evaluation layer reports correlation, RMSE,
categorical skill and a persistence baseline together.

### No accuracy claim is made

No figure in this repository states what correlation the North East model
achieves, because no such number has been measured. The original Mumbai
figures (51% / 58%) are referenced only as the source study's results.

### Untested paths

* `imd_gridded` NetCDF reading and `scripts/bias_correct.py` — blocked on IMD
  reachability; the code is written against the documented file layout but has
  not been executed against a real file.
* `india_wris` live endpoints — same.
* `lstm_tf` (Keras) — TensorFlow was not installed; the architecture mirrors the
  original with the Keras 3 `Input`-layer fix.
* `transformer` training — the code path is exercised by unit tests on window
  geometry, but a full training run was not made.
* `examples/fastapi_service.py` — not launched; FastAPI was not installed.

---

## Reproducing this

```bash
pip install -r requirements-dev.txt
python -m ne_rainfall.cli doctor
python -m ne_rainfall.cli sources --check
python -m pytest tests/ -q
python -m ne_rainfall.cli build-data --start 2023-06-01 --end 2023-07-31
```

Then, for a real model, build the full period and train:

```bash
python -m ne_rainfall.cli build-data          # 2015-2023, 20-40 min cold
python -m ne_rainfall.train --model lstm_torch \
    --init-from Models/LSTM_PyTorch_Model.pth  # if you have the Mumbai weights
```

---

# XGBoost addition — what was actually run

Everything below was executed in this environment, not merely written.

## Environment

- macOS (darwin), Python 3.13, xgboost 3.4.1, scikit-learn 1.7.2, h5py 3.15.1,
  torch present.

## Data source probes

| Endpoint | Result |
|---|---|
| NASA POWER hourly | reachable, returns data |
| Open-Meteo ERA5 archive | reachable, returns data |
| Open-Meteo GFS forecast | reachable, returns data |
| Open-Meteo historical forecast archive (`gfs_seamless`) | reachable; **begins 2021-03-23** |
| `api.data.gov.in` resource + `/lists` catalogue | reachable with the published sample key |
| `imdpune.gov.in` | **unreachable from this sandbox** (connection timeout) |
| `indiawris.gov.in` | **unreachable from this sandbox** (connection timeout) |

The two unreachable sources are Indian government hosts that commonly refuse
non-Indian and cloud IPs. Their clients ship with explicit download
instructions rather than a silent failure path, and neither is a default.

## Dataset built

`build-data --start 2019-01-01 --end 2024-12-31` → **22,988 rows × 111
features**, 2021-03-23 → 2024-10-31. 34.8% of requested rows dropped because
the NWP archive does not reach back to 2019; recorded in the manifest.

## Models trained

| Model | Result |
|---|---|
| `xgb_rainfall` | mean corr (scaled) **0.4884**, beats persistence at all 12 lead times |
| `lstm_torch` (30 epochs) | mean corr (scaled) 0.4592, same splits |
| `xgb_landslide` | **synthetic patches only** — the real Landslide4Sense archive was not downloaded here (~3.5 GB, registration). F1 0.98 on synthetic data is a plumbing result and is stamped as such in the model metadata. |

Full numbers: [`reports/MODEL_COMPARISON.md`](../reports/MODEL_COMPARISON.md).

## Correctness checks run against reference implementations

- `_box_mean` (summed-area box filter) verified against a naive nested loop,
  max error 5.7e-07.
- `make_windows` strided view verified against the original repo's explicit
  Python loop, exact match.
- Tabular target-station lag columns verified to equal the raw window values.
- `Scaler` log1p→min-max round-trip verified invertible.
- HSS verified: 1.0 for a perfect forecast, ~0.03 for a shuffled one, 0.0 for
  an all-dry forecast.
- Both XGBoost models verified to reload identically from disk (predictions
  match to 1e-5/1e-6; tuned decision threshold preserved).
- Feature importance verified to recover planted predictors on synthetic data.

## A real bug found and fixed during this work

**PyTorch and XGBoost segfault each other on macOS.** Both ship their own
`libomp.dylib`. The test suite died mid-run with a bare segmentation fault — no
exception, no traceback.

Diagnosed by bisection: importing torch first kills the next XGBoost `fit`;
importing XGBoost first kills certain torch operations. **Import ordering does
not fix it.** `OMP_NUM_THREADS=1` was verified to fix both orderings, and is
what `ne_rainfall/_compat.py` now applies — only in the dangerous configuration,
and only when the user has not set the variable themselves.

Verified after the fix: **86 tests pass in a single process**, and
`examples/ensemble_and_risk.py` loads both models together without crashing.

This is a genuine deployment hazard for any host that uses the ensemble, which
is why it is documented in the README, `requirements.txt`, `cli doctor` and the
module itself rather than being silently patched.

## Known limitations, stated plainly

- **Neither rainfall model usefully predicts hourly totals above ~2.5 mm.**
  Both learn timing well and intensity poorly — the expected failure of an
  MSE-trained regressor on a zero-inflated target. Use the exceedance heads for
  threshold decisions.
- The 64.5 mm and 115.6 mm exceedance heads were **skipped**: no hourly events
  that large exist in this record. They will fit on a longer record or a wetter
  target station (Mawsynram, Sohra).
- The landslide model has **no real training data behind it here**.
- The intensity–duration trigger constants are **global, not calibrated for
  North East India**.
