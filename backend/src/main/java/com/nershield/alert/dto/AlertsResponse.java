package com.nershield.alert.dto;

import java.util.List;

/** Response body for {@code GET /api/alerts}. */
public record AlertsResponse(AlertsMeta meta, List<EscalationAlertResponse> alerts) {}
