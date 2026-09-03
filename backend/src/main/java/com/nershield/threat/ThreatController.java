package com.nershield.threat;

import com.nershield.threat.dto.ThreatsResponse;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Global Threat Intelligence API consumed by the frontend's ThreatMap.
 *
 * <p>Public for now (see {@code SecurityConfig}): the response carries only minimized,
 * non-sensitive metadata, and there is no authentication mechanism wired in yet for any
 * route in this backend. This should move behind authentication once {@code JwtTokenProvider}
 * is implemented, the same as every other domain route.
 */
@RestController
@RequestMapping("/api/threats")
public class ThreatController {

    private final ThreatService threatService;

    public ThreatController(ThreatService threatService) {
        this.threatService = threatService;
    }

    @GetMapping
    public ThreatsResponse getThreats() {
        return threatService.getThreats();
    }
}
