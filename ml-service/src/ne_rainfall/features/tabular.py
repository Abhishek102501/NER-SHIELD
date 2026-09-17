"""Window -> flat feature row, for gradient-boosted trees.

Design notes, because the choices here are what decide whether XGBoost beats
or loses to the LSTM on this problem:

* **The NWP block is carried forward, not summarised away.**  The GFS/NWP
  columns are already a forecast of the horizon we are predicting.  Collapsing
  them to a mean throws away the single most informative predictor a tree has.
  They enter as per-step values across the window.
* **The target station keeps full temporal detail**; the other 36 stations
  enter as aggregates.  A tree given 111 x 12 raw columns spends its depth
  budget rediscovering that neighbouring gauges are correlated.
* **Upwind aggregation.**  The South-West monsoon and the Bay of Bengal branch
  both advect precipitation broadly from the south-west across North East
  India, so gauges to the south-west of the target lead it in time.  Their
  aggregate is a genuinely causal predictor, not just another correlate.
* **Accumulations, not just instantaneous values.**  Antecedent rainfall over
  3/6/12 steps is what drives both catchment saturation and landslide risk.
* **Cyclical time.**  Diurnal convection over the Brahmaputra valley peaks
  overnight-to-dawn; a tree splits far more cleanly on sin/cos of hour than on
  a raw hour integer that wraps at 23.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Dict, List, Optional, Sequence, Tuple

import numpy as np

# Antecedent accumulation windows, in steps back from the end of the input.
DEFAULT_ACCUM_STEPS: Tuple[int, ...] = (1, 3, 6, 12)


@dataclass
class TabularFeatureBuilder:
    """Turns ``(n, n_steps_in, n_features)`` windows into ``(n, n_built)`` rows.

    Parameters mirror the dataset layout so the builder can name every column:
    ``stations`` in matrix order (target first), ``blocks`` in config order.
    """

    stations: Sequence[str]
    blocks: Sequence[str]
    mode: str = "summary"                       # summary | flatten
    accum_steps: Sequence[int] = DEFAULT_ACCUM_STEPS
    target_index: int = 0
    station_lat: Optional[Sequence[float]] = None
    station_lon: Optional[Sequence[float]] = None
    station_elev: Optional[Sequence[float]] = None

    _names: List[str] = field(default_factory=list, init=False)
    _upwind: Optional[np.ndarray] = field(default=None, init=False)

    def __post_init__(self) -> None:
        self.stations = list(self.stations)
        self.blocks = list(self.blocks)
        n_s = len(self.stations)
        if self.station_lat is not None and self.station_lon is not None:
            # "Upwind" = south and/or west of the target, the direction the
            # monsoon flow arrives from over the North East.
            t_lat = float(self.station_lat[self.target_index])
            t_lon = float(self.station_lon[self.target_index])
            self._upwind = np.array(
                [
                    (float(self.station_lat[i]) <= t_lat)
                    or (float(self.station_lon[i]) <= t_lon)
                    for i in range(n_s)
                ],
                dtype=bool,
            )
            self._upwind[self.target_index] = False

    # -- naming --------------------------------------------------------------
    @property
    def feature_names(self) -> List[str]:
        if not self._names:
            raise RuntimeError("call transform() once before reading feature_names")
        return list(self._names)

    def _col(self, block: str, station_i: int) -> int:
        """Column index of (block, station) in the flat feature matrix."""
        return self.blocks.index(block) * len(self.stations) + station_i

    # -- main ----------------------------------------------------------------
    def transform(
        self,
        windows: np.ndarray,
        timestamps: Optional[Sequence] = None,
    ) -> np.ndarray:
        """Build the feature matrix.

        ``windows``     ``(n, n_steps_in, n_features)``, already scaled.
        ``timestamps``  optional, one per window, marking the *last input step*.
                        Supplying them adds the cyclical-time block; omitting
                        them is valid and simply drops those columns.
        """
        w = np.asarray(windows, dtype=np.float32)
        if w.ndim != 3:
            raise ValueError(f"expected (n, steps, features), got {w.shape}")
        n, n_steps, n_feat = w.shape
        expected = len(self.blocks) * len(self.stations)
        if n_feat != expected:
            raise ValueError(
                f"window has {n_feat} features but {len(self.blocks)} blocks x "
                f"{len(self.stations)} stations = {expected}"
            )

        if self.mode == "flatten":
            self._names = [
                f"t-{n_steps - s}|{b}|{st}"
                for s in range(n_steps)
                for b in self.blocks
                for st in self.stations
            ]
            return w.reshape(n, -1)
        if self.mode != "summary":
            raise ValueError(f"unknown mode {self.mode!r}; use 'summary' or 'flatten'")

        parts: List[np.ndarray] = []
        names: List[str] = []

        def add(block_arr: np.ndarray, block_names: List[str]) -> None:
            parts.append(np.asarray(block_arr, dtype=np.float32).reshape(n, -1))
            names.extend(block_names)

        ti = self.target_index
        has_rain = "rainfall" in self.blocks

        # --- 1. target station, full temporal detail ------------------------
        for block in self.blocks:
            col = self._col(block, ti)
            series = w[:, :, col]                       # (n, steps)
            add(series, [f"tgt_{block}_t-{n_steps - s}" for s in range(n_steps)])
            add(
                np.stack(
                    [
                        series.mean(axis=1),
                        series.max(axis=1),
                        series.std(axis=1),
                        series[:, -1] - series[:, 0],   # trend across the window
                    ],
                    axis=1,
                ),
                [f"tgt_{block}_{k}" for k in ("mean", "max", "std", "trend")],
            )
            # Antecedent accumulations.
            acc = np.stack(
                [series[:, -k:].sum(axis=1) for k in self.accum_steps if k <= n_steps],
                axis=1,
            )
            add(acc, [f"tgt_{block}_accum{k}" for k in self.accum_steps if k <= n_steps])

        # --- 2. neighbouring stations, aggregated ---------------------------
        others = [i for i in range(len(self.stations)) if i != ti]
        for block in self.blocks:
            cols = [self._col(block, i) for i in others]
            nb = w[:, :, cols]                          # (n, steps, n_other)
            add(
                np.stack(
                    [
                        nb.mean(axis=(1, 2)),
                        nb.max(axis=(1, 2)),
                        nb[:, -1, :].mean(axis=1),      # regional state right now
                        nb[:, -1, :].max(axis=1),
                        nb.std(axis=(1, 2)),
                    ],
                    axis=1,
                ),
                [
                    f"region_{block}_{k}"
                    for k in ("mean", "max", "last_mean", "last_max", "spread")
                ],
            )
            if has_rain and block == "rainfall":
                # How widespread is the event? Tree-friendly and robust.
                wet = (nb[:, -1, :] > 0.01).sum(axis=1).astype(np.float32)
                add(wet[:, None], ["region_stations_wet_now"])

            if self._upwind is not None and self._upwind.any():
                up_cols = [self._col(block, i) for i in np.flatnonzero(self._upwind)]
                up = w[:, :, up_cols]
                add(
                    np.stack(
                        [up.mean(axis=(1, 2)), up.max(axis=(1, 2)),
                         up[:, -1, :].mean(axis=1)],
                        axis=1,
                    ),
                    [f"upwind_{block}_{k}" for k in ("mean", "max", "last_mean")],
                )

        # --- 3. cross-block interaction -------------------------------------
        if has_rain and "nwp_precip" in self.blocks:
            rc = self._col("rainfall", ti)
            nc = self._col("nwp_precip", ti)
            obs_last = w[:, -1, rc]
            nwp_last = w[:, -1, nc]
            add(
                np.stack(
                    [
                        nwp_last - obs_last,            # live NWP bias at the target
                        w[:, :, nc].mean(axis=1) - w[:, :, rc].mean(axis=1),
                    ],
                    axis=1,
                ),
                ["nwp_minus_obs_last", "nwp_minus_obs_mean"],
            )

        # --- 4. static orography --------------------------------------------
        if self.station_elev is not None:
            elev = float(self.station_elev[ti])
            add(np.full((n, 1), elev, dtype=np.float32), ["tgt_elevation_m"])

        # --- 5. cyclical time ------------------------------------------------
        if timestamps is not None:
            import pandas as pd

            idx = pd.DatetimeIndex(pd.to_datetime(list(timestamps)))
            if len(idx) != n:
                raise ValueError(
                    f"{len(idx)} timestamps for {n} windows -- they must align "
                    "with the last input step of each window"
                )
            hour = idx.hour.to_numpy() + idx.minute.to_numpy() / 60.0
            doy = idx.dayofyear.to_numpy().astype(np.float32)
            add(
                np.stack(
                    [
                        np.sin(2 * np.pi * hour / 24.0),
                        np.cos(2 * np.pi * hour / 24.0),
                        np.sin(2 * np.pi * doy / 365.25),
                        np.cos(2 * np.pi * doy / 365.25),
                        idx.month.to_numpy().astype(np.float32),
                    ],
                    axis=1,
                ),
                ["hour_sin", "hour_cos", "doy_sin", "doy_cos", "month"],
            )

        out = np.concatenate(parts, axis=1).astype(np.float32)
        self._names = names
        if out.shape[1] != len(names):
            raise AssertionError(
                f"internal: built {out.shape[1]} columns but named {len(names)}"
            )
        return out


def build_tabular_features(
    windows: np.ndarray,
    stations: Sequence[str],
    blocks: Sequence[str],
    timestamps: Optional[Sequence] = None,
    mode: str = "summary",
    **kwargs,
) -> Tuple[np.ndarray, List[str]]:
    """Convenience wrapper returning ``(matrix, feature_names)``."""
    b = TabularFeatureBuilder(stations=stations, blocks=blocks, mode=mode, **kwargs)
    x = b.transform(windows, timestamps=timestamps)
    return x, b.feature_names
