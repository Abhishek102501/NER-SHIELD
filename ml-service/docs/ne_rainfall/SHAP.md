# SHAP — explaining the forecasts

SHAP (SHapley Additive exPlanations) attributes a single prediction to its
input features: how much each one pushed the forecast up or down. For tree
ensembles there is an exact polynomial-time algorithm, **TreeSHAP**, so nothing
here is sampled or approximated at the attribution step.

```bash
python -m ne_rainfall.cli explain                 # global, over the test split
python -m ne_rainfall.cli explain --live --json   # explain the newest forecast
python examples/explain_forecast.py               # all three views
```

```python
from ne_rainfall import RainfallExplainer, XGBRainfallForecaster

fc = XGBRainfallForecaster.load("Models/northeast_xgb_rainfall")
ex = RainfallExplainer.from_forecaster(fc)

why = ex.explain(window, horizon=0, timestamps=stamps)
print(why.narrate())          # plain English
why.top(5)                    # ranked contributions
why.to_dict()                 # JSON, ready for an API response
```

---

## 1. No new dependency for the attribution

XGBoost computes TreeSHAP internally via `predict(..., pred_contribs=True)`.
That path was checked against `shap.TreeExplainer` here: **maximum difference
0.0**, additivity to 1.4e-6. Same algorithm, same numbers.

So `shap` is imported only for its published plot styles, and every figure in
`ne_rainfall/explain/plots.py` has a matplotlib fallback. A visualisation
library should not gate whether you can explain your model.

---

## 2. The units problem — the part most implementations get wrong

SHAP values are exact and additive **in the model's output space**. This model
predicts min-max-scaled `log1p` rainfall, not millimetres:

```
base_scaled + Σ shap_scaled  ==  prediction_scaled     (exact)
```

Millimetres come from `expm1`, which is **non-linear**. There is no way to
convert the contributions to mm and have them still sum to the forecast. Any
library that hands you millimetre contributions that add up is doing something
unstated to make them add up.

`LocalExplanation` therefore carries both, labelled:

| Field | Meaning | Additive? |
|---|---|---|
| `shap_scaled` | Exact Shapley value in model output space | **Yes** — sums to the prediction |
| `effect_mm` | mm the forecast would lose if *that one* feature's contribution were removed | **No, deliberately** |

`effect_mm` is exact for each feature taken alone and is what the narration
quotes, because "upwind rainfall added 3.1 mm" is what a duty forecaster can
use. `shap_scaled` is the ground truth, and it is what the waterfall plot
draws — plotting mm there would produce bars that visibly fail to reach the
total.

Every result reports `additivity_error`. On this project's checkpoints it runs
at **3e-08**.

---

## 3. A bug this caught

The first implementation attributed over *all* trees in each booster. But every
booster here was fitted with early stopping, so `model.predict` only evaluates
trees `0..best_iteration`.

The explanations were describing a **different model** than the one making
forecasts. Measured additivity error: **0.074**, against an exact tolerance of
~1e-7.

Nothing crashed. The numbers looked plausible. It was caught only because
additivity is checked on every explanation — which is why that check is not
optional here, and why `test_early_stopped_model_uses_the_same_tree_range`
asserts both that the fix works *and* that the naive version is genuinely
wrong.

If you write your own SHAP wrapper around an early-stopped model, check this.

---

## 4. Three questions, three views

### Local — why *this* forecast?

```python
why = ex.explain(window, horizon=0, timestamps=stamps)
print(why.narrate())
```

```
Forecast for +60 minutes: 0.59 mm (the model's average output is 0.20 mm).

Pushed the forecast UP:
  +0.12 mm    observed rainfall at the target station, the latest step
  +0.05 mm    wind speed at the target station, 3 steps ago

Pulled the forecast DOWN:
  -0.04 mm    the current average of observed rainfall across the station network
```

Use `waterfall()` for the figure.

### Global — what does it rely on generally?

```python
importance = ex.global_importance(x_features=x_test)
importance.top(10)
```

Mean |SHAP| over many forecasts. **This is a better ranking than XGBoost's
built-in `gain`**, and on this model the two genuinely disagree:

| Rank | by `gain` (training) | by mean \|SHAP\| (predictions) |
|---|---|---|
| 1 | `region_nwp_precip_spread` | `tgt_rainfall_t-1` |
| 2 | `tgt_rainfall_accum1` | `region_rainfall_last_mean` |
| 3 | `tgt_rainfall_t-1` | `upwind_rainfall_last_mean` |

`gain` scores how useful a split was *while training*. Mean |SHAP| measures
influence on the predictions the model actually makes, on data you choose. For
"what is this model doing", the second question is the one you want.

### By horizon — does the reasoning change with lead time?

It does, and this is the finding worth showing anyone who asks what the model
learned:

| Lead | Top driver | mean \|SHAP\| |
|---|---|---|
| +60 min | `tgt_rainfall_t-1` | 0.0441 |
| +12 h | `region_nwp_precip_spread` | 0.0107 |

**Short lead times lean on the station's own last observation; long ones fall
back on the NWP field.** The model learned the persistence→NWP handover on its
own, at around +8 h. `horizon_heatmap()` shows the full picture, and a single
global ranking hides it completely.

---

## 5. The landslide model

`LandslideExplainer` works the same way, with contributions in **log-odds** —
the classifier's additive output space. `effect_probability` is the per-feature
marginal and, again, does not sum.

```python
from ne_rainfall import LandslideExplainer

ex = LandslideExplainer.load("Models/landslide_xgb")
ex.explain_pixels(pixel_features, top=5)
```

---

## 6. What about the LSTM and Transformer?

**TreeSHAP does not apply to them.** SHAP's `DeepExplainer` is approximate and
fragile with recurrent layers; `KernelExplainer` would need thousands of model
evaluations per explanation over a 12×111 input and is not practical here.

Rather than ship something slow and approximate while calling it the same
thing, `RainfallExplainer` raises a clear `TypeError` if handed a neural
forecaster. If you need to compare, use permutation importance on the neural
model and compare *rankings*, not values — and say which method produced which.

This is also a real argument for the tree model: **it is the one you can
explain exactly.**

---

## 7. Honest limits

- **SHAP describes the model, not the atmosphere.** It says which inputs the
  model used. Correlated predictors share credit in ways that can look
  arbitrary — `tgt_rainfall_t-1` and `tgt_rainfall_accum1` are nearly the same
  quantity here and will split attribution between them.
- **It cannot fix a bad model.** This model does not usefully predict hourly
  rainfall above ~2.5 mm (see `reports/MODEL_COMPARISON.md`). SHAP will explain
  those under-forecasts clearly and confidently. A clear explanation of a wrong
  answer is still a wrong answer.
- **Baseline matters.** The `base` value is the training-set mean prediction.
  Contributions are relative to that, not to zero rainfall.
