package com.nershield.risk.dto;

import com.nershield.risk.DeltaDirection;
import com.nershield.risk.Severity;

/** Mirrors the frontend {@code LocationProfile.risk} shape. */
public record RiskScoreResponse(
        int value, Severity band, int confidence, String deltaLabel, DeltaDirection deltaDirection) {}
