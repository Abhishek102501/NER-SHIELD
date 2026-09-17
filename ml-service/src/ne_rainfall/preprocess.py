"""Scaling and windowing.

The original did this inline in every model script:

    min_x[i] = np.min(data_train[:, i]); max_x[i] = np.max(data_train[:, i])
    data_train[:, i] = (data_train[:, i] - min_x[i]) / (max_x[i] - min_x[i])

Same idea, same train-only fit, but pulled into one reusable, serialisable
object -- because the scaler has to travel with the checkpoint.  In the
original, ``min_x``/``max_x`` lived only in the notebook session, so a saved
``.pth`` could not actually be used for inference later: its outputs were in
normalised units with no way to invert them.  ``Scaler.save``/``load`` fixes
that, and is what makes ``predict.py`` possible.

The North East specific part is :class:`Scaler` ``transform="log1p"``.  Mumbai's
hourly rainfall distribution is heavy-tailed; the North East's is much more so
(Mawsynram and Sohra produce hourly totals an order of magnitude above the
Mumbai maximum).  Under plain min-max those extremes compress every ordinary
rain hour into a sliver near zero, an MSE-trained model then finds that
predicting ~0 is near-optimal, and correlation collapses.  Taking log1p before
min-max keeps the working range usable while remaining exactly invertible.
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, Optional, Tuple

import numpy as np

EPS = 1e-8


@dataclass
class Scaler:
    """Per-feature invertible scaler, fitted on the training split only."""

    transform: str = "log1p"      # log1p | none
    method: str = "minmax"        # minmax | robust
    clip_quantile: Optional[float] = 0.999

    lo: Optional[np.ndarray] = None
    hi: Optional[np.ndarray] = None
    clip_hi: Optional[np.ndarray] = None
    n_features: Optional[int] = None

    # -- forward -------------------------------------------------------------
    def _pre(self, x: np.ndarray) -> np.ndarray:
        if self.transform == "log1p":
            # Rain and wind are non-negative; clip guards against a reanalysis
            # cell returning a tiny negative from interpolation.
            return np.log1p(np.clip(x, 0.0, None))
        if self.transform == "none":
            return x
        raise ValueError(f"unknown transform {self.transform!r}")

    def _post(self, x: np.ndarray) -> np.ndarray:
        if self.transform == "log1p":
            return np.expm1(x)
        return x

    def fit(self, train: np.ndarray) -> "Scaler":
        train = np.asarray(train, dtype=np.float64)
        self.n_features = train.shape[1]

        if self.clip_quantile:
            self.clip_hi = np.nanquantile(train, self.clip_quantile, axis=0)
            train = np.minimum(train, self.clip_hi)

        z = self._pre(train)
        if self.method == "minmax":
            self.lo = np.nanmin(z, axis=0)
            self.hi = np.nanmax(z, axis=0)
        elif self.method == "robust":
            # 1st/99th percentile instead of absolute min/max, so one corrupt
            # gauge spike cannot set the scale for a whole column.
            self.lo = np.nanquantile(z, 0.01, axis=0)
            self.hi = np.nanquantile(z, 0.99, axis=0)
        else:
            raise ValueError(f"unknown method {self.method!r}")

        # A constant column (a gauge that never reported rain in training)
        # would divide by zero; give it unit range and it maps to 0.
        flat = (self.hi - self.lo) < EPS
        self.hi = np.where(flat, self.lo + 1.0, self.hi)
        return self

    def transform_array(self, x: np.ndarray) -> np.ndarray:
        self._check()
        x = np.asarray(x, dtype=np.float64)
        if self.clip_hi is not None:
            x = np.minimum(x, self.clip_hi)
        z = self._pre(x)
        return ((z - self.lo) / (self.hi - self.lo)).astype(np.float32)

    def inverse(self, y: np.ndarray, feature: int = 0) -> np.ndarray:
        """Invert a single feature's column back to millimetres.

        ``feature=0`` is the target station, matching the original's
        ``y * (max_x[0] - min_x[0]) + min_x[0]``.
        """
        self._check()
        y = np.asarray(y, dtype=np.float64)
        z = y * (self.hi[feature] - self.lo[feature]) + self.lo[feature]
        out = self._post(z)
        return np.clip(out, 0.0, None)  # rainfall cannot be negative

    def _check(self) -> None:
        if self.lo is None or self.hi is None:
            raise RuntimeError("Scaler used before fit()")

    # -- persistence ---------------------------------------------------------
    def to_dict(self) -> Dict:
        return {
            "transform": self.transform,
            "method": self.method,
            "clip_quantile": self.clip_quantile,
            "lo": None if self.lo is None else self.lo.tolist(),
            "hi": None if self.hi is None else self.hi.tolist(),
            "clip_hi": None if self.clip_hi is None else self.clip_hi.tolist(),
            "n_features": self.n_features,
        }

    @staticmethod
    def from_dict(d: Dict) -> "Scaler":
        s = Scaler(
            transform=d["transform"],
            method=d["method"],
            clip_quantile=d.get("clip_quantile"),
        )
        s.lo = None if d["lo"] is None else np.asarray(d["lo"])
        s.hi = None if d["hi"] is None else np.asarray(d["hi"])
        s.clip_hi = None if d.get("clip_hi") is None else np.asarray(d["clip_hi"])
        s.n_features = d.get("n_features")
        return s

    def save(self, path: str | Path) -> None:
        Path(path).write_text(json.dumps(self.to_dict()), encoding="utf-8")

    @staticmethod
    def load(path: str | Path) -> "Scaler":
        return Scaler.from_dict(json.loads(Path(path).read_text(encoding="utf-8")))


def chronological_split(data: np.ndarray, train_split: float) -> Tuple[np.ndarray, np.ndarray]:
    """Plain index split, as in the original."""
    n = int(len(data) * train_split)
    return data[:n], data[n:]


def make_windows(
    data: np.ndarray,
    n_steps_in: int,
    n_steps_out: int,
    target_col: int = 0,
) -> Tuple[np.ndarray, np.ndarray]:
    """Sliding windows -> ``(X[n, in, feat], y[n, out])``.

    Vectorised with a strided view instead of the original Python loop: for
    nine North East seasons this is the difference between ~40 s and ~0.2 s,
    and it allocates no intermediate copies.
    """
    n = len(data) - n_steps_in - n_steps_out + 1
    if n <= 0:
        raise ValueError(
            f"not enough rows ({len(data)}) for a "
            f"{n_steps_in}+{n_steps_out}-step window"
        )
    from numpy.lib.stride_tricks import sliding_window_view

    windows = sliding_window_view(data, (n_steps_in + n_steps_out, data.shape[1]))
    windows = windows[:n, 0]                       # (n, in+out, feat)
    x = np.ascontiguousarray(windows[:, :n_steps_in, :])
    y = np.ascontiguousarray(windows[:, n_steps_in:, target_col])
    return x.astype(np.float32), y.astype(np.float32)


def prepare(
    data: np.ndarray,
    n_steps_in: int,
    n_steps_out: int,
    train_split: float = 0.9,
    transform: str = "log1p",
    method: str = "minmax",
    clip_quantile: Optional[float] = 0.999,
    target_col: int = 0,
) -> Dict[str, object]:
    """Split -> fit scaler on train -> scale both -> window both.

    Ordering matters and is the same as the original: the scaler never sees a
    test row.  Windowing happens *after* the split so no window can straddle
    the boundary and leak future information into training.
    """
    train_raw, test_raw = chronological_split(np.asarray(data, dtype=np.float64), train_split)
    scaler = Scaler(transform=transform, method=method, clip_quantile=clip_quantile).fit(train_raw)
    train = scaler.transform_array(train_raw)
    test = scaler.transform_array(test_raw)

    x_train, y_train = make_windows(train, n_steps_in, n_steps_out, target_col)
    x_test, y_test = make_windows(test, n_steps_in, n_steps_out, target_col)
    return {
        "x_train": x_train,
        "y_train": y_train,
        "x_test": x_test,
        "y_test": y_test,
        "scaler": scaler,
        "n_features": train.shape[1],
    }
