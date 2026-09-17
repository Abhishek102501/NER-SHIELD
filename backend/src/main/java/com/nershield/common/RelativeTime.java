package com.nershield.common;

import java.time.Duration;
import java.time.Instant;

/** Formats a timestamp as a human-readable "N min/hr/day ago" string, computed live. */
public final class RelativeTime {

    private RelativeTime() {}

    public static String ago(Instant when) {
        Duration elapsed = Duration.between(when, Instant.now());
        if (elapsed.isNegative()) {
            return "just now";
        }
        long minutes = elapsed.toMinutes();
        if (minutes < 1) {
            return "just now";
        }
        if (minutes < 60) {
            return minutes + " min ago";
        }
        long hours = elapsed.toHours();
        long remMinutes = minutes % 60;
        if (hours < 24) {
            return remMinutes > 0 ? hours + " hr " + remMinutes + " min ago" : hours + " hr ago";
        }
        long days = elapsed.toDays();
        return days + " day" + (days == 1 ? "" : "s") + " ago";
    }
}
