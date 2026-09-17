from pathlib import Path

import numpy as np
import pytest

from nershield_ml.northeast_rainfall.config import NortheastRainfallSettings
from nershield_ml.northeast_rainfall.model.registry import NortheastRainfallModelRegistry
from nershield_ml.northeast_rainfall.pipeline import _ensemble_confidence, explain_forecast, run_forecast

SMOKE_CHECKPOINT = Path(__file__).resolve().parents[2] / "models" / "northeast_smoke_test_DO_NOT_USE.pt"
LSTM_CHECKPOINT = Path(__file__).resolve().parents[2] / "models" / "northeast_lstm_torch.pt"
XGB_CHECKPOINT = Path(__file__).resolve().parents[2] / "models" / "northeast_xgb_rainfall"


def test_registry_reports_unloaded_when_disabled():
    settings = NortheastRainfallSettings(model_enabled=False)
    registry = NortheastRainfallModelRegistry(settings)
    registry.load()
    assert not registry.is_loaded


def test_registry_reports_unloaded_when_path_missing():
    settings = NortheastRainfallSettings(
        model_enabled=True, inference_mode="real", model_path=Path("does/not/exist.pt")
    )
    registry = NortheastRainfallModelRegistry(settings)
    registry.load()
    assert not registry.is_loaded
    assert registry.load_error is not None


def test_demo_mode_never_requires_a_loaded_registry(valid_window):
    settings = NortheastRainfallSettings(inference_mode="demo")
    registry = NortheastRainfallModelRegistry(settings)  # never loaded
    result = run_forecast(valid_window, settings, registry)
    assert result.mode == "demo"
    assert len(result.points) == 12
    assert all(p.rainfall_mm >= 0 for p in result.points)


def test_real_mode_without_checkpoint_raises(valid_window):
    settings = NortheastRainfallSettings(inference_mode="real", model_enabled=False)
    registry = NortheastRainfallModelRegistry(settings)
    registry.load()
    with pytest.raises(RuntimeError):
        run_forecast(valid_window, settings, registry)


@pytest.mark.skipif(
    not SMOKE_CHECKPOINT.exists(), reason="Smoke-test checkpoint not present on this machine (models/ is gitignored)"
)
def test_smoke_checkpoint_loads_and_infers_but_is_flagged_weak(valid_window):
    """This checkpoint has no predictive value (see package docstring) — this
    test only verifies the real inference *pipeline* is wired correctly, not
    that its output is trustworthy. `training_metrics` must always come back
    with it so a caller can see that for themselves. `xgb_model_path=None` is
    explicit so this stays an LSTM-only check regardless of this
    environment's own `.env` (which sets `NORTHEAST_RAINFALL_XGB_MODEL_PATH`).
    """
    settings = NortheastRainfallSettings(
        inference_mode="real",
        model_enabled=True,
        model_path=SMOKE_CHECKPOINT,
        xgb_model_path=None,
        device="cpu",
    )
    registry = NortheastRainfallModelRegistry(settings)
    registry.load()
    assert registry.is_loaded
    assert registry.current.training_metrics.get("mean_corr_scaled") is not None
    assert registry.current.training_metrics["mean_corr_scaled"] < 0.15  # documented as ~ -0.05

    result = run_forecast(valid_window, settings, registry)
    assert result.mode == "real"
    assert len(result.points) == 12
    assert result.training_metrics.get("mean_corr_scaled") is not None
    for p in result.points:
        assert np.isfinite(p.rainfall_mm)
        assert p.rainfall_mm >= 0


def test_ensemble_confidence_is_one_when_members_agree():
    assert _ensemble_confidence([[1.0, 2.0, 3.0], [1.0, 2.0, 3.0]]) == pytest.approx(1.0)


def test_ensemble_confidence_drops_as_members_disagree():
    close = _ensemble_confidence([[1.0, 2.0, 3.0], [1.1, 2.1, 3.1]])
    far = _ensemble_confidence([[1.0, 2.0, 3.0], [5.0, 8.0, 12.0]])
    assert 0.0 <= far < close <= 1.0


def test_ensemble_confidence_handles_zero_totals_without_dividing_by_zero():
    assert _ensemble_confidence([[0.0, 0.0], [0.0, 0.0]]) == pytest.approx(1.0)
    assert _ensemble_confidence([[0.0, 0.0], [1.0, 1.0]]) == pytest.approx(0.0)


