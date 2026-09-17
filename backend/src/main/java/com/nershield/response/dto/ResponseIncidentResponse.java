package com.nershield.response.dto;

import com.nershield.response.ResponsePhase;
import com.nershield.response.Severity;

/** Mirrors the frontend's {@code ResponseIncident} type exactly. */
public record ResponseIncidentResponse(
        String id,
        String title,
        String location,
        Severity severity,
        int riskScore,
        int populationExposure,
        String infrastructureExposure,
        String recommendedAction,
        ResponsePhase phase,
        int priority) {}
