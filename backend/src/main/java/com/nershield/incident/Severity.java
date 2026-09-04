package com.nershield.incident;

import com.fasterxml.jackson.annotation.JsonValue;
import java.util.Locale;

/** Incident severity band. Serializes lower-case to match the frontend's {@code Severity} type. */
public enum Severity {
    LOW,
    MODERATE,
    HIGH,
    CRITICAL;

    @JsonValue
    public String toJson() {
        return name().toLowerCase(Locale.ROOT);
    }
}
