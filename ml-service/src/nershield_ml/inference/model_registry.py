"""Loads the current model artifact and exposes it (and its metadata) to the
API layer. The API must never fabricate a score when no model is loaded —
every caller here either gets a real, loaded model or a clear exception.
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import joblib


class ModelNotLoadedError(RuntimeError):
    """Raised when inference/health is requested but no model artifact exists yet."""


@dataclass
class LoadedModel:
    model: Any  # fitted CalibratedClassifierCV wrapping an XGBClassifier
    feature_columns: list[str]
    version: str
    trained_at: str
    data_reference: str
    metrics: dict


class ModelRegistry:
    """Holds at most one loaded model in memory. `load()` is called once at
    API startup; `reload()` can be called to pick up a newly trained artifact
    without restarting the process.
    """

    def __init__(self, model_dir: str | Path):
        self.model_dir = Path(model_dir)
        self._loaded: LoadedModel | None = None

    @property
    def is_loaded(self) -> bool:
        return self._loaded is not None

    @property
    def current(self) -> LoadedModel:
        if self._loaded is None:
            raise ModelNotLoadedError(
                "No model artifact is loaded. Train one with "
                "`python -m nershield_ml.training.train <data_path>` first."
            )
        return self._loaded

    def load(self) -> None:
        latest_path = self.model_dir / "latest.json"
        if not latest_path.exists():
            self._loaded = None
            return

        pointer = json.loads(latest_path.read_text())
        artifact_path = self.model_dir / pointer["artifact_path"]
        if not artifact_path.exists():
            self._loaded = None
            return

        artifact = joblib.load(artifact_path)
        self._loaded = LoadedModel(
            model=artifact["model"],
            feature_columns=artifact["feature_columns"],
            version=artifact["version"],
            trained_at=artifact["trained_at"],
            data_reference=artifact["data_reference"],
            metrics=artifact["metrics"],
        )

    def reload(self) -> None:
        self.load()
