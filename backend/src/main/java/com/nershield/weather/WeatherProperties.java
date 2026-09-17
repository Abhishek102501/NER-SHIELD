package com.nershield.weather;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Weather provider configuration. {@code open-meteo} requires no API key (a real, free,
 * public API — see https://open-meteo.com); {@code none} disables the feature entirely and
 * {@code WeatherService} reports {@code available=false} rather than fabricating a reading.
 *
 * @param provider {@code open-meteo} or {@code none}
 * @param baseUrl Open-Meteo forecast API base URL, overridable for testing
 */
@ConfigurationProperties(prefix = "nershield.weather")
public record WeatherProperties(String provider, String baseUrl) {

    public WeatherProperties {
        if (provider == null || provider.isBlank()) {
            provider = "none";
        }
        if (baseUrl == null || baseUrl.isBlank()) {
            baseUrl = "https://api.open-meteo.com";
        }
    }

    public boolean isConfigured() {
        return "open-meteo".equalsIgnoreCase(provider);
    }
}
