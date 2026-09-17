"""Runtime compatibility guards.

Currently one, and it is worth understanding before you hit it.

**PyTorch and XGBoost can crash each other on macOS.**  Both ship their own
``libomp.dylib``.  When two OpenMP runtimes are loaded into one process the
behaviour is undefined, and in practice it is a hard segmentation fault -- no
exception, no traceback, just a dead interpreter.  It is not tied to import
order: on a stock Anaconda install, importing torch first kills the next
XGBoost ``fit``, and importing XGBoost first kills certain torch operations.

This project is exposed to it precisely because it now offers a neural model
and a tree model side by side, and :class:`~ne_rainfall.predict_xgb.EnsembleForecaster`
deliberately loads both at once.

**The mitigation that actually works** is ``OMP_NUM_THREADS=1``, which was
verified to fix both orderings.  It must be set *before* either library loads,
because each reads it when its OpenMP runtime initialises.  That is why
:func:`ensure_openmp_safety` is called at ``ne_rainfall`` import time.

It costs multi-threaded performance in both libraries, so it is applied only in
the genuinely dangerous configuration -- macOS, both libraries installed,
neither yet imported, and no explicit ``OMP_NUM_THREADS`` from the user.  If you
only use one of the two, nothing happens and you keep full threading.

**The better fix**, if you control the environment, is to install PyTorch and
XGBoost from the same channel (``conda install -c conda-forge pytorch
py-xgboost``) so they share a single OpenMP runtime.  Then set
``NE_RAINFALL_SKIP_OMP_GUARD=1`` and you keep both threading and safety.

``KMP_DUPLICATE_LIB_OK=TRUE`` is deliberately *not* used: it suppresses the
runtime's own guard rather than resolving the conflict, and Intel documents it
as capable of producing silently incorrect results.
"""

from __future__ import annotations

import importlib.util
import os
import sys
import warnings
from typing import Any, Dict

_APPLIED = False

ENV_SKIP = "NE_RAINFALL_SKIP_OMP_GUARD"


def _installed(name: str) -> bool:
    try:
        return importlib.util.find_spec(name) is not None
    except (ImportError, ValueError):
        return False


def openmp_status() -> Dict[str, Any]:
    """Describe the OpenMP situation, for ``cli doctor`` and for debugging."""
    both = _installed("torch") and _installed("xgboost")
    return {
        "platform": sys.platform,
        "at_risk": bool(sys.platform.startswith("darwin") and both),
        "torch_installed": _installed("torch"),
        "xgboost_installed": _installed("xgboost"),
        "torch_imported": "torch" in sys.modules,
        "xgboost_imported": "xgboost" in sys.modules,
        "omp_num_threads": os.environ.get("OMP_NUM_THREADS"),
        "guard_applied": _APPLIED,
        "guard_skipped_by_env": bool(os.environ.get(ENV_SKIP)),
    }


def ensure_openmp_safety(verbose: bool = False) -> bool:
    """Pin OpenMP to one thread when torch and XGBoost would otherwise clash.

    Returns True when the guard was applied.  Idempotent and cheap; a no-op
    off macOS, when only one of the two libraries is installed, when either is
    already imported (too late to matter), when the user has set
    ``OMP_NUM_THREADS`` themselves, or when ``NE_RAINFALL_SKIP_OMP_GUARD`` is set.
    """
    global _APPLIED
    if _APPLIED or os.environ.get(ENV_SKIP):
        return False
    if not sys.platform.startswith("darwin"):
        return False
    if not (_installed("torch") and _installed("xgboost")):
        return False
    if os.environ.get("OMP_NUM_THREADS"):
        return False   # the user has an opinion; respect it

    if "torch" in sys.modules or "xgboost" in sys.modules:
        warnings.warn(
            "PyTorch and/or XGBoost were imported before ne_rainfall, so the "
            "OpenMP guard could not be applied. On macOS the two ship separate "
            "OpenMP runtimes and mixing them in one process can segfault. "
            "Either import ne_rainfall first, set OMP_NUM_THREADS=1 in the "
            "environment, or run the neural and tree models in separate "
            "processes. See ne_rainfall/_compat.py.",
            RuntimeWarning,
            stacklevel=2,
        )
        return False

    os.environ["OMP_NUM_THREADS"] = "1"
    _APPLIED = True
    if verbose:
        print(
            "ne_rainfall: set OMP_NUM_THREADS=1 (PyTorch + XGBoost OpenMP "
            f"conflict on macOS). Set {ENV_SKIP}=1 to opt out.",
            file=sys.stderr,
        )
    return True


# Backwards-compatible alias: earlier revisions tried to fix this by import
# ordering, which does not work. Kept so nothing importing it breaks.
def ensure_openmp_order() -> bool:
    return ensure_openmp_safety()
