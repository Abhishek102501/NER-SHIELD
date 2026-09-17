"""HTTP transport to the Spring Boot backend — the ONLY thing tools are allowed to talk to
for operational data. No direct database access, no generated SQL: every read or write the
agent performs goes through the same public REST API the frontend uses, so it inherits all
existing validation, persistence and provenance for free.
"""

from __future__ import annotations

import httpx


class BackendUnavailableError(RuntimeError):
    """Raised when the Spring Boot backend is unreachable or returns an error."""


class BackendClient:
    def __init__(self, base_url: str, timeout_seconds: float) -> None:
        self._client = httpx.Client(base_url=base_url, timeout=timeout_seconds)

    def close(self) -> None:
        self._client.close()

    def _get(self, path: str, params: dict | None = None) -> object:
        try:
            response = self._client.get(path, params=params)
            response.raise_for_status()
            return response.json()
        except httpx.HTTPError as exc:
            raise BackendUnavailableError(f"GET {path} failed: {exc}") from exc

    def _post(self, path: str, json_body: dict) -> object:
        try:
            response = self._client.post(path, json=json_body)
            response.raise_for_status()
            return response.json()
        except httpx.HTTPError as exc:
            raise BackendUnavailableError(f"POST {path} failed: {exc}") from exc

    # ---- Read-only ----

    def get_weather(self, latitude: float, longitude: float) -> dict:
        return self._get("/api/weather/current", {"latitude": latitude, "longitude": longitude})

    def get_rainfall_forecast(self) -> dict:
        return self._post("/api/rainfall/forecast/demo", {})

    def get_gis_layer(self, layer_id: str) -> dict:
        return self._get(f"/api/gis/layers/{layer_id}")

    def get_incidents(self) -> list:
        return self._get("/api/incidents").get("incidents", [])

    def get_threats(self) -> list:
        return self._get("/api/threats").get("events", [])

    def get_risk_zones(self) -> list:
        return self._get("/api/risk/zones").get("zones", [])

    def get_alerts(self) -> list:
        return self._get("/api/alerts").get("alerts", [])

    def get_response_units(self) -> list:
        return self._get("/api/response/units")

    # ---- Write (invoked ONLY by the explicit confirmation path — never by the agent
    # loop's automatic tool execution; see agent/loop.py) ----

    def create_dispatch(self, incident_id: str, unit_id: str, priority: str, notes: str) -> dict:
        return self._post(
            "/api/response/dispatch",
            {"incidentId": incident_id, "unitId": unit_id, "priority": priority, "notes": notes},
        )
