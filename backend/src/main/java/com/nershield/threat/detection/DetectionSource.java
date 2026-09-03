package com.nershield.threat.detection;

import java.util.List;

/**
 * Supplies raw detection results to the threat pipeline.
 *
 * <p>This is the seam between the NER detection engine and everything downstream. Today
 * the only implementation is {@link DemoDetectionSource}, because the Python AI service
 * (see {@code com.nershield.ai}) exposes nothing beyond {@code /health} yet. When it gains
 * a real inference endpoint, a new implementation (e.g. an {@code AiDetectionSource} built
 * on {@code AIClient}) can be registered in its place — {@link
 * com.nershield.threat.ThreatService}, {@link com.nershield.threat.ThreatTransformer} and
 * the {@code /api/threats} contract all stay exactly as they are.
 */
public interface DetectionSource {

    /** Recent detection results this source currently has available. */
    List<DetectionResult> fetchRecent();

    /**
     * Whether this source reflects real detections. {@code false} for demonstration data —
     * the frontend uses this to avoid labelling demo data as "live".
     */
    boolean isLive();
}
