package com.nershield.health.dto;

/**
 * Lightweight liveness payload for the frontend.
 *
 * @param status {@code UP} while the application is serving requests
 * @param service human-readable service name
 */
public record HealthResponse(String status, String service) {}
