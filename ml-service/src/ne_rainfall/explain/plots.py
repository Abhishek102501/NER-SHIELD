"""Figures for SHAP output.

The published ``shap`` plot styles are used when the package is installed.
They are not required: every figure here has a matplotlib fallback, because
the attribution itself is computed by XGBoost and it would be poor design to
make a visualisation dependency gate the explanation.

All functions take a path and save to it; none call ``plt.show()``, so they
work unchanged in a scheduler or a container.
"""

from __future__ import annotations

from pathlib import Path
from typing import List, Optional, Sequence

import numpy as np


def _mpl():
    try:
        import matplotlib

        matplotlib.use("Agg")           # headless-safe
        import matplotlib.pyplot as plt

        return plt
    except ImportError as exc:  # pragma: no cover
        raise ImportError("plots need matplotlib: pip install matplotlib") from exc


def _have_shap() -> bool:
    try:
        import shap  # noqa: F401

        return True
    except ImportError:
        return False


def beeswarm(
    shap_values: np.ndarray,
    feature_values: np.ndarray,
    feature_names: Sequence[str],
    path: str | Path,
    max_display: int = 20,
    title: str = "",
) -> Path:
    """Distribution of each feature's contributions across many forecasts.

    The single most informative SHAP view: it shows not just *which* features
    matter but *how* -- whether high values push the forecast up or down, and
    whether the effect is consistent or bimodal.
    """
    plt = _mpl()
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)

    if _have_shap():
        import shap

        plt.figure(figsize=(9, 6))
        shap.summary_plot(
            np.asarray(shap_values),
            np.asarray(feature_values),
            feature_names=list(feature_names),
            max_display=max_display,
            show=False,
        )
        if title:
            plt.title(title, fontsize=11)
        plt.tight_layout()
        plt.savefig(path, dpi=140)
        plt.close()
        return path

    # Fallback: strip plot coloured by the feature's own normalised value.
    sv = np.asarray(shap_values)
    fv = np.asarray(feature_values)
    order = np.argsort(np.abs(sv).mean(axis=0))[::-1][:max_display][::-1]

    fig, ax = plt.subplots(figsize=(9, 0.32 * len(order) + 2))
    for row, idx in enumerate(order):
        col = fv[:, idx].astype(float)
        lo, hi = np.nanmin(col), np.nanmax(col)
        norm = (col - lo) / (hi - lo) if hi > lo else np.zeros_like(col)
        jitter = (np.random.default_rng(0).random(len(col)) - 0.5) * 0.28
        ax.scatter(sv[:, idx], row + jitter, c=norm, cmap="coolwarm",
                   s=6, alpha=0.6, linewidths=0)
    ax.set_yticks(range(len(order)))
    ax.set_yticklabels([feature_names[i] for i in order], fontsize=8)
    ax.axvline(0, color="#555", lw=0.8)
    ax.set_xlabel("SHAP value (model output units)")
    ax.set_title(title or "Feature contributions", fontsize=11)
    fig.colorbar(ax.collections[0], ax=ax, label="feature value (low → high)")
    fig.tight_layout()
    fig.savefig(path, dpi=140)
    plt.close(fig)
    return path


def waterfall(explanation, path: str | Path, max_display: int = 12) -> Path:
    """Why this one forecast came out where it did.

    Drawn in the model's own output units, where the contributions genuinely
    add up to the prediction.  Plotting millimetres here would be dishonest --
    the bars would not sum to the bar at the end.
    """
    plt = _mpl()
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)

    top = explanation.top(max_display)[::-1]
    names = [c.feature for c in top]
    vals = [c.shap_scaled for c in top]
    other = explanation.prediction_scaled - explanation.base_scaled - sum(vals)

    if abs(other) > 1e-9:
        names.insert(0, f"{len(explanation.contributions) - len(top)} other features")
        vals.insert(0, other)

    fig, ax = plt.subplots(figsize=(9, 0.38 * len(names) + 2.2))
    colours = ["#c0392b" if v > 0 else "#2471a3" for v in vals]
    running = explanation.base_scaled
    for i, v in enumerate(vals):
        ax.barh(i, v, left=running, color=colours[i], height=0.62)
        running += v

    ax.axvline(explanation.base_scaled, color="#888", ls="--", lw=1,
               label=f"base {explanation.base_scaled:.3f}")
    ax.axvline(explanation.prediction_scaled, color="#111", lw=1.2,
               label=f"prediction {explanation.prediction_scaled:.3f}")
    ax.set_yticks(range(len(names)))
    ax.set_yticklabels(names, fontsize=8)
    ax.set_xlabel("model output (scaled log1p rainfall)")
    ax.set_title(
        f"+{explanation.lead_time_min} min forecast: "
        f"{explanation.prediction_mm:.2f} mm "
        f"(base {explanation.base_mm:.2f} mm)",
        fontsize=11,
    )
    ax.legend(fontsize=8, loc="lower right")
    fig.tight_layout()
    fig.savefig(path, dpi=140)
    plt.close(fig)
    return path


def dependence(
    shap_values: np.ndarray,
    feature_values: np.ndarray,
    feature_names: Sequence[str],
    feature: str,
    path: str | Path,
) -> Path:
    """How one feature's contribution varies with its own value.

    This is where a non-linear or thresholded response shows up -- for example
    upwind rainfall mattering only once it passes a certain intensity.
    """
    plt = _mpl()
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    names = list(feature_names)
    if feature not in names:
        raise KeyError(
            f"unknown feature {feature!r}; try one of {names[:5]} ..."
        )
    i = names.index(feature)

    fig, ax = plt.subplots(figsize=(7, 4.5))
    ax.scatter(feature_values[:, i], shap_values[:, i], s=8, alpha=0.5,
               color="#2471a3", linewidths=0)
    ax.axhline(0, color="#555", lw=0.8)
    ax.set_xlabel(f"{feature} (value)")
    ax.set_ylabel("SHAP value")
    ax.set_title(f"Dependence: {feature}", fontsize=11)
    fig.tight_layout()
    fig.savefig(path, dpi=140)
    plt.close(fig)
    return path


def horizon_heatmap(importance, path: str | Path, max_display: int = 20) -> Path:
    """Mean |SHAP| per feature per lead time.

    Shows how the model's reasoning *changes with lead time* -- typically the
    station's own recent rainfall dominates the first hour and the NWP block
    takes over further out. A single global ranking hides that entirely.
    """
    plt = _mpl()
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)

    order = np.argsort(importance.mean_abs_shap)[::-1][:max_display]
    mat = importance.per_horizon[:, order].T
    names = [importance.feature_names[i] for i in order]

    fig, ax = plt.subplots(figsize=(1.0 + 0.55 * mat.shape[1], 0.34 * len(names) + 2))
    im = ax.imshow(mat, aspect="auto", cmap="viridis")
    ax.set_yticks(range(len(names)))
    ax.set_yticklabels(names, fontsize=8)
    ax.set_xticks(range(len(importance.lead_times_min)))
    ax.set_xticklabels(
        [f"+{lt}m" if lt < 120 else f"+{lt // 60}h" for lt in importance.lead_times_min],
        fontsize=8, rotation=45, ha="right",
    )
    ax.set_title("mean |SHAP| by lead time", fontsize=11)
    fig.colorbar(im, ax=ax, label="mean |SHAP|")
    fig.tight_layout()
    fig.savefig(path, dpi=140)
    plt.close(fig)
    return path
