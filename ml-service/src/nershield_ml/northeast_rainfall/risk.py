"""Rainfall-intensity -> severity banding for a single hourly forecast point.
Thresholds are the real IMD hourly rainfall-intensity breakpoints (mm/hour) —
NOT an official NER-SHIELD flood-warning threshold, same "transparent,
configurable, non-official" pattern as `landslide4sense`'s and the earlier
Mumbai module's severity classifiers.
"""

from __future__ import annotations

from nershield_ml.northeast_rainfall.config import NortheastRainfallSettings

Severity = str  # "low" | "moderate" | "high" | "critical"


def classify_rainfall_severity(rainfall_mm: float, settings: NortheastRainfallSettings) -> Severity:
    if rainfall_mm >= settings.severity_critical_mm:
        return "critical"
    if rainfall_mm >= settings.severity_high_mm:
        return "high"
    if rainfall_mm >= settings.severity_moderate_mm:
        return "moderate"
    return "low"
