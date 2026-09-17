# The gradient-boosted models

Two XGBoost models were added alongside the LSTM/Transformer stack, informed by
two reference projects:

| Source | What was taken from it |
|---|---|
| [iarai/Landslide4Sense-2022](https://github.com/iarai/Landslide4Sense-2022) | The 14-band Sentinel-2 + ALOS PALSAR feature stack, the published per-band normalisation constants, the patch/mask HDF5 layout, and F1-on-the-landslide-class as the metric |
| [aadityat23/ClimateTwinIndia](https://github.com/aadityat23/ClimateTwinIndia) (DARPAN) | The risk-layer framing: IMD warning categories rather than invented thresholds, P(>64 mm) / P(>115 mm) as the reported exceedances, a 0–10 risk score, an explicit confidence on every number, and HSS as the verification metric |

Neither repository is a dependency. What was adopted is their data contracts
and their evaluation discipline.

---

## 1. `xgb_rainfall` — rainfall nowcasting

A **direct multi-horizon** regressor: one booster per lead time, each
predicting that horizon straight from the input window. The alternative, one
model applied recursively, compounds its own error across twelve steps and is
consistently worse for precipitation.

It consumes the **same** 111-feature matrix, the same scaler and the same test
split as the LSTM, so the numbers in `reports/` are directly comparable.

### Why a tree model belongs here

- **Interpretable.** `ne_rainfall importance` answers "which upwind gauge
  actually drives Guwahati's 6-hour forecast". The LSTM cannot answer that, and
  for an operational warning system that matters.
- **Fast.** Seconds to train, against hours for the Transformer. You can
  re-fit after every season.
- **Robust to gaps.** XGBoost splits on missing values natively; a gauge
  network produces them constantly.
- **A genuinely different inductive bias**, which is what makes the two-model
  ensemble's disagreement a usable confidence signal rather than noise.

### What it gives up — read this before choosing it alone

**A tree can never predict a value it did not see in training.** Every
prediction is an average of training leaves. For a region containing Mawsynram
and Sohra this is a real limitation: the model cannot forecast a
record-breaking hour, by construction. The LSTM can, at least in principle.

This is why the recommended deployment is the ensemble, not the tree alone.

### Feature engineering

The LSTM learns its own temporal summary; a tree needs one flat row, and its
accuracy depends almost entirely on what that row holds. `summary` mode builds
~93 named predictors:

| Group | Contents | Why |
|---|---|---|
| Target station | all 12 lags per block, plus mean/max/std/trend and 1/3/6/12-step accumulations | Antecedent rainfall drives both saturation and landslide risk |
| Regional aggregate | mean/max/last/spread across the other 36 stations, plus a count of stations currently wet | How widespread the event is |
| Upwind aggregate | same, restricted to stations south and/or west of the target | The monsoon advects precipitation from the south-west, so upwind gauges *lead* the target — causal, not merely correlated |
| NWP block | carried through per step, **not** summarised away | These columns are already a forecast of the horizon being predicted; collapsing them to a mean throws away the single most informative predictor available |
| Cross-block | live NWP-minus-observed bias at the target | Lets the model learn when the NWP is currently running wet or dry |
| Static | target elevation | Orography dominates North East rainfall |
| Cyclical time | sin/cos of hour and day-of-year | Brahmaputra valley convection peaks overnight; a raw hour integer wraps badly at 23 and splits poorly |

`flatten` mode (1332 raw columns) is available for comparison and is usually
slightly worse and much slower.

### Exceedance heads

A regressor trained under MSE systematically under-predicts extremes, so
reading "will this exceed 64.5 mm" off the regression is unreliable exactly
where it matters most. Separate binary classifiers are fitted per IMD warning
threshold, with `scale_pos_weight` set from the observed class balance. They
produce the calibrated probabilities the risk engine consumes.

Thresholds with no training events are **skipped and reported**, not silently
fitted on an all-negative column.

---

## 2. `xgb_landslide` — susceptibility

Per-pixel binary classifier over the Landslide4Sense 14-band stack plus derived
indices (NDVI, NDWI, NDMI, BSI, SAVI, brightness, and slope×index
interactions). A tree cannot form ratios between columns, so the indices that
distinguish a fresh landslide scar — bare soil where vegetation was, bright,
on steep ground — have to be computed explicitly.

Two things this gets right that are easy to get wrong:

1. **Patch-disjoint splitting.** Neighbouring pixels in one 128×128 tile are
   near-duplicates. A random *pixel* split leaks the answer across the
   boundary and reports an F1 that collapses on real held-out tiles. Splitting
   by patch is the only honest option.
2. **Threshold tuning.** With ~2% positives, a 0.5 cut-off is close to the
   worst possible choice. The model sweeps cut-offs and keeps the one that
   maximises validation F1 — the same metric the benchmark scores.

**It will not beat the U-Net baseline on the benchmark itself.** Per-pixel
rows discard spatial structure, which is what a segmentation network is for.
That is not the goal. The goal is a susceptibility layer that runs on a CPU
over a whole district in seconds and can be coupled to an hourly rainfall
forecast.

### Getting the data

Not redistributed here (~3.5 GB, registration may be required). Download links
are in the [Landslide4Sense README](https://github.com/iarai/Landslide4Sense-2022),
then unpack so `data/raw/landslide4sense/TrainData/img/image_1.h5` exists.

To exercise the pipeline without the download:

```bash
python -m ne_rainfall.cli train-landslide --synthetic
```

Synthetic patches have the same *sign* of relationship as the real data (steep,
bare, low-NDVI blobs) and are a plumbing check only. Any model trained that way
is stamped `"warning": "synthetic fixture -- has no predictive value"` in its
metadata, and the risk engine downgrades its confidence automatically.

---

## 3. Coupling — where the two sources meet

Rainfall-triggered landslides are the dominant hazard in the North East, and
neither model alone describes one. The coupling is **multiplicative**:

```
landslide_risk = 10 × susceptibility × (ratio / (1 + ratio))
```

where `ratio` is the largest exceedance of an intensity–duration threshold
`I = a · D^-b` across every duration in the forecast, taken over the *wettest*
run of each length rather than the leading one — a storm arriving at hour 8 of
a 12-hour forecast still triggers.

Multiplicative, not additive, because steep bare terrain with no rain is not at
imminent risk and torrential rain on flat stable ground is a flood problem. Only
the conjunction is dangerous; a sum would score either alone as moderately risky.

> **The ID constants are not calibrated for North East India.** The defaults
> (`a = 14.82`, `b = 0.39`) are Caine's 1980 *global* relation. Himalayan and
> Meghalaya-plateau studies report materially different values. Fit them
> against a Geological Survey of India regional inventory before any
> operational use. Every risk record states which constants produced it, and
> `config/northeast.yaml` carries `calibrated_for_region: false` until you
> change it.

---

## 4. Verification

`categorical_scores` now reports **HSS** and **ETS** alongside POD/FAR/CSI.

Quote HSS for rare events. CSI flatters a model on a threshold that is almost
never exceeded — forecasting "no heavy rain" everywhere scores well on accuracy
and is useless. HSS is 0 for a no-skill forecast and 1 for a perfect one
whatever the base rate, which is why DARPAN reports its verification that way.

---

## 5. Commands

```bash
python -m ne_rainfall.cli train-xgb                      # rainfall model
python -m ne_rainfall.cli train-landslide --synthetic    # susceptibility
python -m ne_rainfall.cli importance --top 20            # what it relies on
python -m ne_rainfall.cli risk --susceptibility 0.7      # coupled live risk
```

## 6. Choosing a model

| Situation | Use |
|---|---|
| You need to explain a warning to a decision-maker | `xgb_rainfall` |
| You need calibrated P(>64 mm) | `xgb_rainfall` exceedance heads |
| Record-breaking totals matter | LSTM, or the ensemble |
| You want a confidence on the number | `EnsembleForecaster` — the spread |
| Landslide risk | `CoupledRiskForecaster` |
| Retraining every season on a laptop | `xgb_rainfall` |

**Default recommendation: the ensemble.** Two models with different failure
modes, and their disagreement is the honest uncertainty estimate.
