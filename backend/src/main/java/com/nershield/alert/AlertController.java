package com.nershield.alert;

import com.nershield.alert.dto.AlertsResponse;
import com.nershield.alert.dto.EscalationAlertResponse;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Escalation alert feed and acknowledgement, consumed by the frontend's AlertSystem.
 *
 * <p>Public for now (see {@code SecurityConfig}): the response carries only aggregated,
 * non-sensitive alert metadata, and there is no authentication mechanism wired in yet for any
 * route in this backend. This should move behind authentication once {@code
 * JwtTokenProvider} is implemented, the same as every other domain route.
 */
@RestController
@RequestMapping("/api/alerts")
public class AlertController {

    private final AlertService alertService;

    public AlertController(AlertService alertService) {
        this.alertService = alertService;
    }

    @GetMapping
    public AlertsResponse getAlerts() {
        return alertService.getAlerts();
    }

    @PatchMapping("/{id}/acknowledge")
    public EscalationAlertResponse acknowledge(@PathVariable String id) {
        return alertService.acknowledge(id);
    }
}
