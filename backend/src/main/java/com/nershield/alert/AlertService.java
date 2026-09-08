package com.nershield.alert;

import com.nershield.alert.dto.AlertsMeta;
import com.nershield.alert.dto.AlertsResponse;
import com.nershield.alert.dto.EscalationAlertResponse;
import com.nershield.common.ResourceNotFoundException;
import java.time.Instant;
import java.util.List;
import org.springframework.stereotype.Service;

/**
 * Assembles the {@code GET /api/alerts} response and applies acknowledgement.
 *
 * <p>Depends only on {@link AlertSource} — swapping the active source bean (demo today, a real
 * escalation-pipeline-backed one later) changes nothing here, mirroring {@code
 * com.nershield.incident.IncidentService}.
 */
@Service
public class AlertService {

    private final AlertSource source;

    public AlertService(AlertSource source) {
        this.source = source;
    }

    public AlertsResponse getAlerts() {
        List<EscalationAlertResponse> alerts = source.fetchAll();
        DataSourceKind kind = source.isLive() ? DataSourceKind.LIVE : DataSourceKind.DEMO;
        return new AlertsResponse(new AlertsMeta(kind, Instant.now(), alerts.size()), alerts);
    }

    public EscalationAlertResponse acknowledge(String id) {
        return source.acknowledge(id).orElseThrow(() -> ResourceNotFoundException.of("Alert", id));
    }
}
