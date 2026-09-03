package com.nershield.threat;

import com.fasterxml.jackson.annotation.JsonValue;
import java.util.Locale;

/**
 * Whether a {@code GET /api/threats} response reflects real detections or demonstration
 * data. The frontend uses this to decide whether it may show a "LIVE" indicator.
 */
public enum DataSourceKind {
    LIVE,
    DEMO;

    @JsonValue
    public String toJson() {
        return name().toLowerCase(Locale.ROOT);
    }
}
