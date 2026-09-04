package com.nershield.risk.dto;

import com.nershield.risk.Severity;

/** Mirrors the frontend {@code RiskFactor} shape. */
public record RiskFactorResponse(String id, String label, int weight, Severity severity) {}
