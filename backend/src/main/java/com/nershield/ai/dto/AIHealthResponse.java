package com.nershield.ai.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * Health payload returned by the Python AI service.
 *
 * <p>Wire format is snake_case (FastAPI/Pydantic's native convention); Java field names
 * stay idiomatic camelCase via {@link JsonProperty}.
 *
 * @param status service status reported by FastAPI, e.g. {@code UP}
 * @param modelLoaded whether a trained model artifact is currently loaded
 * @param modelVersion version identifier of the loaded model, or {@code null} if none is loaded
 * @param lastTrained ISO-8601 timestamp of when the loaded model was trained, or {@code null}
 *     if none is loaded
 */
public record AIHealthResponse(
        String status,
        @JsonProperty("model_loaded") boolean modelLoaded,
        @JsonProperty("model_version") String modelVersion,
        @JsonProperty("last_trained") String lastTrained) {}
