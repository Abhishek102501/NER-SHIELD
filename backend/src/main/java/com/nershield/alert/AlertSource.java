package com.nershield.alert;

import com.nershield.alert.dto.EscalationAlertResponse;
import java.util.List;
import java.util.Optional;

/**
 * Supplies escalation alerts to {@link AlertService} and tracks acknowledgement.
 *
 * <p>Mirrors {@code com.nershield.incident.IncidentSource}: the seam between a real
 * escalation/notification pipeline (risk-zone band changes, sensor thresholds) and everything
 * downstream. Today the only implementation is {@link DemoAlertSource}, since none of that
 * pipeline exists yet. {@link AlertService} and the {@code /api/alerts} contract stay exactly
 * as they are when a real implementation replaces it.
 */
public interface AlertSource {

    /** Currently known escalation alerts. */
    List<EscalationAlertResponse> fetchAll();

    /**
     * Marks the alert with the given id as acknowledged and returns its updated record, or
     * {@link Optional#empty()} if no alert with that id exists.
     */
    Optional<EscalationAlertResponse> acknowledge(String id);

    /**
     * Whether this source reflects real escalation events. {@code false} for demonstration
     * data.
     */
    boolean isLive();
}
