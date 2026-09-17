package com.nershield.rainfall.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import java.util.List;

/**
 * North East India rainfall LSTM forecast, proxied from the Python AI service's
 * {@code POST /rainfall/forecast[/demo]}.
 *
 * <p>Deserializes the Python service's snake_case wire format via {@link JsonAlias} but
 * re-serializes to the frontend in idiomatic camelCase — same convention as {@code
 * com.nershield.landslide.dto.LandslideAnalysisResponse}.
 *
 * @param mode {@code real} or {@code demo} — which pipeline actually produced this forecast.
 *     Never omit or hide this from the frontend.
 * @param isGeneralized always {@code false}: the source model is trained only on North East
 *     India stations, not an India-wide forecaster.
 * @param trainingMetrics measured skill of the loaded checkpoint (mode=real only) — {@code null}
 *     in demo mode. Always surfaced alongside a real forecast so a weak/unvalidated checkpoint is
 *     never presented without its own numbers.
 */
public record RainfallForecastResponse(
        String model,
        @JsonAlias("model_version") String modelVersion,
        String mode,
        String station,
        @JsonAlias("geographic_scope") String geographicScope,
        @JsonAlias("is_generalized") boolean isGeneralized,
        @JsonAlias("horizon_hours") double horizonHours,
        @JsonAlias("interval_minutes") int intervalMinutes,
        @JsonAlias("generated_at") String generatedAt,
        List<RainfallForecastPointResponse> forecast,
        Double confidence,
        @JsonAlias("confidence_available") boolean confidenceAvailable,
        @JsonAlias("training_metrics") TrainingMetricsResponse trainingMetrics,
        String error,
        @JsonAlias("error_code") String errorCode) {}
