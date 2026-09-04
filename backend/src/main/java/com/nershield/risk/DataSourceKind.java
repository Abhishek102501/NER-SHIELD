package com.nershield.risk;

import com.fasterxml.jackson.annotation.JsonValue;
import java.util.Locale;

/**
 * Whether a {@code GET /api/risk/zones} response reflects real susceptibility model output
 * or demonstration data. The frontend can use this the same way it does for threats, to
 * avoid presenting demo data as live.
 */
public enum DataSourceKind {
    LIVE,
    DEMO;

    @JsonValue
    public String toJson() {
        return name().toLowerCase(Locale.ROOT);
    }
}
