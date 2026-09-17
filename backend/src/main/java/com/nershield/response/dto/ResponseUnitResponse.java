package com.nershield.response.dto;

/** Mirrors the frontend's {@code ResponseUnit} type exactly. */
public record ResponseUnitResponse(String id, String label, String kind, String base, int etaMinutes) {}
