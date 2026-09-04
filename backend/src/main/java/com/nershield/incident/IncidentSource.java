package com.nershield.incident;

import com.nershield.incident.dto.IncidentResponse;
import java.util.List;

/**
 * Supplies incident records to {@link IncidentService}.
 *
 * <p>Mirrors {@code com.nershield.threat.detection.DetectionSource}: the seam between real
 * incident reporting (field reports, sensor-triggered incidents, response-team intake) and
 * everything downstream. Today the only implementation is {@link DemoIncidentSource}, since
 * none of that pipeline exists yet. {@link IncidentService} and the {@code /api/incidents}
 * contract stay exactly as they are when a real implementation replaces it.
 */
public interface IncidentSource {

    /** Currently known incidents. */
    List<IncidentResponse> fetchAll();

    /**
     * Whether this source reflects real reported incidents. {@code false} for demonstration
     * data.
     */
    boolean isLive();
}
