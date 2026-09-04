package com.nershield.security;

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
 * Confirms the stateless security baseline: everything except the declared public routes
 * requires authentication, and rejections use the standard error payload.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class SecurityConfigTest {

    @Autowired private MockMvc mockMvc;

    @Test
    void unknownApiRouteRequiresAuthentication() throws Exception {
        // /api/alerts is not implemented yet — unlike /api/threats, /api/risk/zones and
        // /api/incidents, it has no explicit permitAll() rule, so it must still fall through
        // to anyRequest().authenticated().
        mockMvc.perform(get("/api/alerts"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401))
                .andExpect(jsonPath("$.error").value("Unauthorized"))
                .andExpect(jsonPath("$.path").value("/api/alerts"))
                .andExpect(jsonPath("$.timestamp").exists());
    }

    @Test
    void nonPublicActuatorEndpointRequiresAuthentication() throws Exception {
        mockMvc.perform(get("/actuator/info")).andExpect(status().isUnauthorized());
    }
}
