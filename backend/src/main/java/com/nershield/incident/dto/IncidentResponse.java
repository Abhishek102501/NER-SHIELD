package com.nershield.incident.dto;

import com.nershield.incident.Severity;

/**
 * A single incident record — mirrors the frontend's {@code Incident} type exactly (see
 * {@code frontend/types/index.ts}), field for field, so {@code services/ops.ts} can consume
 * this response with no shape translation.
 *
 * @param x abstract map position in 0-100 space (placeholder, not real geodata — see the
 *     frontend type's own doc comment)
 * @param y abstract map position in 0-100 space (placeholder, not real geodata)
 */
public record IncidentResponse(
        String id,
        Severity severity,
        String title,
        String location,
        String timeAgo,
        double x,
        double y,
        String summary,
        String category,
        String reportedBy) {}
