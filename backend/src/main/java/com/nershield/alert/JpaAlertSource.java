package com.nershield.alert;

import com.nershield.alert.dto.EscalationAlertResponse;
import com.nershield.common.RelativeTime;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * PostgreSQL-backed {@link AlertSource}, reading from and writing acknowledgement to {@link
 * EscalationAlertRepository}.
 *
 * <p>Supersedes the former in-memory {@code DemoAlertSource} — acknowledgement now persists
 * across restarts instead of living in a singleton bean's memory.
 */
@Component
public class JpaAlertSource implements AlertSource {

    private final EscalationAlertRepository repository;

    public JpaAlertSource(EscalationAlertRepository repository) {
        this.repository = repository;
    }

    @Override
    public List<EscalationAlertResponse> fetchAll() {
        return repository.findAllOrderByOccurredAtDesc().stream().map(this::toResponse).toList();
    }

    @Override
    @Transactional
    public Optional<EscalationAlertResponse> acknowledge(String id) {
        return repository
                .findById(id)
                .map(
                        entity -> {
                            entity.setAcknowledged(true);
                            entity.setAcknowledgedAt(Instant.now());
                            return toResponse(repository.save(entity));
                        });
    }

    @Override
    public boolean isLive() {
        return repository.findAll().stream().anyMatch(e -> !"demo".equals(e.getDataOrigin()));
    }

    private EscalationAlertResponse toResponse(EscalationAlertEntity e) {
        return new EscalationAlertResponse(
                e.getId(),
                e.getZone(),
                e.getFromSeverity(),
                e.getToSeverity(),
                e.getCause(),
                e.getAction(),
                RelativeTime.ago(e.getOccurredAt()),
                e.isAcknowledged());
    }
}
