package com.nershield.incident;

import com.nershield.incident.dto.IncidentResponse;
import com.nershield.incident.dto.IncidentsMeta;
import com.nershield.incident.dto.IncidentsResponse;
import java.time.Instant;
import java.util.List;
import org.springframework.stereotype.Service;

/**
 * Assembles the {@code GET /api/incidents} response.
 *
 * <p>Depends only on {@link IncidentSource} — swapping the active source bean (demo today, a
 * real incident-feed-backed one later) changes nothing here, mirroring {@code
 * com.nershield.threat.ThreatService}.
 */
@Service
public class IncidentService {

    private final IncidentSource source;

    public IncidentService(IncidentSource source) {
        this.source = source;
    }

    public IncidentsResponse getIncidents() {
        List<IncidentResponse> incidents = source.fetchAll();
        DataSourceKind kind = source.isLive() ? DataSourceKind.LIVE : DataSourceKind.DEMO;
        return new IncidentsResponse(new IncidentsMeta(kind, Instant.now(), incidents.size()), incidents);
    }
}
