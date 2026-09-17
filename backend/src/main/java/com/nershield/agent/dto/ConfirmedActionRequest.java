package com.nershield.agent.dto;

/** A previously-proposed action the user has now explicitly confirmed. */
public record ConfirmedActionRequest(String type, String incidentId, String unitId, String reason, String priority) {}
