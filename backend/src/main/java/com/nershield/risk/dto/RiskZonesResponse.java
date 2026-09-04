package com.nershield.risk.dto;

import java.util.List;

/** Response body for {@code GET /api/risk/zones}. */
public record RiskZonesResponse(RiskZonesMeta meta, List<RiskZoneResponse> zones) {}
