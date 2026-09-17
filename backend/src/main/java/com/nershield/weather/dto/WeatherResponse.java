package com.nershield.weather.dto;

import java.time.Instant;

/**
 * Current-conditions weather reading, or an honest "unavailable" state.
 *
 * @param available {@code false} whenever a real reading could not be obtained — the fields
 *     below are all {@code null} in that case, never fabricated
 * @param provider {@code "open-meteo"}, or {@code null} if no provider is configured
 * @param source human-readable attribution (e.g. the upstream API name)
 * @param sourceUrl the exact upstream request URL that produced this reading, for provenance
 * @param fetchedAt when this reading was retrieved
 * @param latitude/longitude the coordinates the reading applies to
 * @param temperatureCelsius/windSpeedKph/relativeHumidityPercent/precipitationMm current
 *     conditions, straight from the provider — never adjusted or invented
 * @param reason set only when {@code available=false}: why (e.g. "no provider configured",
 *     or the upstream error)
 */
public record WeatherResponse(
        boolean available,
        String provider,
        String source,
        String sourceUrl,
        Instant fetchedAt,
        Double latitude,
        Double longitude,
        Double temperatureCelsius,
        Double windSpeedKph,
        Integer relativeHumidityPercent,
        Double precipitationMm,
        String reason) {

    public static WeatherResponse unavailable(String reason) {
        return new WeatherResponse(false, null, null, null, null, null, null, null, null, null, null, reason);
    }
}
