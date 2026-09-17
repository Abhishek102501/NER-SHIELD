package com.nershield.rainfall;

import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.willThrow;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.nershield.rainfall.dto.FeatureContributionResponse;
import com.nershield.rainfall.dto.RainfallExplanationResponse;
import com.nershield.rainfall.dto.RainfallForecastPointResponse;
import com.nershield.rainfall.dto.RainfallForecastResponse;
import com.nershield.rainfall.dto.RainfallHealthResponse;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

/**
 * Verifies {@code /api/rainfall/*} through the full filter chain: public access, request/
 * response wiring between {@link RainfallController} and {@link RainfallService}, request-body
 * validation on {@code /forecast}, and that a downstream AI-service outage degrades to {@code
 * 503} via {@code GlobalExceptionHandler} rather than crashing or fabricating a forecast. {@link
 * RainfallClient} is mocked — no real Python AI service is needed to run this test.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class RainfallControllerTest {

    @Autowired private MockMvc mockMvc;

    @MockitoBean private RainfallClient rainfallClient;

    @Test
    void healthReturnsClientResponseWithoutAuthentication() throws Exception {
        given(rainfallClient.health())
                .willReturn(
                        new RainfallHealthResponse(
                                true, true, "cpu", "northeast_rainfall_lstm", "ne_rainfall", "demo",
                                null, List.of("Guwahati"), null));

        mockMvc.perform(get("/api/rainfall/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.available").value(true))
                .andExpect(jsonPath("$.inferenceMode").value("demo"))
                .andExpect(jsonPath("$.supportedStations[0]").value("Guwahati"));
    }

    @Test
    void healthReturns503WhenAiServiceUnavailable() throws Exception {
        willThrow(new RainfallServiceException("North East rainfall health check failed.", new RuntimeException()))
                .given(rainfallClient)
                .health();

        mockMvc.perform(get("/api/rainfall/health"))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.status").value(503))
                .andExpect(jsonPath("$.message").value("Rainfall forecasting service is currently unavailable."));
    }

    @Test
    void forecastDemoReturnsClientResponseWithoutAuthentication() throws Exception {
        given(rainfallClient.forecastDemo())
                .willReturn(
                        new RainfallForecastResponse(
                                "northeast_rainfall_lstm",
                                "ne_rainfall",
                                "demo",
                                "Guwahati",
                                "North East India",
                                false,
                                12.0,
                                60,
                                "2026-09-15T14:00:00Z",
                                List.of(new RainfallForecastPointResponse("2026-09-15T15:00:00Z", 7.4, "moderate")),
                                null,
                                false,
                                null,
                                null,
                                null));

        mockMvc.perform(post("/api/rainfall/forecast/demo"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.mode").value("demo"))
                .andExpect(jsonPath("$.isGeneralized").value(false))
                .andExpect(jsonPath("$.forecast[0].rainfallMm").value(7.4));
    }

    @Test
    void forecastDemoReturns503WhenAiServiceUnavailable() throws Exception {
        willThrow(new RainfallServiceException("Failed to run North East rainfall demo forecast.", new RuntimeException()))
                .given(rainfallClient)
                .forecastDemo();

        mockMvc.perform(post("/api/rainfall/forecast/demo"))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.status").value(503));
    }

    @Test
    void forecastRejectsEmptyHistoricalWithoutCallingAiService() throws Exception {
        mockMvc.perform(
                        post("/api/rainfall/forecast")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"historical\": []}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void explainDemoReturnsClientResponseWithoutAuthentication() throws Exception {
        given(rainfallClient.explainDemo(0))
                .willReturn(
                        new RainfallExplanationResponse(
                                0,
                                60,
                                2.91,
                                0.20,
                                1.19e-7,
                                "shap_scaled is exact and additive...",
                                "Forecast for +60 minutes: 2.91 mm...",
                                List.of(
                                        new FeatureContributionResponse(
                                                "tgt_rainfall_t-1", 0.75, 0.239, 1.94, "increased"))));

        mockMvc.perform(post("/api/rainfall/explain/demo"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.horizon").value(0))
                .andExpect(jsonPath("$.leadTimeMin").value(60))
                .andExpect(jsonPath("$.contributions[0].feature").value("tgt_rainfall_t-1"))
                .andExpect(jsonPath("$.contributions[0].direction").value("increased"));
    }

    @Test
    void explainDemoPassesHorizonQueryParamThrough() throws Exception {
        given(rainfallClient.explainDemo(5))
                .willReturn(
                        new RainfallExplanationResponse(
                                5, 360, 1.0, 0.2, 1e-7, "units", "narrative", List.of()));

        mockMvc.perform(post("/api/rainfall/explain/demo").param("horizon", "5"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.horizon").value(5))
                .andExpect(jsonPath("$.leadTimeMin").value(360));
    }

    @Test
    void explainDemoReturns503WhenNoXgbCoForecasterLoaded() throws Exception {
        willThrow(
                        new RainfallServiceException(
                                "No XGBoost co-forecaster is loaded — SHAP explanations need it.",
                                new RuntimeException()))
                .given(rainfallClient)
                .explainDemo(0);

        mockMvc.perform(post("/api/rainfall/explain/demo"))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.status").value(503));
    }

    @Test
    void explainRejectsEmptyHistoricalWithoutCallingAiService() throws Exception {
        mockMvc.perform(
                        post("/api/rainfall/explain")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"historical\": []}"))
                .andExpect(status().isBadRequest());
    }
}
