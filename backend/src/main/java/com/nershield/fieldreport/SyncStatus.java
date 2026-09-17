package com.nershield.fieldreport;

import com.fasterxml.jackson.annotation.JsonValue;
import java.util.Locale;

/** Offline-sync state of a field report. Mirrors the frontend's {@code SyncStatus} type. */
public enum SyncStatus {
    OFFLINE,
    QUEUED,
    SYNCING,
    SYNCED;

    @JsonValue
    public String toJson() {
        return name().toLowerCase(Locale.ROOT);
    }
}
