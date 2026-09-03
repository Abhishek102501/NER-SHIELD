package com.nershield.threat.dto;

import com.nershield.threat.ThreatRisk;
import java.time.Instant;

/**
 * Map-ready, minimized threat event — the only shape the frontend ever sees.
 *
 * <p>Deliberately excludes anything a raw {@link com.nershield.threat.detection.DetectionResult}
 * might otherwise carry: no detected text, no internal identifiers beyond {@code id}, no
 * confidence score. Only what the ThreatMap and its summary strip need to render.
 *
 * @param id stable event id
 * @param latitude {@code null} unless {@code locationAvailable} is {@code true}
 * @param longitude {@code null} unless {@code locationAvailable} is {@code true}
 * @param locationAvailable whether this event has real coordinates to plot; the map must
 *     skip any event where this is {@code false} rather than guess a location
 * @param location human-readable place description (never fabricated beyond what the
 *     detection actually carried)
 * @param entity detected entity type, display label
 * @param threatName short label for the event
 * @param risk deterministic risk tier from {@link com.nershield.threat.RiskClassifier}
 * @param timestamp when the underlying detection occurred
 * @param description short, non-sensitive summary of the event
 */
public record ThreatEventResponse(
        String id,
        Double latitude,
        Double longitude,
        boolean locationAvailable,
        String location,
        String entity,
        String threatName,
        ThreatRisk risk,
        Instant timestamp,
        String description) {}
