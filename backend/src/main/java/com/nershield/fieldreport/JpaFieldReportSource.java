package com.nershield.fieldreport;

import com.nershield.common.RelativeTime;
import com.nershield.fieldreport.dto.FieldReportRequest;
import com.nershield.fieldreport.dto.FieldReportResponse;
import java.time.Instant;
import java.util.List;
import org.springframework.stereotype.Component;

/**
 * PostgreSQL/PostGIS-backed {@link FieldReportSource}. A submitted report's {@code gps}
 * label is stored verbatim; {@code location} stays {@code null} unless a future client
 * submits real coordinates instead of a free-text label — never geocoded or invented here.
 */
@Component
public class JpaFieldReportSource implements FieldReportSource {

    private static final String SUBMITTED_SOURCE = "field-app:submission";

    private final FieldReportRepository repository;

    public JpaFieldReportSource(FieldReportRepository repository) {
        this.repository = repository;
    }

    @Override
    public List<FieldReportResponse> fetchAll() {
        return repository.findAllOrderBySubmittedAtDesc().stream().map(this::toResponse).toList();
    }

    @Override
    public FieldReportResponse submit(FieldReportRequest request, Instant submittedAt) {
        String id = "FR-%04d".formatted(1000 + repository.count() + 1);
        FieldReportEntity entity =
                new FieldReportEntity(
                        id,
                        null,
                        request.gps(),
                        request.incidentType(),
                        request.severity(),
                        request.evidenceCount(),
                        SyncStatus.QUEUED,
                        submittedAt,
                        SUBMITTED_SOURCE,
                        "external");
        return toResponse(repository.save(entity));
    }

    private FieldReportResponse toResponse(FieldReportEntity e) {
        return new FieldReportResponse(
                e.getId(),
                e.getGpsLabel(),
                e.getIncidentType(),
                e.getSeverity(),
                e.getEvidenceCount(),
                e.getStatus(),
                RelativeTime.ago(e.getSubmittedAt()));
    }
}
