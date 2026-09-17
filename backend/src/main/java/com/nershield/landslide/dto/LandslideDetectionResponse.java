package com.nershield.landslide.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.databind.JsonNode;

/**
 * A single detected landslide polygon.
 *
 * <p>{@code geometry} is passed through as raw GeoJSON ({@link JsonNode}) rather than modeled
 * field-by-field — NER-SHIELD has no existing polygon-geometry DTO to align with (risk zones use
 * a point {@code center}), and GeoJSON is already a standard the frontend map layer consumes
 * directly.
 *
 * @param meanProbability mean model probability across this detection's pixels
 * @param confidence same value as {@code meanProbability}, surfaced explicitly: model output
 *     confidence, NOT a validated real-world accuracy figure
 * @param severity {@code low}, {@code moderate}, {@code high}, or {@code critical} — a
 *     configurable classification, not an official hazard-severity standard
 */
public record LandslideDetectionResponse(
        String id,
        JsonNode geometry,
        @JsonAlias("area_m2") double areaM2,
        @JsonAlias("area_km2") double areaKm2,
        @JsonAlias("mean_probability") double meanProbability,
        @JsonAlias("max_probability") double maxProbability,
        @JsonAlias("pixel_fraction_above_threshold") double pixelFractionAboveThreshold,
        double confidence,
        String severity,
        LandslideCentroidResponse centroid,
        String model,
        @JsonAlias("model_version") String modelVersion,
        @JsonAlias("detected_at") String detectedAt) {}
