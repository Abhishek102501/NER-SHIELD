package com.nershield.incident;

import com.nershield.common.RelativeTime;
import com.nershield.incident.dto.IncidentResponse;
import java.util.List;
import org.springframework.stereotype.Component;

/**
 * PostgreSQL/PostGIS-backed {@link IncidentSource}, reading from {@link IncidentRepository}.
 *
 * <p>Supersedes the former in-memory {@code DemoIncidentSource}. {@code timeAgo} is computed
 * live from the stored {@code occurredAt} rather than frozen at fixture-authoring time, so it
 * stays accurate as real time passes.
 */
@Component
public class JpaIncidentSource implements IncidentSource {

    private final IncidentRepository repository;

    public JpaIncidentSource(IncidentRepository repository) {
        this.repository = repository;
    }

    @Override
    public List<IncidentResponse> fetchAll() {
        return repository.findAllOrderByOccurredAtDesc().stream().map(this::toResponse).toList();
    }

    @Override
    public boolean isLive() {
        return repository.findAll().stream().anyMatch(e -> !"demo".equals(e.getDataOrigin()));
    }

    private IncidentResponse toResponse(IncidentEntity e) {
        double x = e.getMapX() != null ? e.getMapX() : 50.0;
        double y = e.getMapY() != null ? e.getMapY() : 50.0;
        String location =
                e.getLocationLabel() != null
                        ? e.getLocationLabel()
                        : (e.getLocation() != null ? "%.4f, %.4f".formatted(e.getLocation().getY(), e.getLocation().getX())
                                : "Location unavailable");

        return new IncidentResponse(
                e.getId(),
                e.getSeverity(),
                e.getTitle(),
                location,
                RelativeTime.ago(e.getOccurredAt()),
                x,
                y,
                e.getSummary(),
                e.getCategory(),
                e.getReportedBy());
    }
}
