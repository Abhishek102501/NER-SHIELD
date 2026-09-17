# Mumbai → North East: what changed and why

Every change below is either (a) required because the region is different, or
(b) a fix for something that would have cost accuracy on the new region. The
model architectures themselves are untouched.

---

## The one invariant worth protecting

**37 stations × 3 feature blocks = 111 features, 12 steps in → 12 steps out.**

The North East station list was chosen to keep exactly that shape. This is not
cosmetic: it means every tensor in a Mumbai checkpoint has a matching shape in
the North East model, so the Mumbai weights are a valid initialisation.

```bash
python -m ne_rainfall.train --init-from Models/LSTM_PyTorch_Model.pth
```

The lower LSTM layers learn generic rainfall-sequence structure — persistence,
decay, the relation between wind and incoming rain — which is not Mumbai-specific.
Starting there rather than from random initialisation is the cheapest accuracy
win available when changing region, and it is only possible because the shape
was held fixed.

### Two things about the released Mumbai checkpoint

Both were found by actually loading `Models/LSTM_PyTorch_Model.pth`, and both
would otherwise silently defeat the warm start.

**1. It cannot be unpickled in a fresh process.** It was saved with
`torch.save(model)` inside a Colab cell, so the pickle references
`__main__.LSTM_Model` — a class that exists in no importable module. Loading it
anywhere else raises:

```
AttributeError: Can't get attribute 'LSTM_Model' on <module '__main__'>
```

`lstm_torch.py` publishes the legacy class names for the duration of the
`torch.load` call and restores them afterwards.

**2. Its architecture does not match its own training script.** The released
file is a **2-layer, 12-hidden** LSTM. `pytorch_lstm.py` in that repo sets
`n_layers = 4, n_hidden = 64`. Loading it into the documented configuration
transfers **1 tensor out of 10** — effectively a random model that looks like
it warm-started.

Verified by reading the tensor shapes:

| tensor | shape | implies |
|---|---|---|
| `lstm.weight_ih_l0` | (48, 111) | 111 inputs, hidden 12 (48 = 4 × 12) |
| `lstm.weight_hh_l0` | (48, 12) | hidden 12 |
| `lstm.weight_ih_l1` | (48, 12) | only two layers present |
| `linear.weight` | (12, 12) | horizon 12 |

The input dimension **is** 111, so the station-count invariant holds — it is the
depth and width that differ. `load_mumbai_checkpoint` detects a poor match and
prints the exact config change:

```
model.lstm_torch.n_layers: 2
model.lstm_torch.n_hidden: 12
```

or use `model_matching_checkpoint(path)` to build a model shaped to the file and
load all ten tensors. Which you want depends on your goal: match the file to
reuse the released weights as-is; keep 4×64 and accept a partial transfer if you
want the larger model's capacity.

---

## Changes forced by the region

| | Mumbai | North East | why |
|---|---|---|---|
| stations | 37 MCGM AWS gauges | 37 sites across 8 states | no comparable AWS network published for the NE |
| domain | ~1° × 0.5° | 8° × 9.5° | the NE is two orders of magnitude larger in area |
| elevation range | ~0–50 m | 12 m (Agartala) – 2922 m (Tawang) | orography dominates NE rainfall |
| season | 1 Jun – 30 Sep | 1 Mar – 31 Oct | NE has a pre-monsoon thunderstorm season and a late retreat |
| time step | 15 min | 1 h | no public 15-min NE network; hourly is the finest reliable step |
| target | Andheri | Guwahati | configurable via `model.target_station` |
| data | 4 Google Drive spreadsheets | live API clients | see `DATA_SOURCES.md` |

### Season window — the largest single accuracy item

Training a North East model on JJAS alone discards the March–May
pre-monsoon ("Bordoisila") convective season and the October retreat. Those
months carry a substantial share of the region's rainy hours and a
disproportionate share of its flash-flood events. `config/northeast.yaml`
sets `03-01 .. 10-31`.

### Distance metric

Snapping stations to NWP grid nodes used planar `sqrt(dlat² + dlon²)`. Over
Mumbai's 1°-wide box that is fine. Over a 9.5°-wide domain at 22–29 °N the
longitude degree is ~8% shorter than the latitude degree, and the planar metric
mis-ranks neighbouring grid nodes near the domain edges. `stations.py` uses
haversine.

---

## Changes that fix accuracy risks

### 1. `log1p` before min-max (`preprocess.transform`)

The original normalised raw millimetres:

```python
data_train[:, i] = (data_train[:, i] - min_x[i]) / (max_x[i] - min_x[i])
```

