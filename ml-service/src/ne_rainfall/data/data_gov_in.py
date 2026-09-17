"""data.gov.in Open Government Data platform client.

Station-level and subdivision-level IMD rainfall is published here.  Resource
IDs change as datasets are revised, so this client does NOT hard-code one --
:meth:`search` queries the live catalogue and prints IDs you can paste into
``config/northeast.yaml``.  Hard-coding an ID that silently goes stale is how a
pipeline ends up training on an empty frame.

Register for a free key at https://data.gov.in/user/register (the platform's
published sample key works for light use and is the default here).
"""

from __future__ import annotations

import os
from typing import Any, Dict, List, Optional

import pandas as pd

from ne_rainfall.data.base import DataSource, SourceUnavailable, register

SAMPLE_KEY = "579b464db66ec23bdd000001cdd3946e44ce4aad7209ff7b23ac571b"

NE_STATES = [
    "Arunachal Pradesh", "Assam", "Manipur", "Meghalaya",
    "Mizoram", "Nagaland", "Sikkim", "Tripura",
]


@register
class DataGovIn(DataSource):
    key = "data_gov_in"
    provenance = "data.gov.in Open Government Data Platform (Govt. of India)"
    requires_credentials = True

    RESOURCE = "https://api.data.gov.in/resource/{rid}"
    LISTS = "https://api.data.gov.in/lists"

    def __init__(self, api_key: Optional[str] = None,
                 resource_id: Optional[str] = None, **kwargs):
        super().__init__(**kwargs)
        self.api_key = api_key or os.environ.get("DATA_GOV_IN_API_KEY") or SAMPLE_KEY
        self.resource_id = resource_id

    # -- discovery -----------------------------------------------------------
    def search(self, query: str = "rainfall", limit: int = 20) -> pd.DataFrame:
        """List catalogue resources whose title matches ``query``.

        Returns id / title / org / last-updated so you can pick a live dataset.
        """
        url = self.build_url(
            self.LISTS,
            {
                "api-key": self.api_key,
                "format": "json",
                "limit": limit,
                "filters[title]": query,
            },
        )
        payload = self.get_json(url, use_cache=False)
        records = payload.get("records", [])
        if not records:
            raise SourceUnavailable(
                f"data.gov.in: no catalogue match for {query!r} "
                f"(message: {payload.get('message')})"
            )
        return pd.DataFrame(
            [
                {
                    "resource_id": r.get("index_name"),
                    "title": (r.get("title") or "").strip(),
                    "org": "; ".join(r.get("org", []) or []),
                    "updated": r.get("updated_date"),
                    "active": r.get("active"),
                }
                for r in records
            ]
        )

    def describe(self, resource_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """Field list for a resource, so you can map its columns."""
        rid = resource_id or self.resource_id
        if not rid:
            raise ValueError("resource_id required")
        url = self.build_url(
            self.RESOURCE.format(rid=rid),
            {"api-key": self.api_key, "format": "json", "limit": 1},
        )
        payload = self.get_json(url, use_cache=False)
        if payload.get("status") == "error":
            raise SourceUnavailable(f"data.gov.in: {payload.get('message')} (id={rid})")
        return payload.get("field", [])

    # -- records -------------------------------------------------------------
    def records(
        self,
        resource_id: Optional[str] = None,
        filters: Optional[Dict[str, str]] = None,
        limit: int = 1000,
        max_records: int = 100_000,
    ) -> pd.DataFrame:
        """Page through a resource into one frame."""
        rid = resource_id or self.resource_id
        if not rid:
            raise ValueError("resource_id required; run .search() to find one")
        rows: List[Dict[str, Any]] = []
        offset = 0
        while len(rows) < max_records:
            params: Dict[str, Any] = {
                "api-key": self.api_key,
                "format": "json",
                "limit": limit,
                "offset": offset,
            }
            for k, v in (filters or {}).items():
                params[f"filters[{k}]"] = v
            payload = self.get_json(
                self.build_url(self.RESOURCE.format(rid=rid), params)
            )
            if payload.get("status") == "error":
                raise SourceUnavailable(f"data.gov.in: {payload.get('message')}")
            batch = payload.get("records", [])
            rows.extend(batch)
            if len(batch) < limit:
                break
            offset += limit
        return pd.DataFrame(rows)

    def northeast_records(self, resource_id: Optional[str] = None,
                          state_field: str = "state") -> pd.DataFrame:
        """Records filtered to the eight North Eastern states."""
        frames = []
        for state in NE_STATES:
            try:
                frames.append(
                    self.records(resource_id, filters={state_field: state})
                )
            except SourceUnavailable:
                continue
        if not frames:
            raise SourceUnavailable("data.gov.in: no North East records returned")
        return pd.concat(frames, ignore_index=True)

    def fetch_point(self, lat, lon, start, end, variables, freq) -> pd.DataFrame:
        raise SourceUnavailable(
            "data.gov.in resources are tabular, not gridded -- there is no "
            "point query. Use .search()/.records() and map station names "
            "yourself; see docs/DATA_SOURCES.md."
        )
