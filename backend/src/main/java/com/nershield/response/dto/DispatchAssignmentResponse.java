package com.nershield.response.dto;

import java.time.Instant;

/** A persisted dispatch assignment, returned after {@code POST /api/response/dispatch}. */
public record DispatchAssignmentResponse(
        String id,
        String incidentId,
        String unitId,
        Instant dispatchedAt,
        int etaMinutes,
        String status) {}
