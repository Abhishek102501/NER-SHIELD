package com.nershield.rainfall.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import java.util.List;

/** Health payload for the North East rainfall LSTM, from {@code GET /rainfall/health}. */
public record RainfallHealthResponse(
        boolean available,
        boolean loaded,
        String device,
        String model,
        @JsonAlias("model_version") String modelVersion,
        @JsonAlias("inference_mode") String inferenceMode,
        String reason,
        @JsonAlias("supported_stations") List<String> supportedStations,
        @JsonAlias("training_metrics") TrainingMetricsResponse trainingMetrics) {}
