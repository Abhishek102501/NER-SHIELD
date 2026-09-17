package com.nershield.fieldreport.dto;

import com.nershield.fieldreport.Severity;

/** Body of {@code POST /api/field-reports} — mirrors the frontend's submission shape. */
public record FieldReportRequest(String gps, String incidentType, Severity severity, int evidenceCount) {}
