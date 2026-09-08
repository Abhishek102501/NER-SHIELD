package com.nershield.alert;

import static org.hamcrest.Matchers.greaterThan;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

/**
 * Verifies {@code GET /api/alerts} and {@code PATCH /api/alerts/{id}/acknowledge} through the
 * full filter chain: public access, response shape, honest {@code demo} source reporting, and
 * acknowledgement of both a valid and an unknown alert id.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AlertControllerTest {

    @Autowired private MockMvc mockMvc;

    @Test
    void returnsAlertsWithoutAuthentication() throws Exception {
        mockMvc.perform(get("/api/alerts"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.meta.source").value("demo"))
                .andExpect(jsonPath("$.meta.count", greaterThan(0)))
                .andExpect(jsonPath("$.alerts").isArray());
    }

    @Test
    void everyAlertHasRequiredFields() throws Exception {
        mockMvc.perform(get("/api/alerts"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.alerts[0].id").exists())
                .andExpect(jsonPath("$.alerts[0].zone").exists())
                .andExpect(jsonPath("$.alerts[0].from").exists())
                .andExpect(jsonPath("$.alerts[0].to").exists())
                .andExpect(jsonPath("$.alerts[0].cause").exists())
                .andExpect(jsonPath("$.alerts[0].action").exists())
                .andExpect(jsonPath("$.alerts[0].timeAgo").exists())
                .andExpect(jsonPath("$.alerts[0].acknowledged").value(false));
    }

    // DemoAlertSource keeps acknowledgement state in a singleton bean shared across every test
    // in this (cached) Spring context — dirty it so later tests, in this class or another, see
    // fresh demo data rather than this test's mutation.
    @Test
    @DirtiesContext
    void acknowledgesKnownAlertWithoutAuthentication() throws Exception {
        mockMvc.perform(patch("/api/alerts/alert-01/acknowledge"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value("alert-01"))
                .andExpect(jsonPath("$.acknowledged").value(true));
    }

    @Test
    void unknownAlertIdReturnsNotFound() throws Exception {
        mockMvc.perform(patch("/api/alerts/does-not-exist/acknowledge"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404))
                .andExpect(jsonPath("$.path").value("/api/alerts/does-not-exist/acknowledge"));
    }
}
