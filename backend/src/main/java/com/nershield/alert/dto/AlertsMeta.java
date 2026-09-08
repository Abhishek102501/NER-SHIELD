package com.nershield.alert.dto;

import com.nershield.alert.DataSourceKind;
import java.time.Instant;

/**
 * Response envelope metadata for {@code GET /api/alerts}.
 *
 * @param source {@code live} once a real escalation pipeline is wired in, {@code demo} today
 * @param generatedAt when this response was assembled
 * @param count number of alerts in the accompanying list
 */
public record AlertsMeta(DataSourceKind source, Instant generatedAt, int count) {}
