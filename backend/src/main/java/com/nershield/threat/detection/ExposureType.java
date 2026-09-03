package com.nershield.threat.detection;

/**
 * How a detected entity came to be flagged.
 *
 * <p>{@code weight} feeds {@link com.nershield.threat.RiskClassifier}: a fixed, documented
 * judgement of how serious this exposure category is on its own, 0-1, independent of which
 * entity type or how confident the detection was.
 */
public enum ExposureType {
    POLICY_VIOLATION("Policy Violation", 1.00),
    PUBLIC_EXPOSURE("Public Exposure", 0.90),
    ANOMALOUS_BEHAVIOR("Anomalous Behavior", 0.60),
    THIRD_PARTY_ACCESS("Third-Party Access", 0.50),
    INTERNAL_ONLY("Internal Access Review", 0.20);

    private final String label;
    private final double weight;

    ExposureType(String label, double weight) {
        this.label = label;
        this.weight = weight;
    }

    /** Human-readable label used in threat names and descriptions. */
    public String label() {
        return label;
    }

    /** Fixed seriousness judgement for this exposure category, 0 (benign) to 1 (severe). */
    public double weight() {
        return weight;
    }
}
