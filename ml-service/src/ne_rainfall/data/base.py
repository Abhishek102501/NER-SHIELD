"""Common plumbing for every data source: caching, retries, registry."""

from __future__ import annotations

import hashlib
import json
import time
import urllib.error
import urllib.parse
import urllib.request
from abc import ABC, abstractmethod
from pathlib import Path
from typing import Any, Dict, Optional

import pandas as pd

USER_AGENT = "ne-rainfall-forecasting/1.0 (research; github.com/omkar-nitsure)"


class SourceUnavailable(RuntimeError):
    """A source could not be reached or refused the request.

    Raised rather than silently returning an empty frame, so a failed download
    can never be mistaken for a dry period.
    """


class DataSource(ABC):
    """Fetches one variable for one point, at the configured frequency."""

    #: short key used in config under ``data.sources``
    key: str = ""
    #: human-readable provenance, written into the dataset manifest
    provenance: str = ""
    #: True when the source needs an API key or a manual download
    requires_credentials: bool = False

    def __init__(self, cache_dir: str | Path = "data/raw/cache", timeout: int = 90,
                 max_retries: int = 4, throttle_s: float = 0.6):
        self.cache_dir = Path(cache_dir)
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        self.timeout = timeout
        self.max_retries = max_retries
        self.throttle_s = throttle_s

    # -- subclass contract ---------------------------------------------------
    @abstractmethod
    def fetch_point(
        self,
        lat: float,
        lon: float,
        start: str,
        end: str,
        variables: Dict[str, str],
        freq: str,
    ) -> pd.DataFrame:
        """Return a tz-naive, ``DatetimeIndex``-indexed frame.

        Columns are the *canonical* names (the keys of ``variables``), not the
        provider's own names, so callers never branch on the source.
        """

    # -- shared helpers ------------------------------------------------------
    def _cache_path(self, url: str) -> Path:
        h = hashlib.sha256(url.encode("utf-8")).hexdigest()[:24]
        return self.cache_dir / f"{self.key}_{h}.json"

    def get_json(self, url: str, use_cache: bool = True) -> Any:
        """GET with on-disk cache and exponential backoff.

        Downloading nine monsoon seasons for 37 stations is thousands of
        requests; the cache makes a re-run of the pipeline free and keeps us
        from hammering a public endpoint.
        """
        cache = self._cache_path(url)
        if use_cache and cache.exists():
            try:
                return json.loads(cache.read_text(encoding="utf-8"))
            except json.JSONDecodeError:
                cache.unlink(missing_ok=True)

        last: Optional[Exception] = None
        for attempt in range(self.max_retries):
            try:
                req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
                with urllib.request.urlopen(req, timeout=self.timeout) as resp:
                    payload = json.loads(resp.read().decode("utf-8"))
                cache.write_text(json.dumps(payload), encoding="utf-8")
                time.sleep(self.throttle_s)
                return payload
            except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as exc:
                last = exc
                # 4xx other than 429 will not fix themselves -- fail fast.
                if isinstance(exc, urllib.error.HTTPError) and exc.code not in (
                    429, 500, 502, 503, 504
                ):
                    break
                time.sleep(2 ** attempt)
        raise SourceUnavailable(f"{self.key}: GET failed for {url}: {last}") from last

    @staticmethod
    def build_url(base: str, params: Dict[str, Any]) -> str:
        clean = {k: v for k, v in params.items() if v is not None}
        return f"{base}?{urllib.parse.urlencode(clean)}"

    @staticmethod
    def conform(df: pd.DataFrame, start: str, end: str, freq: str) -> pd.DataFrame:
        """Snap a frame onto the exact modelling time axis.

        Sources disagree about endpoints, DST-free local time and missing
        hours.  Reindexing here means every block of the feature matrix shares
        one index, which is what the original pipeline assumed but never
        enforced -- a silent row misalignment there would shift the GFS block
        against the observations and quietly destroy the correlation.
        """
        if df.empty:
            return df
        idx = pd.date_range(start=start, end=end, freq=freq)
        df = df[~df.index.duplicated(keep="first")].sort_index()
        return df.reindex(idx)


_REGISTRY: Dict[str, type] = {}


def register(cls: type) -> type:
    _REGISTRY[cls.key] = cls
    return cls


def get_source(key: str, **kwargs: Any) -> DataSource:
    """Instantiate a source by its config key."""
    # Imported here to avoid a circular import at module load.
    from ne_rainfall.data import (  # noqa: F401
        data_gov_in, imd, india_wris, nasa_power, open_meteo,
    )

    if key not in _REGISTRY:
        raise KeyError(
            f"unknown data source {key!r}; available: {', '.join(sorted(_REGISTRY))}"
        )
    return _REGISTRY[key](**kwargs)
