package com.nershield.landslide.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.databind.JsonNode;
import java.util.List;

/**
 * Full analysis payload returned by both {@code POST /landslide/analyze} (initial, usually
 * {@code queued}/{@code running}) and {@code GET /landslide/analysis/{id}} (polled status).
 *
 * <p>Deserializes the Python AI service's snake_case wire format via {@link JsonAlias} but
 * re-serializes to the frontend in idiomatic camelCase — same convention as {@link
 * com.nershield.risk.dto.RiskZoneResponse} and unlike {@link com.nershield.ai.dto.AIHealthResponse}
 * (which is never returned to the frontend directly, so it keeps the wire format as-is).
 *
 * @param mode {@code real} or {@code mock} — which pipeline actually produced these results.
 *     Never omit or hide this from the frontend: a mock result must never be presented as a real
 *     AI prediction.
 * @param geojson a GeoJSON {@code FeatureCollection} of all detections, ready to add as a map
 *     source, or {@code null} until the analysis completes
 */
public record LandslideAnalysisResponse(
        @JsonAlias("analysis_id") String analysisId,
        String status,
        String mode,
        @JsonAlias("model_name") String modelName,
        @JsonAlias("model_version") String modelVersion,
        String error,
        @JsonAlias("error_code") String errorCode,
        LandslideAnalysisSummaryResponse summary,
        List<LandslideDetectionResponse> detections,
        JsonNode geojson) {}
