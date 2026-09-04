package com.nershield.incident.dto;

import java.util.List;

/** Response body for {@code GET /api/incidents}. */
public record IncidentsResponse(IncidentsMeta meta, List<IncidentResponse> incidents) {}
