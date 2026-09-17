package com.nershield.fieldreport.dto;

import com.nershield.fieldreport.Severity;
import com.nershield.fieldreport.SyncStatus;

/**
 * A single field report — mirrors the frontend's {@code FieldReportDraft} type exactly (see
 * {@code frontend/types/index.ts}), field for field.
 */
public record FieldReportResponse(
        String id,
        String gps,
        String incidentType,
        Severity severity,
        int evidenceCount,
        SyncStatus status,
        String timeAgo) {}
