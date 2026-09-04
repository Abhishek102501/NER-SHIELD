package com.nershield.incident;

import com.nershield.incident.dto.IncidentsResponse;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Incident feed consumed by the frontend's IncidentList.
 *
 * <p>Public for now (see {@code SecurityConfig}): the response carries only aggregated,
 * non-sensitive incident metadata, and there is no authentication mechanism wired in yet for
 * any route in this backend. This should move behind authentication once {@code
 * JwtTokenProvider} is implemented, the same as every other domain route.
 */
@RestController
@RequestMapping("/api/incidents")
public class IncidentController {

    private final IncidentService incidentService;

    public IncidentController(IncidentService incidentService) {
        this.incidentService = incidentService;
    }

    @GetMapping
    public IncidentsResponse getIncidents() {
        return incidentService.getIncidents();
    }
}
