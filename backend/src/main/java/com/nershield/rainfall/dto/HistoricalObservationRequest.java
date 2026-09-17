package com.nershield.rainfall.dto;

import jakarta.validation.constraints.NotNull;
import java.util.Map;

/** One hourly historical observation across all 37 North East stations. */
public record HistoricalObservationRequest(
        @NotNull String timestamp,
        @NotNull Map<String, Double> rainfall,
        @NotNull Map<String, Double> windSpeed,
        @NotNull Map<String, Double> nwpPrecip) {}
