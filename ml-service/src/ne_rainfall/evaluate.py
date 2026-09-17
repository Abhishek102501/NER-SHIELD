"""Scoring.

The original reported one number per lead time: Pearson correlation in
*normalised* units.  That is kept -- it is how the 51% / 58% headline figures
in the Mumbai README were produced, and dropping it would make the port
impossible to compare against its source.

Three additions, all of which matter more in the North East than in Mumbai:

* metrics are also computed in millimetres, after inverting the scaler.  A
  correlation computed on log1p-scaled values is not the same number as one
  computed on raw millimetres, so both are reported side by side and labelled.
* categorical skill (POD / FAR / CSI) at rainfall thresholds.  Correlation is
  dominated by the long dry stretches; for a region whose flood risk comes from
  a handful of extreme hours, hit rate on those hours is the operationally
  meaningful score.
* a persistence baseline.  "Tomorrow looks like today" is a surprisingly strong
  rainfall forecast, and a model that does not beat it has learned nothing.
  Without this number, a correlation of 0.58 cannot be interpreted.
"""

from __future__ import annotations

import json
from dataclasses import dataclass, asdict
from pathlib import Path
from typing import Dict, List, Optional, Sequence

import numpy as np


def _nanmean(values: Sequence[float]) -> float:
    """Mean ignoring NaN, returning NaN for an all-NaN list without warning."""
    arr = np.asarray(values, dtype=np.float64)
    ok = arr[np.isfinite(arr)]
    return float(ok.mean()) if ok.size else float("nan")


def pearson(a: np.ndarray, b: np.ndarray) -> float:
    """Correlation that returns NaN instead of raising on a constant input."""
    a = np.asarray(a, dtype=np.float64).ravel()
    b = np.asarray(b, dtype=np.float64).ravel()
    ok = np.isfinite(a) & np.isfinite(b)
    a, b = a[ok], b[ok]
    if a.size < 2 or np.std(a) < 1e-12 or np.std(b) < 1e-12:
        return float("nan")
    return float(np.corrcoef(a, b)[0, 1])


def rmse(pred: np.ndarray, obs: np.ndarray) -> float:
    return float(np.sqrt(np.nanmean((np.asarray(pred) - np.asarray(obs)) ** 2)))


def mae(pred: np.ndarray, obs: np.ndarray) -> float:
    return float(np.nanmean(np.abs(np.asarray(pred) - np.asarray(obs))))


def categorical_scores(pred: np.ndarray, obs: np.ndarray, threshold: float) -> Dict[str, float]:
    """Contingency-table skill for "rain exceeds ``threshold``".

    POD  = hits / (hits + misses)          -- fraction of real events caught
    FAR  = false alarms / (hits + FA)      -- fraction of warnings that were wrong
    CSI  = hits / (hits + misses + FA)     -- threat score, the usual summary
    BIAS = (hits + FA) / (hits + misses)   -- over/under-forecasting tendency
    HSS  = Heidke skill score              -- skill against random chance
    ETS  = equitable threat score          -- CSI corrected for chance hits

    HSS and ETS are the WMO-standard categorical scores, and they are the ones
    to quote for rare events.  CSI flatters a model on a threshold that is
    almost never exceeded: forecasting "no heavy rain" everywhere scores well
    on accuracy and is useless.  HSS is 0 for a no-skill forecast and 1 for a
    perfect one, whatever the base rate, which is why ClimateTwinIndia/DARPAN
    reports its verification in HSS.
    """
    p = np.asarray(pred).ravel() >= threshold
    o = np.asarray(obs).ravel() >= threshold
    hits = int(np.sum(p & o))
    false_alarms = int(np.sum(p & ~o))
    misses = int(np.sum(~p & o))
    correct_neg = int(np.sum(~p & ~o))

    def safe(num: float, den: float) -> float:
        return float(num / den) if den else float("nan")

    return {
        "threshold_mm": float(threshold),
        "hits": hits,
        "false_alarms": false_alarms,
        "misses": misses,
        "correct_negatives": correct_neg,
        "POD": safe(hits, hits + misses),
        "FAR": safe(false_alarms, hits + false_alarms),
        "CSI": safe(hits, hits + misses + false_alarms),
        "BIAS": safe(hits + false_alarms, hits + misses),
        "HSS": _heidke(hits, false_alarms, misses, correct_neg),
        "ETS": _equitable_threat(hits, false_alarms, misses, correct_neg),
        "base_rate": safe(hits + misses, hits + misses + false_alarms + correct_neg),
    }


