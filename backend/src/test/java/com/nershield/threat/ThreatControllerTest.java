package com.nershield.threat;

import static org.hamcrest.Matchers.greaterThan;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

/**
 * Verifies {@code GET /api/threats} through the full filter chain: public access, response
 * shape, and that the demo detection source is honestly reported as {@code demo}.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class ThreatControllerTest {

    @Autowired private MockMvc mockMvc;

    @Test
    void returnsThreatsWithoutAuthentication() throws Exception {
        mockMvc.perform(get("/api/threats"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.meta.source").value("demo"))
                .andExpect(jsonPath("$.meta.count", greaterThan(0)))
                .andExpect(jsonPath("$.events").isArray());
    }

    @Test
    void everyEventHasRequiredFields() throws Exception {
        mockMvc.perform(get("/api/threats"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.events[0].id").exists())
                .andExpect(jsonPath("$.events[0].risk").exists())
                .andExpect(jsonPath("$.events[0].locationAvailable").exists())
                .andExpect(jsonPath("$.events[0].location").exists())
                .andExpect(jsonPath("$.events[0].entity").exists())
                .andExpect(jsonPath("$.events[0].threatName").exists())
                .andExpect(jsonPath("$.events[0].timestamp").exists())
                .andExpect(jsonPath("$.events[0].description").exists());
    }

    @Test
    void neverExposesRawDetectionText() throws Exception {
        // The demo source only ever produces entityType/exposureType classifications —
        // this asserts the response contract has no field for raw detected text at all.
        mockMvc.perform(get("/api/threats"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.events[0].rawText").doesNotExist())
                .andExpect(jsonPath("$.events[0].confidence").doesNotExist());
    }

    @Test
    void eventWithoutGeoContextIsMarkedLocationUnavailable() throws Exception {
        // det-007's seed data (see DemoDataSeeder) has no location at all. Selected by id,
        // not array index — events are ordered by detectedAt desc (most recent first), so
        // its position shifts as seed timestamps age relative to each other.
        String jsonPathPrefix = "$.events[?(@.id=='det-007')]";
        mockMvc.perform(get("/api/threats"))
                .andExpect(status().isOk())
                .andExpect(jsonPath(jsonPathPrefix + ".locationAvailable").value(false))
                .andExpect(jsonPath(jsonPathPrefix + ".latitude").doesNotExist())
                .andExpect(jsonPath(jsonPathPrefix + ".longitude").doesNotExist());
    }
}
