package com.nershield.ai.dto;

/**
 * Health payload returned by the Python AI service.
 *
 * @param status service status reported by FastAPI, e.g. {@code UP}
 */
public record AIHealthResponse(String status) {}
