package com.nershield.response;

import com.fasterxml.jackson.annotation.JsonValue;
import java.util.Locale;

/** Stage in the detect→assess→prioritize→respond pipeline. Mirrors the frontend's {@code ResponsePhase}. */
public enum ResponsePhase {
    DETECT,
    ASSESS,
    PRIORITIZE,
    RESPOND;

    @JsonValue
    public String toJson() {
        return name().toLowerCase(Locale.ROOT);
    }
}
