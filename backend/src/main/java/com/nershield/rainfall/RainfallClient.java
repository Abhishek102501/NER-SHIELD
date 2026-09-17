package com.nershield.rainfall;

import com.nershield.ai.AIProperties;
import com.nershield.rainfall.dto.HistoricalObservationRequest;
import com.nershield.rainfall.dto.RainfallExplanationResponse;
import com.nershield.rainfall.dto.RainfallForecastResponse;
import com.nershield.rainfall.dto.RainfallHealthResponse;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

/**
 * HTTP transport to the Python AI service's North East rainfall endpoints. Shares {@link
 * AIProperties} with {@link com.nershield.ai.AIClient} — same FastAPI host, different route
 * prefix.
 */
@Component
public class RainfallClient {

    private final RestClient restClient;

    public RainfallClient(RestClient.Builder builder, AIProperties properties) {
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout((int) properties.connectTimeout().toMillis());
        requestFactory.setReadTimeout((int) properties.readTimeout().toMillis());

        this.restClient =
                builder.baseUrl(properties.baseUrl()).requestFactory(requestFactory).build();
    }

    /**
     * @throws RainfallServiceException if the service is unreachable or returns an error status
     */
    public RainfallHealthResponse health() {
        try {
            return restClient.get().uri("/rainfall/health").retrieve().body(RainfallHealthResponse.class);
        } catch (RestClientException ex) {
            throw new RainfallServiceException("North East rainfall health check failed.", ex);
        }
    }

    /**
     * Runs a forecast against the AI service's built-in synthetic demo window — no historical
     * data required.
     *
     * @throws RainfallServiceException if the service is unreachable or returns an error status
     */
    public RainfallForecastResponse forecastDemo() {
        try {
            return restClient
                    .post()
                    .uri("/rainfall/forecast/demo")
                    .retrieve()
                    .body(RainfallForecastResponse.class);
        } catch (RestClientException ex) {
            throw new RainfallServiceException("Failed to run North East rainfall demo forecast.", ex);
        }
    }

    /**
     * Runs a forecast against real historical observations.
     *
     * @throws RainfallServiceException if the service is unreachable, rejects the input, or
     *     returns an error status
     */
    public RainfallForecastResponse forecast(List<HistoricalObservationRequest> historical) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put(
                "historical",
                historical.stream()
                        .map(
                                obs -> {
                                    Map<String, Object> wireObs = new LinkedHashMap<>();
                                    wireObs.put("timestamp", obs.timestamp());
                                    wireObs.put("rainfall", obs.rainfall());
                                    // The Python service's wire format is snake_case
                                    // (FastAPI/Pydantic's native convention) — translate here
                                    // rather than polluting the Java-facing DTO's camelCase.
                                    wireObs.put("wind_speed", obs.windSpeed());
                                    wireObs.put("nwp_precip", obs.nwpPrecip());
                                    return wireObs;
                                })
                        .toList());

        try {
            return restClient
                    .post()
                    .uri("/rainfall/forecast")
                    .body(body)
                    .retrieve()
                    .body(RainfallForecastResponse.class);
        } catch (HttpClientErrorException ex) {
            // 400/422 from the AI service means bad input (insufficient history, malformed
            // observation) — a client error, not a dependency outage.
            throw new IllegalArgumentException("Invalid rainfall forecast request: " + ex.getStatusCode());
        } catch (RestClientException ex) {
            throw new RainfallServiceException("Failed to run North East rainfall forecast.", ex);
        }
    }

    /**
     * SHAP explanation for one lead time of a forecast against the AI service's synthetic demo
     * window. 503 from the AI service means no XGBoost co-forecaster is loaded there (TreeSHAP
     * needs it — the LSTM alone can't be explained exactly).
     *
     * @throws RainfallServiceException if the service is unreachable, has no XGBoost
     *     co-forecaster loaded, or returns an error status
     */
    public RainfallExplanationResponse explainDemo(int horizon) {
        try {
            return restClient
                    .post()
                    .uri(uriBuilder -> uriBuilder.path("/rainfall/explain/demo").queryParam("horizon", horizon).build())
                    .retrieve()
                    .body(RainfallExplanationResponse.class);
        } catch (RestClientException ex) {
            throw new RainfallServiceException("Failed to explain North East rainfall demo forecast.", ex);
        }
    }

    /**
     * SHAP explanation for one lead time of a forecast against real historical observations.
     *
     * @throws IllegalArgumentException if the AI service rejects the input (bad history)
     * @throws RainfallServiceException if the service is unreachable, has no XGBoost
     *     co-forecaster loaded, or returns an error status
     */
    public RainfallExplanationResponse explain(List<HistoricalObservationRequest> historical, int horizon) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put(
                "historical",
                historical.stream()
                        .map(
                                obs -> {
                                    Map<String, Object> wireObs = new LinkedHashMap<>();
                                    wireObs.put("timestamp", obs.timestamp());
                                    wireObs.put("rainfall", obs.rainfall());
                                    wireObs.put("wind_speed", obs.windSpeed());
                                    wireObs.put("nwp_precip", obs.nwpPrecip());
                                    return wireObs;
                                })
                        .toList());

        try {
            return restClient
                    .post()
                    .uri(uriBuilder -> uriBuilder.path("/rainfall/explain").queryParam("horizon", horizon).build())
                    .body(body)
                    .retrieve()
                    .body(RainfallExplanationResponse.class);
        } catch (HttpClientErrorException ex) {
            throw new IllegalArgumentException("Invalid rainfall explanation request: " + ex.getStatusCode());
        } catch (RestClientException ex) {
            throw new RainfallServiceException("Failed to explain North East rainfall forecast.", ex);
        }
    }
}
