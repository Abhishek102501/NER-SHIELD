package com.nershield.landslide.dto;

import com.fasterxml.jackson.annotation.JsonAlias;

/** Aggregate counts/area for one completed analysis, by severity band. */
public record LandslideAnalysisSummaryResponse(
        int detections,
        @JsonAlias("affected_area_km2") double affectedAreaKm2,
        int critical,
        int high,
        int moderate,
        int low) {}