@pytest.mark.skipif(
    not (LSTM_CHECKPOINT.exists() and XGB_CHECKPOINT.exists()),
    reason="Real LSTM + XGBoost checkpoints not present on this machine (models/ is gitignored)",
)
def test_real_mode_uses_ensemble_and_reports_confidence_when_xgb_available(valid_window):
    """With both checkpoints present, real mode must report
    confidence_available=True and a confidence in [0, 1] — the whole point of
    wiring the XGBoost co-forecaster in.
    """
    settings = NortheastRainfallSettings(
        inference_mode="real",
        model_enabled=True,
        model_path=LSTM_CHECKPOINT,
        xgb_model_path=XGB_CHECKPOINT,
        device="cpu",
    )
    registry = NortheastRainfallModelRegistry(settings)
    registry.load()
    assert registry.is_loaded
    assert registry.current.ensemble is not None

    result = run_forecast(valid_window, settings, registry)
    assert result.mode == "real"
    assert result.confidence_available is True
    assert result.confidence is not None
    assert 0.0 <= result.confidence <= 1.0
    assert len(result.points) == 12
    for p in result.points:
        assert np.isfinite(p.rainfall_mm)
        assert p.rainfall_mm >= 0


def test_real_mode_without_xgb_path_has_no_confidence(valid_window):
    """The ensemble is additive-only: with no xgb_model_path configured, real
    mode must behave exactly as it did before the ensemble existed.
    `xgb_model_path=None` is explicit here because this environment's own
    `.env` sets `NORTHEAST_RAINFALL_XGB_MODEL_PATH` — a kwarg not passed
    would otherwise fall through to that, not to the class default.
    """
    settings = NortheastRainfallSettings(
        inference_mode="real", model_enabled=True, model_path=LSTM_CHECKPOINT, xgb_model_path=None, device="cpu"
    )
    if not LSTM_CHECKPOINT.exists():
        pytest.skip("Real LSTM checkpoint not present on this machine (models/ is gitignored)")
    registry = NortheastRainfallModelRegistry(settings)
    registry.load()
    assert registry.is_loaded
    assert registry.current.ensemble is None

    result = run_forecast(valid_window, settings, registry)
    assert result.confidence_available is False
    assert result.confidence is None


def test_explain_raises_when_nothing_loaded(valid_window):
    settings = NortheastRainfallSettings(model_enabled=False)
    registry = NortheastRainfallModelRegistry(settings)
    registry.load()
    with pytest.raises(RuntimeError):
        explain_forecast(valid_window, registry)


@pytest.mark.skipif(
    not LSTM_CHECKPOINT.exists(),
    reason="Real LSTM checkpoint not present on this machine (models/ is gitignored)",
)
def test_explain_raises_when_lstm_loaded_without_xgb(valid_window):
    """TreeSHAP is exact for the XGBoost model only — the LSTM alone (no
    xgb_model_path) must not silently produce an explanation for it.
    """
    settings = NortheastRainfallSettings(
        inference_mode="real", model_enabled=True, model_path=LSTM_CHECKPOINT, xgb_model_path=None, device="cpu"
    )
    registry = NortheastRainfallModelRegistry(settings)
    registry.load()
    assert registry.is_loaded
    assert registry.current.explainer is None
    with pytest.raises(RuntimeError):
        explain_forecast(valid_window, registry)


@pytest.mark.skipif(
    not (LSTM_CHECKPOINT.exists() and XGB_CHECKPOINT.exists()),
    reason="Real LSTM + XGBoost checkpoints not present on this machine (models/ is gitignored)",
)
def test_explain_returns_additive_shap_explanation(valid_window):
    settings = NortheastRainfallSettings(
        inference_mode="real",
        model_enabled=True,
        model_path=LSTM_CHECKPOINT,
        xgb_model_path=XGB_CHECKPOINT,
        device="cpu",
    )
    registry = NortheastRainfallModelRegistry(settings)
    registry.load()
    assert registry.is_loaded
    assert registry.current.explainer is not None

    explanation = explain_forecast(valid_window, registry, horizon=0)
    assert explanation.horizon == 0
    assert explanation.lead_time_min == 60
    assert len(explanation.contributions) > 0
    assert explanation.additivity_error < 1e-4
    assert np.isfinite(explanation.prediction_mm)

    narrative = explanation.narrate()
    assert isinstance(narrative, str)
    assert str(round(explanation.prediction_mm, 2)) in narrative or len(narrative) > 0


@pytest.mark.skipif(
    not (LSTM_CHECKPOINT.exists() and XGB_CHECKPOINT.exists()),
    reason="Real LSTM + XGBoost checkpoints not present on this machine (models/ is gitignored)",
)
def test_explain_rejects_out_of_range_horizon(valid_window):
    settings = NortheastRainfallSettings(
        inference_mode="real",
        model_enabled=True,
        model_path=LSTM_CHECKPOINT,
        xgb_model_path=XGB_CHECKPOINT,
        device="cpu",
    )
    registry = NortheastRainfallModelRegistry(settings)
    registry.load()
    with pytest.raises(IndexError):
        explain_forecast(valid_window, registry, horizon=999)
