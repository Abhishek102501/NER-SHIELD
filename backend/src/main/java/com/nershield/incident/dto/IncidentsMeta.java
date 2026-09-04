package com.nershield.incident.dto;

import com.nershield.incident.DataSourceKind;
import java.time.Instant;

/**
 * Response envelope metadata for {@code GET /api/incidents}.
 *
 * @param source {@code live} once a real incident feed is wired in, {@code demo} today
 * @param generatedAt when this response was assembled
 * @param count number of incidents in the accompanying list
 */
public record IncidentsMeta(DataSourceKind source, Instant generatedAt, int count) {}
