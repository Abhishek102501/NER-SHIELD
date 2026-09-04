package com.nershield.risk;

import com.fasterxml.jackson.annotation.JsonValue;
import java.util.Locale;

/** Direction of a risk score's recent change. Matches the frontend's {@code "up" | "down"}. */
public enum DeltaDirection {
    UP,
    DOWN;

    @JsonValue
    public String toJson() {
        return name().toLowerCase(Locale.ROOT);
    }
}
