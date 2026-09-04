package com.nershield.risk.dto;

/** Mirrors the frontend {@code LocationProfile.metrics} shape. */
public record RiskMetricsResponse(
        double rainfall24h, double rainfall72h, double soilMoisture, double slope, double elevation) {}
