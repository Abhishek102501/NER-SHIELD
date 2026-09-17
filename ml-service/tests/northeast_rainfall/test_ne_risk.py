from nershield_ml.northeast_rainfall.config import NortheastRainfallSettings
from nershield_ml.northeast_rainfall.risk import classify_rainfall_severity


def test_severity_bands_use_configured_thresholds():
    settings = NortheastRainfallSettings(
        severity_moderate_mm=2.5, severity_high_mm=7.6, severity_critical_mm=35.5
    )
    assert classify_rainfall_severity(1.0, settings) == "low"
    assert classify_rainfall_severity(2.5, settings) == "moderate"
    assert classify_rainfall_severity(7.6, settings) == "high"
    assert classify_rainfall_severity(35.5, settings) == "critical"
