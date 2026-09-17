package com.nershield.fieldreport;

import com.fasterxml.jackson.annotation.JsonValue;
import java.util.Locale;

/** Field report severity band. Serializes lower-case to match the frontend's {@code Severity}. */
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
