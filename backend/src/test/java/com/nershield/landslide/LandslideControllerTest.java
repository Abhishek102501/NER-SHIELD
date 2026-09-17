package com.nershield.landslide;

import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.willThrow;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.nershield.landslide.dto.LandslideAnalysisResponse;
import com.nershield.landslide.dto.LandslideHealthResponse;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

/**
 * Verifies {@code /api/landslide/*} through the full filter chain: public access, request/
 * response wiring between {@link LandslideController} and {@link LandslideService}, and that a
 * downstream AI-service outage degrades to {@code 503} via {@code GlobalExceptionHandler} rather
 * than crashing or fabricating a result. {@link LandslideClient} is mocked — no real Python AI
 * service is needed to run this test.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class LandslideControllerTest {

    @Autowired private MockMvc mockMvc;

    @MockitoBean private LandslideClient landslideClient;

    @Test
    void healthReturnsClientResponseWithoutAuthentication() throws Exception {
        given(landslideClient.health())
                .willReturn(
                        new LandslideHealthResponse(
                                true, false, null, "Landslide4Sense", "baseline-unet", "mock",
                                "LANDSLIDE_INFERENCE_MODE=mock"));

        mockMvc.perform(get("/api/landslide/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.available").value(true))
                .andExpect(jsonPath("$.inferenceMode").value("mock"))
                .andExpect(jsonPath("$.model").value("Landslide4Sense"));
    }

    @Test
    void healthReturns503WhenAiServiceUnavailable() throws Exception {
        willThrow(new LandslideServiceException("Landslide4Sense health check failed.", new RuntimeException()))
                .given(landslideClient)
                .health();

        mockMvc.perform(get("/api/landslide/health"))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.status").value(503))
                .andExpect(jsonPath("$.message").value("Landslide analysis service is currently unavailable."));
    }

    @Test
    void analyzeWithDemoDatasetReturns202Accepted() throws Exception {
        given(landslideClient.analyzeDemoDataset())
                .willReturn(
                        new LandslideAnalysisResponse(
                                "LSA-demo123", "running", "mock", "Landslide4Sense", "baseline-unet",
                                null, null, null, null, null));

        mockMvc.perform(multipart("/api/landslide/analyze").param("demoDataset", "true"))
                .andExpect(status().isAccepted())
                .andExpect(jsonPath("$.analysisId").value("LSA-demo123"))
                .andExpect(jsonPath("$.status").value("running"))
                .andExpect(jsonPath("$.mode").value("mock"));
    }

    @Test
    void getAnalysisReturnsClientResponse() throws Exception {
        given(landslideClient.getAnalysis("LSA-demo123"))
                .willReturn(
                        new LandslideAnalysisResponse(
                                "LSA-demo123", "completed", "mock", "Landslide4Sense", "baseline-unet",
                                null, null, null, java.util.List.of(), null));

        mockMvc.perform(get("/api/landslide/analysis/LSA-demo123"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.analysisId").value("LSA-demo123"))
                .andExpect(jsonPath("$.status").value("completed"));
    }

    @Test
    void analyzeReturns503WhenAiServiceUnavailable() throws Exception {
        willThrow(new LandslideServiceException("Failed to start Landslide4Sense demo analysis.", new RuntimeException()))
                .given(landslideClient)
                .analyzeDemoDataset();

        mockMvc.perform(multipart("/api/landslide/analyze").param("demoDataset", "true"))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.status").value(503));
    }
}
