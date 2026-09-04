package com.nershield.risk.dto;

import com.nershield.risk.DataSourceKind;
import java.time.Instant;

/**
 * Response envelope metadata for {@code GET /api/risk/zones}.
 *
 * @param source {@code live} once a real susceptibility model is wired in, {@code demo} today
 * @param generatedAt when this response was assembled
 * @param count number of zones in the accompanying list
 */
public record RiskZonesMeta(DataSourceKind source, Instant generatedAt, int count) {}
