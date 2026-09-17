package com.nershield.landslide.dto;

import com.fasterxml.jackson.annotation.JsonAlias;

/**
 * Health payload for the Landslide4Sense model, returned by the Python AI service's {@code
 * GET /landslide/health}.
 *
 * <p>Deserializes the Python service's snake_case wire format via {@link JsonAlias} but
 * re-serializes to the frontend in idiomatic camelCase — this DTO (unlike {@link
 * com.nershield.ai.dto.AIHealthResponse}) is returned directly by {@code LandslideController}.
 *
 * @param available whether analysis can currently be requested at all (true in mock mode even
 *     with no checkpoint loaded)
 * @param loaded whether the real trained checkpoint is loaded in memory
 * @param device {@code cpu} or {@code cuda}, or {@code null} if not loaded
 * @param model model name, e.g. {@code Landslide4Sense}
 * @param version model/architecture version identifier
 * @param inferenceMode {@code real} or {@code mock}
 * @param reason why the checkpoint isn't loaded, or {@code null} if it is
 */
public record LandslideHealthResponse(
        boolean available,
        boolean loaded,
        String device,
        String model,
        String version,
        @JsonAlias("inference_mode") String inferenceMode,
        String reason) {}
