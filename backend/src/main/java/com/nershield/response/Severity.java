package com.nershield.response;

import com.fasterxml.jackson.annotation.JsonValue;
import java.util.Locale;

/** Response-queue severity band. Serializes lower-case to match the frontend's {@code Severity}. */
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