North East hourly rainfall is far more heavy-tailed than Mumbai's — Mawsynram
and Sohra produce hourly totals an order of magnitude above the Mumbai maximum.
Under plain min-max, a single extreme hour sets `max_x`, every ordinary rain
hour collapses into a sliver near zero, and an MSE-trained model discovers that
predicting ≈0 is near-optimal. Correlation then collapses without anything
looking obviously broken.

`log1p` first, min-max second. Exactly invertible, and the working range stays
usable. Set `transform: none` for byte-for-byte Mumbai parity.

A 99.9th-percentile clip (`clip_quantile`) additionally stops one corrupt gauge
spike from setting a column's scale.

### 2. The scaler is saved with the checkpoint

In the original, `min_x`/`max_x` lived only in the notebook session. The saved
`.pth` and `.h5` files therefore **could not be used for inference** — their
outputs were in normalised units with no way to invert them. This is why the
repo has no prediction script.

`train.save_checkpoint` writes weights, scaler, station order, block order,
frequency and horizon into one file. That is what makes `predict.py` and the
whole integration story possible.

### 3. Validation split and early stopping

The original trained a fixed 50 epochs and reported the final state. On a new
region that is a coin flip on overfitting. A chronological 10% tail of the
training data is now held out, with `patience`-based early stopping and
best-weight restore.

### 4. Shuffling actually enabled

The Mumbai README says batches were shuffled "to ensure that the model learns
the true characteristics of predicting Rainfall rather than just extrapolating
the previous values." The code passed `shuffle=False`. Shuffling is now on,
matching the stated intent.

### 5. Windows are built after the train/test split

The original scaled after splitting (correct) but built windows from the split
arrays in a way that was fine — however, windowing order is now explicit and
tested, so no window can straddle the boundary and leak future data into
training.

### 6. Gap handling instead of blanket `dropna()`

`dropna()` removes rows, silently splicing non-adjacent timestamps into one
12-step window — the model is then trained on a discontinuity presented as
continuous time. Gaps up to one hour are interpolated; longer gaps are dropped
and the count is recorded in the dataset manifest.

### 7. Gradient clipping

A 4-layer LSTM on a heavy-tailed target occasionally takes a destructive step.
`clip_grad_norm_(..., 1.0)` costs nothing and removes the failure mode.

### 8. Device correctness

The original allocated LSTM hidden/cell state with `torch.zeros(...)` on the
default device, which raises a device mismatch under CUDA — the model could
only ever run on CPU. `nn.LSTM` now allocates its own zero state, on the
input's device. CUDA and Apple MPS both work.

### 9. Keras 3 compatibility

`input_shape=` on the first LSTM layer is rejected by Keras 3; replaced with an
explicit `Input` layer.

### 10. Transformer leakage slice derived, not hard-coded

`transformer_model2.py` scored `predicted[:, 4:, 0]`. That `4` is
`n_out - dec_overlap = 16 - 12` — the number of target steps the decoder input
already contains, and therefore must not be scored. It is now computed from
config, so changing `n_out` or `dec_overlap` cannot silently reintroduce
leakage.

---

## Evaluation changes

The original reported Pearson correlation per lead time, in normalised units.
That is kept and labelled `corr_scaled`, so the 51% / 58% headline figures
remain comparable.

Added:

* **`corr_mm`** — the same correlation in millimetres. Under a `log1p`
  transform these are genuinely different numbers; reporting only one invites
  a false comparison.
* **RMSE / MAE in mm** — correlation says nothing about magnitude.
* **POD / FAR / CSI / BIAS** at 0.5, 2.5, 7.5 and 15 mm per step. Correlation
  over a season is dominated by long dry stretches. For a region whose risk is
  concentrated in a handful of extreme hours, hit rate on those hours is the
  operationally meaningful score.
* **A persistence baseline and a Murphy skill score.** "The next hour looks
  like this hour" is a strong rainfall forecast. Without this number, a
  correlation of 0.58 cannot be interpreted at all — it might be beating
  persistence comfortably, or losing to it.

---

## Reproducing the original

`config/mumbai_parity.yaml` restores the Mumbai region, the 15-minute step, the
JJAS window, `transform: none` and `target_station: Andheri`. Point it at the
original `final_data.zip` matrix and the pipeline reproduces the original
experiment:

```bash
python -m ne_rainfall.train --config config/mumbai_parity.yaml --model lstm_torch
```

This is the control. If a change here ever makes the Mumbai numbers worse, that
change is wrong.
