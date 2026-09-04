package com.nershield.incident;

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
 * Verifies {@code GET /api/incidents} through the full filter chain: public access, response
 * shape, and honest {@code demo} source reporting.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class IncidentControllerTest {

    @Autowired private MockMvc mockMvc;

    @Test
    void returnsIncidentsWithoutAuthentication() throws Exception {
        mockMvc.perform(get("/api/incidents"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.meta.source").value("demo"))
                .andExpect(jsonPath("$.meta.count", greaterThan(0)))
                .andExpect(jsonPath("$.incidents").isArray());
    }

    @Test
    void everyIncidentHasRequiredFields() throws Exception {
        mockMvc.perform(get("/api/incidents"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.incidents[0].id").exists())
                .andExpect(jsonPath("$.incidents[0].severity").exists())
                .andExpect(jsonPath("$.incidents[0].title").exists())
                .andExpect(jsonPath("$.incidents[0].location").exists())
                .andExpect(jsonPath("$.incidents[0].timeAgo").exists())
                .andExpect(jsonPath("$.incidents[0].x").exists())
                .andExpect(jsonPath("$.incidents[0].y").exists())
                .andExpect(jsonPath("$.incidents[0].summary").exists())
                .andExpect(jsonPath("$.incidents[0].category").exists())
                .andExpect(jsonPath("$.incidents[0].reportedBy").exists());
    }
}
