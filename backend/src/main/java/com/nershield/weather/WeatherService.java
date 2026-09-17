package com.nershield.weather;

import com.nershield.weather.dto.WeatherResponse;
import java.time.Instant;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.util.UriComponentsBuilder;

/**
 * Fetches real current-conditions weather from Open-Meteo (https://open-meteo.com) — a free
 * public API that needs no API key, hence no {@code WEATHER_API_KEY} in this project's
 * {@code .env.example}: only {@code WEATHER_PROVIDER} (default {@code none}) gates it.
 *
 * <p>Never returns a fabricated reading. {@link #getCurrentWeather} returns {@code
 * available=false} with an explicit {@code reason} whenever no provider is configured or the
 * upstream call fails — see {@link WeatherResponse#unavailable(String)}.
 */
@Service
public class WeatherService {

    private final WeatherProperties properties;
    private final RestClient restClient;

    public WeatherService(WeatherProperties properties) {
        this.properties = properties;
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(5000);
        requestFactory.setReadTimeout(5000);
        this.restClient = RestClient.builder().requestFactory(requestFactory).build();
    }

    public WeatherResponse getCurrentWeather(double latitude, double longitude) {
        if (!properties.isConfigured()) {
            return WeatherResponse.unavailable(
                    "No weather provider configured. Set WEATHER_PROVIDER=open-meteo (no API"
                            + " key required) to enable this endpoint.");
        }

        String url =
                UriComponentsBuilder.fromUriString(properties.baseUrl() + "/v1/forecast")
                        .queryParam("latitude", latitude)
                        .queryParam("longitude", longitude)
                        .queryParam(
                                "current",
                                "temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m")
                        .toUriString();

        try {
            OpenMeteoResponse raw = restClient.get().uri(url).retrieve().body(OpenMeteoResponse.class);
            if (raw == null || raw.current() == null) {
                return WeatherResponse.unavailable("Open-Meteo returned an empty response.");
            }
            OpenMeteoResponse.Current c = raw.current();
            return new WeatherResponse(
                    true,
                    "open-meteo",
                    "Open-Meteo (open-meteo.com)",
                    url,
                    Instant.now(),
                    latitude,
                    longitude,
                    c.temperature_2m(),
                    c.wind_speed_10m(),
                    c.relative_humidity_2m() != null ? c.relative_humidity_2m().intValue() : null,
                    c.precipitation(),
                    null);
        } catch (RestClientException ex) {
            return WeatherResponse.unavailable("Open-Meteo request failed: " + ex.getMessage());
        }
    }
}
