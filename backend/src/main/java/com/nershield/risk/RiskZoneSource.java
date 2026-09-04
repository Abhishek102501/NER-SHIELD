package com.nershield.risk;

import com.nershield.risk.dto.RiskZoneResponse;
import java.util.List;
import java.util.Optional;

/**
 * Supplies risk zone assessments to {@link RiskZoneService}.
 *
 * <p>Mirrors {@code com.nershield.threat.detection.DetectionSource}: this is the seam
 * between the Python susceptibility model and everything downstream. Today the only
 * implementation is {@link DemoRiskZoneSource}, because that model does not exist yet. When
 * it does, a new implementation built on {@code AIClient} can be registered in its place —
 * {@link RiskZoneService} and the {@code /api/risk/zones} contract stay exactly as they are.
 */
public interface RiskZoneSource {

    /** All currently assessed risk zones. */
    List<RiskZoneResponse> fetchAll();

    /** A single zone by id, if it exists. */
    Optional<RiskZoneResponse> fetchById(String id);

    /**
     * Whether this source reflects a real susceptibility model. {@code false} for
     * demonstration data.
     */
    boolean isLive();
}
