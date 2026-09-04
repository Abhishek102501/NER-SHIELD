package com.nershield.risk;

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
 * Verifies {@code GET /api/risk/zones} and {@code GET /api/risk/zones/{id}} through the full
 * filter chain: public access, response shape, and honest {@code demo} source reporting.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class RiskZoneControllerTest {

    @Autowired private MockMvc mockMvc;

    @Test
    void returnsZonesWithoutAuthentication() throws Exception {
        mockMvc.perform(get("/api/risk/zones"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.meta.source").value("demo"))
                .andExpect(jsonPath("$.meta.count", greaterThan(0)))
                .andExpect(jsonPath("$.zones").isArray());
    }

    @Test
    void everyZoneHasRequiredFields() throws Exception {
        mockMvc.perform(get("/api/risk/zones"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.zones[0].id").exists())
                .andExpect(jsonPath("$.zones[0].name").exists())
                .andExpect(jsonPath("$.zones[0].sector").exists())
                .andExpect(jsonPath("$.zones[0].center").isArray())
                .andExpect(jsonPath("$.zones[0].risk.band").exists())
                .andExpect(jsonPath("$.zones[0].factors").isArray())
                .andExpect(jsonPath("$.zones[0].metrics").exists())
                .andExpect(jsonPath("$.zones[0].drivers").isArray())
                .andExpect(jsonPath("$.zones[0].impact").exists());
    }

    @Test
    void returnsZoneByIdWithoutAuthentication() throws Exception {
        mockMvc.perform(get("/api/risk/zones/nh10-sikkim"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value("nh10-sikkim"))
                .andExpect(jsonPath("$.risk.band").value("critical"));
    }

    @Test
    void unknownZoneIdReturnsNotFound() throws Exception {
        mockMvc.perform(get("/api/risk/zones/does-not-exist"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404))
                .andExpect(jsonPath("$.path").value("/api/risk/zones/does-not-exist"));
    }
}
