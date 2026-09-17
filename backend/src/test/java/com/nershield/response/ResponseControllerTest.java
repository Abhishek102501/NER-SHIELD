package com.nershield.response;

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
 * Verifies {@code GET /api/response/incidents}, {@code GET /api/response/units} and {@code
 * POST /api/response/dispatch} through the full filter chain: public access, response shape,
 * real dispatch persistence, and the not-found case for an unknown incident/unit.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class ResponseControllerTest {

    @Autowired private MockMvc mockMvc;

    @Test
    void returnsIncidentsOrderedByPriorityWithoutAuthentication() throws Exception {
        mockMvc.perform(get("/api/response/incidents"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()", greaterThan(0)))
                .andExpect(jsonPath("$[0].priority").value(1))
                .andExpect(jsonPath("$[0].id").exists())
                .andExpect(jsonPath("$[0].phase").exists())
                .andExpect(jsonPath("$[0].severity").exists());
    }

    @Test
    void returnsUnitRosterWithoutAuthentication() throws Exception {
        mockMvc.perform(get("/api/response/units"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()", greaterThan(0)))
                .andExpect(jsonPath("$[0].id").exists())
                .andExpect(jsonPath("$[0].label").exists())
                .andExpect(jsonPath("$[0].kind").exists())
                .andExpect(jsonPath("$[0].etaMinutes").exists());
    }

    @Test
    void dispatchingAKnownIncidentAndUnitPersistsTheAssignment() throws Exception {
        String body =
                """
                {"incidentId":"inc-1042","unitId":"unit-alpha","priority":"Critical","notes":"test"}
                """;

        mockMvc.perform(post("/api/response/dispatch").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").exists())
                .andExpect(jsonPath("$.incidentId").value("inc-1042"))
                .andExpect(jsonPath("$.unitId").value("unit-alpha"))
                .andExpect(jsonPath("$.status").value("dispatched"))
                .andExpect(jsonPath("$.etaMinutes").value(35));
    }

    @Test
    void dispatchingAnUnknownIncidentReturnsNotFound() throws Exception {
        String body =
                """
                {"incidentId":"does-not-exist","unitId":"unit-alpha","priority":"Critical","notes":""}
                """;

        mockMvc.perform(post("/api/response/dispatch").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404));
    }

    @Test
    void dispatchingAnUnknownUnitReturnsNotFound() throws Exception {
        String body =
                """
                {"incidentId":"inc-1042","unitId":"does-not-exist","priority":"Critical","notes":""}
                """;

        mockMvc.perform(post("/api/response/dispatch").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404));
    }
}
