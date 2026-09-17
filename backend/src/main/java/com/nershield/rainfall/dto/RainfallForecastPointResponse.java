package com.nershield.rainfall.dto;

import com.fasterxml.jackson.annotation.JsonAlias;

/** One 15-minute-interval forecast point. */
public record RainfallForecastPointResponse(
        String timestamp, @JsonAlias("rainfall_mm") double rainfallMm, String severity) {}
