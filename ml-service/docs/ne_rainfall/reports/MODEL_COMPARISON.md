# Model comparison — North East India

Both models were trained on **the same matrix, the same split and the same
scaler**, and scored on the same 2276 held-out test windows. The
comparison is like-for-like.

## Data actually used

| | |
|---|---|
| Period | 2021-03-23 → 2024-10-31 (4 monsoon seasons) |
| Rows | 22,988 hourly steps, 111 features |
| Stations | 37 across all 8 North Eastern states |
| Observed source | ERA5 reanalysis via Open-Meteo |
| NWP source | GFS via Open-Meteo historical forecast archive |
| Season window | 1 Mar – 31 Oct |
| Target | Guwahati, 12-hour horizon at hourly steps |

The build requested 2019–2024 but the NWP archive only begins 2021-03-23, so
**34.8% of requested rows were dropped** rather than trained on with a missing
NWP block. The manifest records this.

## Accuracy

| Lead | corr XGB | corr LSTM | RMSE XGB | RMSE LSTM | persistence |
|---|---|---|---|---|---|
| 60m | 0.6774 | 0.5690 | 1.095 | 1.185 | 0.5379 |
| 2h | 0.5668 | 0.5384 | 1.200 | 1.211 | 0.3999 |
| 3h | 0.5183 | 0.5249 | 1.237 | 1.226 | 0.3246 |
| 4h | 0.4978 | 0.4952 | 1.239 | 1.216 | 0.2897 |
| 5h | 0.4659 | 0.4674 | 1.254 | 1.227 | 0.2674 |
| 6h | 0.4641 | 0.4589 | 1.244 | 1.243 | 0.2473 |
| 7h | 0.4536 | 0.4531 | 1.257 | 1.245 | 0.2285 |
| 8h | 0.4603 | 0.4369 | 1.250 | 1.254 | 0.2108 |
| 9h | 0.4444 | 0.4163 | 1.264 | 1.251 | 0.1882 |
| 10h | 0.4333 | 0.3878 | 1.259 | 1.267 | 0.1522 |
| 11h | 0.4587 | 0.3831 | 1.251 | 1.277 | 0.1564 |
| 12h | 0.4208 | 0.3793 | 1.250 | 1.274 | 0.1478 |

**Mean correlation (scaled):** XGBoost **0.4884**, LSTM
0.4592.
**Mean correlation (mm):** XGBoost **0.4049**, LSTM
0.3674.

Both beat persistence at every lead time, and the margin widens with lead —
which is the behaviour you want, since persistence is genuinely hard to beat at
one hour and trivial to beat at twelve.

The LSTM ran 30 epochs, not the 50 the config defaults to. It would likely
close some of the gap with a full run; the headline here is that the two are
*comparable*, not that trees win.

## Where both models fail — read this before deploying either

| Threshold (mm) | Test events | POD XGB | POD LSTM | HSS XGB | HSS LSTM |
|---|---|---|---|---|---|
| 0.5 | 4678 | 0.413 | 0.469 | 0.391 | 0.396 |
| 2.5 | 1283 | 0.016 | 0.005 | 0.029 | 0.009 |
| 7.5 | 228 | 0.000 | 0.000 | 0.000 | 0.000 |
| 15.0 | 0 | n/a | n/a | n/a | n/a |

**Neither model usefully predicts hourly rainfall above ~2.5 mm.** Both catch
roughly 40–47% of any-rain hours (0.5 mm) with reasonable HSS, and then
collapse to near-zero detection at higher intensities.

This is the expected consequence of an MSE-trained regressor on a
zero-inflated, heavy-tailed target: predicting close to the conditional mean
minimises squared error, and the conditional mean of an hour that is dry 75% of
the time is small. The model is learning *timing* well and *intensity* poorly.

Three things follow:

1. **Use the exceedance classifier heads, not the regression**, for any
   threshold decision. That is exactly why they exist. They are fitted at 2.5
   and 15.6 mm here; 64.5 and 115.6 mm were **skipped, because this record
   contains no hourly events that large** — a 12-hour horizon at one station
   simply does not see IMD's daily heavy-rain thresholds often.
2. **Do not quote CSI for rare thresholds.** At 15 mm there were zero test
   events, and every categorical score is correctly `n/a` rather than a
   flattering 1.0.
3. **Consider `reg:tweedie`** (`config/northeast.yaml`, `model.xgboost.params`)
   once you no longer need the like-for-like MSE comparison with the LSTM. It
   fits a zero-inflated positive target far better than squared error.

## What the tree model relies on

Mean gain across all 12 horizons:

| Rank | Predictor | Reading |
|---|---|---|
| 1 | `region_nwp_precip_spread` | Disagreement across the NWP field — a proxy for how uncertain the synoptic situation is |
| 2 | `tgt_rainfall_accum1` | Guwahati's own last hour |
| 3 | `tgt_rainfall_t-1` | Same, as a raw lag |
| 4 | `region_rainfall_last_mean` | Current regional wetness |
| 5 | `region_nwp_precip_last_mean` | What the NWP says is happening now |
| 7 | `upwind_rainfall_mean` | **Gauges to the south-west** |
| 8 | `upwind_rainfall_last_mean` | Same, most recent step |
| 11 | `hour_cos` | Diurnal cycle |

The upwind aggregates — built on the reasoning that monsoon flow advects
precipitation from the south-west, so those gauges *lead* the target — rank 7th
and 8th of 93. That is a designed feature earning its place, not a coincidence.

`hour_cos` ranking 11th confirms the diurnal signal is real and that the
cyclical encoding was worth doing.

## Choosing

| Need | Use |
|---|---|
| Best mean correlation here | XGBoost |
| Explaining a warning | XGBoost + `cli importance` |
| Calibrated P(exceedance) | XGBoost exceedance heads |
| Headroom for record-breaking totals | LSTM (a tree cannot exceed its training range) |
| A confidence on the number | `EnsembleForecaster` — the spread between them |

On the live example in `examples/ensemble_and_risk.py` the two models disagreed
by 41% of the horizon total, yielding a confidence of 0.59. That disagreement
is the most useful output of the pair.

## Reproducing

```bash
python -m ne_rainfall.cli build-data --start 2019-01-01 --end 2024-12-31
python -m ne_rainfall.cli train-xgb
NE_RAINFALL_SKIP_OMP_GUARD=1 python -m ne_rainfall.cli train --model lstm_torch --epochs 30
python examples/ensemble_and_risk.py
```

Numbers will shift slightly with the data vintage: Open-Meteo revises its
archives, so a rebuild months from now is not byte-identical.
