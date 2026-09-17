package com.nershield.agent;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

/**
 * Verifies {@code POST /api/agent/query} through the full filter chain: public access,
 * request validation, and honest 503 handling when agent-service is unreachable. Points
 * {@code nershield.agent.base-url} at a port nothing can be listening on (1 — reserved,
 * connections are refused) rather than assuming the default port is free, since a real
 * agent-service instance may legitimately be running there during local development.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@TestPropertySource(properties = "nershield.agent.base-url=http://localhost:1")
class AgentControllerTest {

    @Autowired private MockMvc mockMvc;

    @Test
    void rejectsRequestWithNeitherQueryNorConfirmedAction() throws Exception {
        mockMvc.perform(post("/api/agent/query").contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void reportsServiceUnavailableWhenAgentServiceIsUnreachable() throws Exception {
        String body = """
                {"query":"What is the current situation in Gangtok?"}
                """;

        mockMvc.perform(post("/api/agent/query").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.status").value(503))
                .andExpect(jsonPath("$.path").value("/api/agent/query"));
    }
}
