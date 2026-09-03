package com.nershield.threat.dto;

import com.nershield.threat.DataSourceKind;
import java.time.Instant;

/**
 * Response envelope metadata for {@code GET /api/threats}.
 *
 * @param source {@code live} once a real detection source is wired in, {@code demo} today
 * @param generatedAt when this response was assembled
 * @param count number of events in the accompanying list, for cheap client-side sanity checks
 */
public record ThreatsMeta(DataSourceKind source, Instant generatedAt, int count) {}
