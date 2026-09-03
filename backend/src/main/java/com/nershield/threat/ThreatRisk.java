package com.nershield.threat;

import com.fasterxml.jackson.annotation.JsonValue;
import java.util.Locale;

/** Map-facing risk tier. Serializes lower-case to match the frontend's {@code ThreatRisk}. */
public enum ThreatRisk {
    HIGH,
    MEDIUM,
    LOW;

    @JsonValue
    public String toJson() {
        return name().toLowerCase(Locale.ROOT);
    }
}
