package com.nershield.threat.detection;

import java.time.Instant;

/**
 * A single raw detection, as produced by a {@link DetectionSource}.
 *
 * <p>This is the internal, pre-transformation model — deliberately free of any risk score
 * or map-ready formatting, which are computed downstream by {@link
 * com.nershield.threat.RiskClassifier} and {@link com.nershield.threat.ThreatTransformer}.
 * It also deliberately carries no raw detected text: only the classification of what was
 * found, never the sensitive value itself.
 *
 * @param id stable identifier for this detection, preserved as the resulting threat event's id
 * @param entityType category of entity the detection identified
 * @param exposureType how the entity came to be flagged
 * @param confidence the detection engine's confidence in this finding, 0-1
 * @param detectedAt when the detection occurred
 * @param geo geographic context, if any — never fabricated when absent
 */
public record DetectionResult(
        String id,
        EntityType entityType,
        ExposureType exposureType,
        double confidence,
        Instant detectedAt,
        GeoContext geo) {}
