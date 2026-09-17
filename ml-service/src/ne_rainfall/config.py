"""Typed configuration loader.

Everything region-specific lives in a YAML file (``config/northeast.yaml``).
Nothing in the modelling code reads a hard-coded Mumbai constant, which is what
makes the port a configuration change rather than a fork.
"""

from __future__ import annotations

import copy
import os
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Optional

import yaml

# Minutes per modelling step, keyed by the pandas offset alias used in config.
_FREQ_MINUTES = {"15min": 15, "30min": 30, "1h": 60, "3h": 180, "1d": 1440}

_PROJECT_ROOT = Path(__file__).resolve().parent.parent


def project_root() -> Path:
    """Repo root, so relative paths in the YAML resolve from anywhere."""
    return _PROJECT_ROOT


@dataclass
class Config:
    """Parsed configuration with a few derived conveniences."""

    raw: Dict[str, Any]
    path: Optional[Path] = None

    # -- passthrough sections ------------------------------------------------
    @property
    def region(self) -> Dict[str, Any]:
        return self.raw["region"]

    @property
    def season(self) -> Dict[str, Any]:
        return self.raw["season"]

    @property
    def data(self) -> Dict[str, Any]:
        return self.raw["data"]

    @property
    def windowing(self) -> Dict[str, Any]:
        return self.raw["windowing"]

    @property
    def preprocess(self) -> Dict[str, Any]:
        return self.raw["preprocess"]

    @property
    def model(self) -> Dict[str, Any]:
        return self.raw["model"]

    @property
    def evaluate(self) -> Dict[str, Any]:
        return self.raw["evaluate"]

    # -- derived -------------------------------------------------------------
    @property
    def slug(self) -> str:
        return self.region["slug"]

    @property
    def freq(self) -> str:
        return self.data["freq"]

    @property
    def step_minutes(self) -> int:
        f = self.freq
        if f not in _FREQ_MINUTES:
            raise ValueError(
                f"unsupported freq {f!r}; expected one of {sorted(_FREQ_MINUTES)}"
            )
        return _FREQ_MINUTES[f]

    @property
    def blocks(self) -> List[str]:
        return list(self.data["blocks"])

    @property
    def n_steps_in(self) -> int:
        return int(self.windowing["n_steps_in"])

    @property
    def n_steps_out(self) -> int:
        return int(self.windowing["n_steps_out"])

    @property
    def lead_times(self) -> List[int]:
        """Lead times in minutes, one per output step.

        Mumbai at 15 min x 12 steps gives 15..180; North East at 1 h x 12 steps
        gives 60..720.  Evaluation labels come from here rather than the
        hard-coded ``range(15, 181, 15)`` of the original scripts.
        """
        configured = self.evaluate.get("lead_times")
        if configured:
            return [int(x) for x in configured]
        step = self.step_minutes
        return [step * (i + 1) for i in range(self.n_steps_out)]

    def path_for(self, key: str) -> Path:
        """Resolve a ``paths:`` entry against the project root."""
        p = Path(self.raw["paths"][key])
        return p if p.is_absolute() else project_root() / p

    @property
    def stations_path(self) -> Path:
        p = Path(self.region["stations_file"])
        return p if p.is_absolute() else project_root() / p

    def expected_n_features(self, n_stations: int) -> int:
        return len(self.blocks) * n_stations

    def with_overrides(self, overrides: Dict[str, Any]) -> "Config":
        """Return a copy with dotted-key overrides applied.

        ``cfg.with_overrides({"model.lstm_torch.epochs": 5})``
        """
        raw = copy.deepcopy(self.raw)
        for dotted, value in overrides.items():
            node = raw
            parts = dotted.split(".")
            for part in parts[:-1]:
                node = node.setdefault(part, {})
            node[parts[-1]] = value
        return Config(raw=raw, path=self.path)

    def to_dict(self) -> Dict[str, Any]:
        return copy.deepcopy(self.raw)


def load_config(path: str | os.PathLike | None = None) -> Config:
    """Load a region config.

    Defaults to ``config/northeast.yaml``; ``NE_RAINFALL_CONFIG`` overrides.
    """
    if path is None:
        path = os.environ.get("NE_RAINFALL_CONFIG", "config/northeast.yaml")
    p = Path(path)
    if not p.is_absolute():
        p = project_root() / p
    if not p.exists():
        raise FileNotFoundError(f"config not found: {p}")
    with open(p, "r", encoding="utf-8") as fh:
        raw = yaml.safe_load(fh)
    _validate(raw, p)
    return Config(raw=raw, path=p)


def _validate(raw: Dict[str, Any], p: Path) -> None:
    required = ["region", "season", "data", "windowing", "preprocess", "model",
                "evaluate", "paths"]
    missing = [k for k in required if k not in raw]
    if missing:
        raise ValueError(f"{p}: missing config sections: {', '.join(missing)}")
    if raw["data"]["freq"] not in _FREQ_MINUTES:
        raise ValueError(f"{p}: data.freq must be one of {sorted(_FREQ_MINUTES)}")
    split = float(raw["windowing"]["train_split"])
    if not 0.0 < split < 1.0:
        raise ValueError(f"{p}: windowing.train_split must be in (0, 1)")
