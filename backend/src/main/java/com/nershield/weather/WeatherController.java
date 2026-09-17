package com.nershield.weather;

import com.nershield.weather.dto.WeatherResponse;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * {@code GET /api/weather/current} — real current-conditions weather via Open-Meteo, or an
 * honest {@code available=false} if no provider is configured/reachable. Public only because
 * no auth mechanism is wired in yet, same rationale as {@code ThreatController}.
 */
@RestController
public class WeatherController {

    private final WeatherService service;

    public WeatherController(WeatherService service) {
        this.service = service;
    }

    @GetMapping("/api/weather/current")
    public WeatherResponse getCurrentWeather(
            @RequestParam double latitude, @RequestParam double longitude) {
        return service.getCurrentWeather(latitude, longitude);
    }
}
