package com.nershield.risk;

import com.nershield.common.ResourceNotFoundException;
import com.nershield.risk.dto.RiskZoneResponse;
import com.nershield.risk.dto.RiskZonesMeta;
import com.nershield.risk.dto.RiskZonesResponse;
import java.time.Instant;
import java.util.List;
import org.springframework.stereotype.Service;

/**
 * Assembles {@code GET /api/risk/zones} and {@code GET /api/risk/zones/{id}} responses.
 *
 * <p>Depends only on {@link RiskZoneSource} — swapping the active source bean (demo today, a
 * real susceptibility-model-backed one later) changes nothing here, mirroring {@code
 * com.nershield.threat.ThreatService}.
 */
@Service
public class RiskZoneService {

    private final RiskZoneSource source;

    public RiskZoneService(RiskZoneSource source) {
        this.source = source;
    }

    public RiskZonesResponse getZones() {
        List<RiskZoneResponse> zones = source.fetchAll();
        DataSourceKind kind = source.isLive() ? DataSourceKind.LIVE : DataSourceKind.DEMO;
        return new RiskZonesResponse(new RiskZonesMeta(kind, Instant.now(), zones.size()), zones);
    }

    public RiskZoneResponse getZoneById(String id) {
        return source.fetchById(id).orElseThrow(() -> ResourceNotFoundException.of("Risk zone", id));
    }
}
