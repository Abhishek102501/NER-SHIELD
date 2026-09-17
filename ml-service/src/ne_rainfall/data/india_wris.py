"""India-WRIS (Water Resources Information System, Ministry of Jal Shakti).

Publishes daily rainfall by state/district/station for every Indian basin,
including the Brahmaputra and Barak basins that define North East hydrology.
The endpoints are POST-based and periodically restructured, and like IMD they
are often unreachable from outside India, so this client is best-effort and
clearly reports when it cannot connect rather than returning empty data.
"""

from __future__ import annotations

import json
import urllib.error
import urllib.parse
import urllib.request
from typing import Any, Dict, List, Optional

import pandas as pd

from ne_rainfall.data.base import (
    USER_AGENT, DataSource, SourceUnavailable, register,
)

BASE = "https://indiawris.gov.in/Dataset/Rainfall"

NE_STATES = [
    "Arunachal Pradesh", "Assam", "Manipur", "Meghalaya",
    "Mizoram", "Nagaland", "Sikkim", "Tripura",
]


@register
class IndiaWRIS(DataSource):
    key = "india_wris"
    provenance = "India-WRIS, Ministry of Jal Shakti (Govt. of India)"

    def post(self, params: Dict[str, Any], endpoint: str = BASE) -> Any:
        body = urllib.parse.urlencode(params).encode()
        req = urllib.request.Request(
            endpoint,
            data=body,
            headers={
                "User-Agent": USER_AGENT,
                "Content-Type": "application/x-www-form-urlencoded",
                "Accept": "application/json",
            },
        )
        try:
            with urllib.request.urlopen(req, timeout=self.timeout) as resp:
                return json.loads(resp.read().decode("utf-8"))
        except Exception as exc:
            raise SourceUnavailable(
                "India-WRIS unreachable. Its endpoints often refuse non-Indian "
                "and cloud IPs, and the API shape changes between releases. "
                "Export CSVs from https://indiawris.gov.in/wris/ into "
                "data/raw/wris/ and load them with `from_csv_dir` instead. "
                f"({exc})"
            ) from exc

    def state_daily(self, state: str, start: str, end: str) -> pd.DataFrame:
        payload = self.post(
            {
                "stateName": state,
                "startdate": start,
                "enddate": end,
                "agencyName": "CWC",
                "datasetName": "Rainfall",
            }
        )
        rows = payload.get("data") or payload.get("Data") or []
        if not rows:
            raise SourceUnavailable(f"India-WRIS: empty response for {state}")
        return pd.DataFrame(rows)

    def northeast_daily(self, start: str, end: str) -> pd.DataFrame:
        frames, errors = [], []
        for state in NE_STATES:
            try:
                df = self.state_daily(state, start, end)
                df["state"] = state
                frames.append(df)
            except SourceUnavailable as exc:
                errors.append(f"{state}: {exc}")
        if not frames:
            raise SourceUnavailable("India-WRIS: " + " | ".join(errors[:2]))
        return pd.concat(frames, ignore_index=True)

    @staticmethod
    def from_csv_dir(path: str) -> pd.DataFrame:
        """Load CSVs exported by hand from the India-WRIS web UI."""
        from pathlib import Path

        files = sorted(Path(path).glob("*.csv"))
        if not files:
            raise SourceUnavailable(f"no CSVs found in {path}")
        return pd.concat([pd.read_csv(f) for f in files], ignore_index=True)

    def fetch_point(self, lat, lon, start, end, variables, freq) -> pd.DataFrame:
        raise SourceUnavailable(
            "India-WRIS is station/district tabular data, not a point grid; "
            "use .northeast_daily() or .from_csv_dir()."
        )
