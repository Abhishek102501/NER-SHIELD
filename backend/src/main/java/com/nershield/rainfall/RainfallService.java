package com.nershield.rainfall;

import com.nershield.rainfall.dto.HistoricalObservationRequest;
import com.nershield.rainfall.dto.RainfallExplanationResponse;
import com.nershield.rainfall.dto.RainfallForecastResponse;
import com.nershield.rainfall.dto.RainfallHealthResponse;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

/**
 * Application-facing entry point for North East India rainfall forecasting. Domain code depends
 * on this service, never on {@link RainfallClient} directly — same separation as {@link
 * com.nershield.landslide.LandslideService}.
 */
@Service
public class RainfallService {

    private static final Logger log = LoggerFactory.getLogger(RainfallService.class);

    private final RainfallClient client;

    public RainfallService(RainfallClient client) {
        this.client = client;
    }

    public RainfallHealthResponse health() {
        return client.health();
    }

    public boolean isAvailable() {
        try {
            RainfallHealthResponse response = client.health();
            return response != null && response.available();
        } catch (RainfallServiceException ex) {
            log.warn("North East rainfall forecasting is unavailable: {}", ex.getMessage());
            return false;
        }
    }

    public RainfallForecastResponse forecastDemo() {
        return client.forecastDemo();
    }

    public RainfallForecastResponse forecast(List<HistoricalObservationRequest> historical) {
        return client.forecast(historical);
    }

    public RainfallExplanationResponse explainDemo(int horizon) {
        return client.explainDemo(horizon);
    }

    public RainfallExplanationResponse explain(List<HistoricalObservationRequest> historical, int horizon) {
        return client.explain(historical, horizon);
    }
}
