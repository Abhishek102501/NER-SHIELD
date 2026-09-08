package com.nershield.alert.dto;

import com.nershield.alert.Severity;

/**
 * A single escalation alert — mirrors the frontend's {@code EscalationAlert} type exactly (see
 * {@code frontend/types/index.ts}), field for field, plus {@code acknowledged} so the frontend
 * can reconcile local state after a {@code PATCH /api/alerts/{id}/acknowledge} call.
 */
public record EscalationAlertResponse(
        String id,
        String zone,
        Severity from,
        Severity to,
        String cause,
        String action,
        String timeAgo,
        boolean acknowledged) {}
