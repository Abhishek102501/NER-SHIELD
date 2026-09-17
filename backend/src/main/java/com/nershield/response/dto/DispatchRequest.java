package com.nershield.response.dto;

/** Body of {@code POST /api/response/dispatch}. */
public record DispatchRequest(String incidentId, String unitId, String priority, String notes) {}
