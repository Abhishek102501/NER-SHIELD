package com.nershield.threat.detection;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import org.springframework.stereotype.Component;

/**
 * Stand-in for the NER detection engine, active until a real one is wired in.
 *
 * <p>The Python AI service (see {@code com.nershield.ai}) has no inference endpoint yet —
 * only {@code /health} — so there is nothing real to fetch detections from. This source
 * returns a fixed, deterministic set of plausible detections instead, so the rest of the
 * pipeline ({@link com.nershield.threat.RiskClassifier}, {@link
 * com.nershield.threat.ThreatTransformer}, {@code GET /api/threats}) can be built, tested
 * and consumed by the frontend today. {@link #isLive()} reports {@code false} so callers
 * (ultimately the frontend) never present this as real detection activity.
 *
 * <p>One entry deliberately omits {@link GeoContext} entirely, to exercise the
 * "no known location" path through the transformer and the map.
 */
@Component
public class DemoDetectionSource implements DetectionSource {

    private static final Instant NOW = Instant.now();

    @Override
    public List<DetectionResult> fetchRecent() {
        return List.of(
                new DetectionResult(
                        "det-001",
                        EntityType.CREDENTIAL,
                        ExposureType.POLICY_VIOLATION,
                        0.93,
                        NOW.minus(45, ChronoUnit.MINUTES),
                        new GeoContext("New Delhi", "Delhi", "India", null, null, 28.6139, 77.2090)),
                new DetectionResult(
                        "det-002",
                        EntityType.PERSON,
                        ExposureType.PUBLIC_EXPOSURE,
                        0.81,
                        NOW.minus(2, ChronoUnit.HOURS),
                        new GeoContext("Shillong", "Meghalaya", "India", null, null, 25.5788, 91.8933)),
                new DetectionResult(
                        "det-003",
                        EntityType.PERSON,
                        ExposureType.POLICY_VIOLATION,
                        0.77,
                        NOW.minus(1, ChronoUnit.DAYS),
                        new GeoContext("Agartala", "Tripura", "India", null, null, 23.8315, 91.2868)),
                new DetectionResult(
                        "det-004",
                        EntityType.IP_ADDRESS,
                        ExposureType.ANOMALOUS_BEHAVIOR,
                        0.72,
                        NOW.minus(4, ChronoUnit.HOURS),
                        new GeoContext("Guwahati", "Assam", "India", null, null, 26.1445, 91.7362)),
                new DetectionResult(
                        "det-005",
                        EntityType.DOCUMENT,
                        ExposureType.THIRD_PARTY_ACCESS,
                        0.66,
                        NOW.minus(15, ChronoUnit.HOURS),
                        new GeoContext("Aizawl", "Mizoram", "India", null, null, 23.7271, 92.7176)),
                new DetectionResult(
                        "det-006",
                        EntityType.IP_ADDRESS,
                        ExposureType.ANOMALOUS_BEHAVIOR,
                        0.60,
                        NOW.minus(30, ChronoUnit.HOURS),
                        new GeoContext("Kohima", "Nagaland", "India", null, null, 25.6751, 94.1086)),
                new DetectionResult(
                        "det-007",
                        EntityType.DEVICE,
                        ExposureType.INTERNAL_ONLY,
                        0.52,
                        NOW.minus(6, ChronoUnit.HOURS),
                        // No GeoContext at all: field sensors report a device id, not a place.
                        // ThreatTransformer must not invent a location for this one.
                        null),
                new DetectionResult(
                        "det-008",
                        EntityType.ORGANIZATION,
                        ExposureType.INTERNAL_ONLY,
                        0.40,
                        NOW.minus(29, ChronoUnit.HOURS),
                        new GeoContext("Itanagar", "Arunachal Pradesh", "India", null, null, 27.4728, 94.9120)));
    }

    @Override
    public boolean isLive() {
        return false;
    }
}
