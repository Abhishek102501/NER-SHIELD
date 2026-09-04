package com.nershield.risk.dto;

import java.util.List;

/**
 * A single monitored location's full risk assessment — mirrors the frontend's {@code
 * LocationProfile} exactly (see {@code frontend/types/index.ts}), field for field, so {@code
 * services/risk.ts} can consume this response with no shape translation.
 *
 * @param center {@code [lng, lat]}, matching the frontend's tuple order
 */
public record RiskZoneResponse(
        String id,
        String name,
        String sector,
        double[] center,
        RiskScoreResponse risk,
        List<RiskFactorResponse> factors,
        RiskMetricsResponse metrics,
        List<RiskDriverResponse> drivers,
        RiskImpactResponse impact,
        int activeIncidents) {}
