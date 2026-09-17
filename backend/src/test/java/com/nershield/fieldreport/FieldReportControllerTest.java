package com.nershield.fieldreport;

import static org.hamcrest.Matchers.greaterThan;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

/**
 * Verifies {@code GET /api/field-reports} and {@code POST /api/field-reports} through the
 * full filter chain: public access, response shape, and real persistence of a submission.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class FieldReportControllerTest {

    @Autowired private MockMvc mockMvc;

    @Test
    void returnsSeededReportsWithoutAuthentication() throws Exception {
        mockMvc.perform(get("/api/field-reports"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()", greaterThan(0)))
                .andExpect(jsonPath("$[0].id").exists())
                .andExpect(jsonPath("$[0].gps").exists())
                .andExpect(jsonPath("$[0].incidentType").exists())
                .andExpect(jsonPath("$[0].severity").exists())
                .andExpect(jsonPath("$[0].evidenceCount").exists())
                .andExpect(jsonPath("$[0].status").exists())
                .andExpect(jsonPath("$[0].timeAgo").exists());
    }

    @Test
    void submittingAReportPersistsItAndReturnsItInTheList() throws Exception {
        String body =
                """
                {"gps":"27.300\\u00b0N, 88.600\\u00b0E","incidentType":"Landslide","severity":"high","evidenceCount":2}
                """;

        mockMvc.perform(post("/api/field-reports").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").exists())
                .andExpect(jsonPath("$.gps").value("27.300°N, 88.600°E"))
                .andExpect(jsonPath("$.incidentType").value("Landslide"))
                .andExpect(jsonPath("$.severity").value("high"))
                .andExpect(jsonPath("$.evidenceCount").value(2))
                .andExpect(jsonPath("$.status").value("queued"));

        mockMvc.perform(get("/api/field-reports"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.incidentType=='Landslide' && @.gps=='27.300°N, 88.600°E')]").exists());
    }
}
