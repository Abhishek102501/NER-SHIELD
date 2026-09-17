package com.nershield.threat.detection;

import java.util.List;
import org.springframework.stereotype.Component;

/**
 * PostgreSQL/PostGIS-backed {@link DetectionSource}, reading from {@link
 * ThreatDetectionRepository}.
 *
 * <p>Supersedes the former in-memory {@code DemoDetectionSource}: the same demo fixture
 * content now lives in the {@code threat_detections} table (inserted by {@code
 * com.nershield.seed.DemoDataSeeder} only when the table is empty, tagged {@code
 * dataOrigin=demo}), so {@link #isLive()} still reports {@code false} for that content. A
 * future real detection pipeline inserts rows with {@code dataOrigin=external} or {@code
 * model} and this source reports {@link #isLive()} {@code true} automatically once any such
 * row exists — see {@link #isLive()}.
 */
@Component
public class JpaDetectionSource implements DetectionSource {

    private final ThreatDetectionRepository repository;

    public JpaDetectionSource(ThreatDetectionRepository repository) {
        this.repository = repository;
    }

    @Override
    public List<DetectionResult> fetchRecent() {
        return repository.findAllOrderByDetectedAtDesc().stream().map(this::toResult).toList();
    }

    @Override
    public boolean isLive() {
        return repository.findAllOrderByDetectedAtDesc().stream()
                .anyMatch(e -> !"demo".equals(e.getDataOrigin()));
    }

    private DetectionResult toResult(ThreatDetectionEntity entity) {
        GeoContext geo =
                (entity.getLocation() == null
                                && entity.getCity() == null
                                && entity.getState() == null
                                && entity.getCountry() == null
                                && entity.getRegion() == null
                                && entity.getAddress() == null)
                        ? null
                        : new GeoContext(
                                entity.getCity(),
                                entity.getState(),
                                entity.getCountry(),
                                entity.getRegion(),
                                entity.getAddress(),
                                entity.getLocation() != null ? entity.getLocation().getY() : null,
                                entity.getLocation() != null ? entity.getLocation().getX() : null);

        return new DetectionResult(
                entity.getId(),
                entity.getEntityType(),
                entity.getExposureType(),
                entity.getConfidence(),
                entity.getDetectedAt(),
                geo);
    }
}
