package com.nershield.risk.dto;

import com.nershield.risk.Severity;

/** Mirrors the frontend {@code RiskDriver} shape. */
public record RiskDriverResponse(
        String id, String label, String detail, int contribution, Severity severity) {}
