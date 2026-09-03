package com.nershield.threat;

import com.nershield.threat.detection.DetectionSource;
import com.nershield.threat.dto.ThreatEventResponse;
import com.nershield.threat.dto.ThreatsMeta;
import com.nershield.threat.dto.ThreatsResponse;
import java.time.Instant;
import java.util.List;
import org.springframework.stereotype.Service;

/**
 * Assembles the {@code GET /api/threats} response.
 *
 * <p>Depends only on {@link DetectionSource} and {@link ThreatTransformer} — swapping the
 * active {@link DetectionSource} bean (demo today, a real NER-backed one later) changes
 * nothing here.
 */
@Service
public class ThreatService {

    private final DetectionSource detectionSource;
    private final ThreatTransformer transformer;

    public ThreatService(DetectionSource detectionSource, ThreatTransformer transformer) {
        this.detectionSource = detectionSource;
        this.transformer = transformer;
    }

    public ThreatsResponse getThreats() {
        List<ThreatEventResponse> events =
                detectionSource.fetchRecent().stream().map(transformer::transform).toList();

        DataSourceKind source = detectionSource.isLive() ? DataSourceKind.LIVE : DataSourceKind.DEMO;
        ThreatsMeta meta = new ThreatsMeta(source, Instant.now(), events.size());

        return new ThreatsResponse(meta, events);
    }
}
