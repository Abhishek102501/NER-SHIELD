package com.nershield.threat.detection;

/**
 * Category of entity a detection identified.
 *
 * <p>{@code sensitivityWeight} feeds {@link com.nershield.threat.RiskClassifier}: it is a
 * fixed, documented judgement of how sensitive this entity category is if exposed, on a
 * 0-1 scale, independent of any single detection's confidence or context.
 */
public enum EntityType {
    CREDENTIAL("Credential", 1.00),
    PERSON("Person", 0.85),
    ORGANIZATION("Organization", 0.60),
    IP_ADDRESS("IP Address", 0.55),
    DOCUMENT("Document", 0.50),
    DEVICE("Device", 0.35);

    private final String displayName;
    private final double sensitivityWeight;

    EntityType(String displayName, double sensitivityWeight) {
        this.displayName = displayName;
        this.sensitivityWeight = sensitivityWeight;
    }

    /** Human-readable label used in threat names and descriptions. */
    public String displayName() {
        return displayName;
    }

    /** Fixed sensitivity judgement for this category, 0 (benign) to 1 (highly sensitive). */
    public double sensitivityWeight() {
        return sensitivityWeight;
    }
}
