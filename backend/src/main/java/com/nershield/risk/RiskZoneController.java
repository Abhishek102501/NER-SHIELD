package com.nershield.risk;

import com.nershield.risk.dto.RiskZoneResponse;
import com.nershield.risk.dto.RiskZonesResponse;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Risk zone assessments consumed by the frontend's RiskExplorer.
 *
 * <p>Public for now (see {@code SecurityConfig}): the response carries only aggregated,
 * non-sensitive risk metadata, and there is no authentication mechanism wired in yet for any
 * route in this backend. This should move behind authentication once {@code
 * JwtTokenProvider} is implemented, the same as every other domain route.
 */
@RestController
@RequestMapping("/api/risk/zones")
public class RiskZoneController {

    private final RiskZoneService riskZoneService;

    public RiskZoneController(RiskZoneService riskZoneService) {
        this.riskZoneService = riskZoneService;
    }

    @GetMapping
    public RiskZonesResponse getZones() {
        return riskZoneService.getZones();
    }

    @GetMapping("/{id}")
    public RiskZoneResponse getZoneById(@PathVariable String id) {
        return riskZoneService.getZoneById(id);
    }
}
