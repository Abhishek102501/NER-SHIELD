package com.nershield.health;

import com.nershield.health.dto.HealthResponse;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Public liveness endpoint used by the frontend and by uptime checks.
 *
 * <p>Deliberately independent of Actuator: it reports only that the HTTP layer is
 * serving. Dependency health (database, AI service) belongs to {@code /actuator/health}.
 */
@RestController
@RequestMapping("/api/health")
public class HealthController {

    private static final String SERVICE_NAME = "NER-SHIELD Backend";

    @GetMapping
    public HealthResponse health() {
        return new HealthResponse("UP", SERVICE_NAME);
    }
}
