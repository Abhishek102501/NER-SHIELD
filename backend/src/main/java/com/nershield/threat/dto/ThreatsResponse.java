package com.nershield.threat.dto;

import java.util.List;

/** Response body for {@code GET /api/threats}. */
public record ThreatsResponse(ThreatsMeta meta, List<ThreatEventResponse> events) {}
