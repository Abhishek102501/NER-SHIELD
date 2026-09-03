package com.nershield.threat;

import com.nershield.threat.detection.DetectionResult;
import org.springframework.stereotype.Component;

/**
 * Deterministic risk scoring for a {@link DetectionResult}.
 *
 * <p>There is no existing risk-scoring system elsewhere in the backend to reuse (the
 * {@code gis}/{@code incident} domains that will eventually carry one are unimplemented —
 * see their {@code package-info.java}). This is a first, explicitly documented v1 model,
 * not a random or arbitrary assignment: the score is a fixed weighted combination of three
 * signals already present on every detection, each independently justified:
 *
 * <ul>
 *   <li><b>Entity sensitivity</b> (45%) — {@link com.nershield.threat.detection.EntityType#sensitivityWeight()},
 *       a fixed judgement of how sensitive this category of entity is if exposed (e.g. a
 *       credential outweighs a device id).
 *   <li><b>Detection confidence</b> (30%) — {@link DetectionResult#confidence()}, the
 *       engine's own certainty in the finding.
 *   <li><b>Exposure severity</b> (25%) — {@link com.nershield.threat.detection.ExposureType#weight()},
 *       a fixed judgement of how serious the exposure circumstance is (e.g. a policy
 *       violation outweighs an internal-only review).
 * </ul>
 *
 * <p>The resulting 0-1 score is thresholded into {@link ThreatRisk#HIGH} (&ge; 0.70),
 * {@link ThreatRisk#MEDIUM} (&ge; 0.45) or {@link ThreatRisk#LOW}. Weights and thresholds
 * are intentionally centralized here so they can be tuned — or replaced by a learned model
 * — in one place once real NER/policy data is available.
 */
@Component
public class RiskClassifier {

    private static final double ENTITY_WEIGHT = 0.45;
    private static final double CONFIDENCE_WEIGHT = 0.30;
    private static final double EXPOSURE_WEIGHT = 0.25;

    private static final double HIGH_THRESHOLD = 0.70;
    private static final double MEDIUM_THRESHOLD = 0.45;

    /** Computes the deterministic 0-1 risk score for a detection. */
    public double score(DetectionResult detection) {
        double confidence = clamp(detection.confidence());
        return ENTITY_WEIGHT * detection.entityType().sensitivityWeight()
                + CONFIDENCE_WEIGHT * confidence
                + EXPOSURE_WEIGHT * detection.exposureType().weight();
    }

    /** Classifies a detection into a map-facing risk tier using {@link #score(DetectionResult)}. */
    public ThreatRisk classify(DetectionResult detection) {
        double score = score(detection);
        if (score >= HIGH_THRESHOLD) {
            return ThreatRisk.HIGH;
        }
        if (score >= MEDIUM_THRESHOLD) {
            return ThreatRisk.MEDIUM;
        }
        return ThreatRisk.LOW;
    }

    private static double clamp(double confidence) {
        return Math.max(0.0, Math.min(1.0, confidence));
    }
}