def _heidke(hits: int, fa: int, misses: int, cn: int) -> float:
    """Heidke skill score against a random forecast with the same marginals.

    Ranges (-inf, 1]; 0 means no better than chance.
    """
    n = hits + fa + misses + cn
    if n == 0:
        return float("nan")
    observed = (hits + cn) / n
    expected = (
        ((hits + misses) * (hits + fa) + (cn + misses) * (cn + fa)) / (n * n)
    )
    denom = 1.0 - expected
    return float((observed - expected) / denom) if abs(denom) > 1e-12 else float("nan")


def _equitable_threat(hits: int, fa: int, misses: int, cn: int) -> float:
    """CSI with the hits expected by chance removed. Ranges (-1/3, 1]."""
    n = hits + fa + misses + cn
    if n == 0:
        return float("nan")
    chance_hits = (hits + misses) * (hits + fa) / n
    denom = hits + misses + fa - chance_hits
    return float((hits - chance_hits) / denom) if abs(denom) > 1e-12 else float("nan")


@dataclass
class EvalReport:
    region: str
    model: str
    n_samples: int
    lead_times_min: List[int]
    corr_scaled: List[float]
    corr_mm: List[float]
    rmse_mm: List[float]
    mae_mm: List[float]
    persistence_corr_mm: List[float]
    skill_vs_persistence: List[float]
    categorical: List[Dict[str, float]]
    mean_corr_scaled: float
    mean_corr_mm: float

    def save(self, path: str | Path) -> None:
        Path(path).write_text(json.dumps(asdict(self), indent=2), encoding="utf-8")

    def summary(self) -> str:
        lines = [
            f"{self.model} @ {self.region}   ({self.n_samples} test windows)",
            "",
            f"{'lead':>7} {'corr(scaled)':>13} {'corr(mm)':>10} {'RMSE mm':>9} "
            f"{'MAE mm':>8} {'persist r':>10} {'skill':>7}",
        ]
        for i, lt in enumerate(self.lead_times_min):
            label = f"{lt}m" if lt < 120 else f"{lt / 60:.0f}h"
            lines.append(
                f"{label:>7} {self.corr_scaled[i]:>13.4f} {self.corr_mm[i]:>10.4f} "
                f"{self.rmse_mm[i]:>9.3f} {self.mae_mm[i]:>8.3f} "
                f"{self.persistence_corr_mm[i]:>10.4f} "
                f"{self.skill_vs_persistence[i]:>7.3f}"
            )
        lines += ["", f"mean correlation (scaled units, comparable to the "
                      f"Mumbai README): {self.mean_corr_scaled:.4f}",
                  f"mean correlation (mm): {self.mean_corr_mm:.4f}", ""]
        if self.categorical:
            lines.append(
                f"{'thresh':>8} {'POD':>7} {'FAR':>7} {'CSI':>7} {'HSS':>7} "
                f"{'ETS':>7} {'BIAS':>7} {'events':>8}"
            )
            for c in self.categorical:
                lines.append(
                    f"{c['threshold_mm']:>8.1f} {c['POD']:>7.3f} {c['FAR']:>7.3f} "
                    f"{c['CSI']:>7.3f} {c.get('HSS', float('nan')):>7.3f} "
                    f"{c.get('ETS', float('nan')):>7.3f} {c['BIAS']:>7.3f} "
                    f"{c['hits'] + c['misses']:>8d}"
                )
        return "\n".join(lines)


