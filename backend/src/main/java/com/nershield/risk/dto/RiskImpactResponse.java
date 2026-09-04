package com.nershield.risk.dto;

/** Mirrors the frontend {@code LocationProfile.impact} shape. */
public record RiskImpactResponse(
        int villages, int roads, int bridges, int hospitals, int populationExposure) {}