def evaluate(
    predicted: np.ndarray,
    y_true: np.ndarray,
    scaler,
    lead_times: Sequence[int],
    region: str = "",
    model_name: str = "",
    thresholds_mm: Optional[Sequence[float]] = None,
    x_test: Optional[np.ndarray] = None,
    last_observed: Optional[np.ndarray] = None,
    target_col: int = 0,
) -> EvalReport:
    """Score a horizon-wise prediction.

    ``predicted`` and ``y_true`` are ``(n_samples, n_steps_out)`` in scaled
    units, exactly what the models emit.

    The persistence baseline needs the last value observed *before* the
    horizon.  Supply it either as ``x_test`` (the input windows, from which the
    last target-column step is taken) or directly as ``last_observed``.  If
    neither is given the baseline is reported as NaN rather than being faked
    from ``y_true[:, 0]`` -- that substitute is a future value, and using it
    would hand the baseline a free perfect score at the first lead time.
    """
    predicted = np.asarray(predicted, dtype=np.float64)
    y_true = np.asarray(y_true, dtype=np.float64)
    if predicted.shape != y_true.shape:
        raise ValueError(f"shape mismatch: {predicted.shape} vs {y_true.shape}")
    n_out = predicted.shape[1]
    lead_times = list(lead_times)[:n_out]

    pred_mm = scaler.inverse(predicted, target_col)
    obs_mm = scaler.inverse(y_true, target_col)

    # Persistence baseline: repeat the last value observed before the horizon
    # across the whole horizon.
    if last_observed is not None:
        last_in = np.asarray(last_observed, dtype=np.float64).ravel()
    elif x_test is not None:
        last_in = np.asarray(x_test)[:, -1, target_col]
    else:
        last_in = None

    persist_mm = (
        None
        if last_in is None
        else scaler.inverse(np.repeat(last_in[:, None], n_out, axis=1), target_col)
    )

    corr_scaled, corr_mm, rmse_mm, mae_mm, persist_corr, skill = [], [], [], [], [], []
    for i in range(n_out):
        corr_scaled.append(pearson(predicted[:, i], y_true[:, i]))
        corr_mm.append(pearson(pred_mm[:, i], obs_mm[:, i]))
        m_rmse = rmse(pred_mm[:, i], obs_mm[:, i])
        rmse_mm.append(m_rmse)
        mae_mm.append(mae(pred_mm[:, i], obs_mm[:, i]))
        if persist_mm is None:
            persist_corr.append(float("nan"))
            skill.append(float("nan"))
            continue
        persist_corr.append(pearson(persist_mm[:, i], obs_mm[:, i]))
        p_rmse = rmse(persist_mm[:, i], obs_mm[:, i])
        # Murphy skill score: 1 = perfect, 0 = no better than persistence,
        # negative = worse than doing nothing.
        skill.append(
            float(1.0 - (m_rmse ** 2) / (p_rmse ** 2))
            if np.isfinite(p_rmse) and p_rmse > 0
            else float("nan")
        )

    categorical = [
        categorical_scores(pred_mm, obs_mm, t) for t in (thresholds_mm or [])
    ]

    return EvalReport(
        region=region,
        model=model_name,
        n_samples=int(predicted.shape[0]),
        lead_times_min=[int(x) for x in lead_times],
        corr_scaled=corr_scaled,
        corr_mm=corr_mm,
        rmse_mm=rmse_mm,
        mae_mm=mae_mm,
        persistence_corr_mm=persist_corr,
        skill_vs_persistence=skill,
        categorical=categorical,
        mean_corr_scaled=_nanmean(corr_scaled),
        mean_corr_mm=_nanmean(corr_mm),
    )


def plot_timeseries(
    pred_mm: np.ndarray,
    obs_mm: np.ndarray,
    out_path: str | Path,
    title: str = "",
    step_minutes: int = 60,
) -> Optional[Path]:
    """Observed vs predicted, stitched non-overlapping as in the original.

    Returns None when matplotlib is unavailable, so a headless training run is
    never killed by a plotting import.
    """
    try:
        import matplotlib

        matplotlib.use("Agg")
        import matplotlib.pyplot as plt
    except ImportError:
        return None

    n_out = pred_mm.shape[1]
    obs = np.concatenate([obs_mm[i] for i in range(0, len(obs_mm), n_out)])
    pred = np.concatenate([pred_mm[i] for i in range(0, len(pred_mm), n_out)])

    fig = plt.figure(figsize=(16, 4))
    plt.plot(obs, color="r", label="Observed rainfall", linewidth=1.0)
    plt.plot(pred, color="b", label="Predicted rainfall", linewidth=1.0)
    plt.xlabel(f"Time (nth {step_minutes} min interval)")
    plt.ylabel("Rainfall (mm)")
    if title:
        plt.title(title)
    plt.legend()
    plt.tight_layout()
    out_path = Path(out_path)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(out_path, dpi=130)
    plt.close(fig)
    return out_path


def plot_correlation(
    report: EvalReport, out_path: str | Path
) -> Optional[Path]:
    """Correlation vs lead time, with the persistence baseline overlaid."""
    try:
        import matplotlib

        matplotlib.use("Agg")
        import matplotlib.pyplot as plt
    except ImportError:
        return None

    fig = plt.figure(figsize=(8, 4.5))
    lt = report.lead_times_min
    plt.plot(lt, report.corr_mm, "o-", color="b", label="model")
    plt.plot(lt, report.persistence_corr_mm, "s--", color="grey", label="persistence")
    plt.xlabel("Lead time (minutes)")
    plt.ylabel("Pearson correlation")
    plt.ylim(0, 1)
    plt.grid(alpha=0.3)
    plt.title(f"{report.model} -- {report.region}")
    plt.legend()
    plt.tight_layout()
    out_path = Path(out_path)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(out_path, dpi=130)
    plt.close(fig)
    return out_path
