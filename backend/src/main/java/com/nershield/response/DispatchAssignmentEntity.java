package com.nershield.response;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;

/** PostgreSQL-backed persistence for a real dispatch action: a unit assigned to an incident. */
@Entity
@Table(name = "dispatch_assignments")
public class DispatchAssignmentEntity {

    @Id
    @Column(length = 36)
    private String id;

    @Column(name = "response_incident_id", nullable = false, length = 64)
    private String responseIncidentId;

    @Column(name = "response_unit_id", nullable = false, length = 32)
    private String responseUnitId;

    @Column(name = "dispatched_at", nullable = false)
    private Instant dispatchedAt;

    @Column(name = "eta_minutes", nullable = false)
    private int etaMinutes;

    @Column(nullable = false, length = 16)
    private String status;

    @Column(nullable = false, length = 64)
    private String source;

    @Column(name = "data_origin", nullable = false, length = 16)
    private String dataOrigin;

    protected DispatchAssignmentEntity() {}

    public DispatchAssignmentEntity(
            String id,
            String responseIncidentId,
            String responseUnitId,
            Instant dispatchedAt,
            int etaMinutes,
            String status,
            String source,
            String dataOrigin) {
        this.id = id;
        this.responseIncidentId = responseIncidentId;
        this.responseUnitId = responseUnitId;
        this.dispatchedAt = dispatchedAt;
        this.etaMinutes = etaMinutes;
        this.status = status;
        this.source = source;
        this.dataOrigin = dataOrigin;
    }

    public String getId() {
        return id;
    }

    public String getResponseIncidentId() {
        return responseIncidentId;
    }

    public String getResponseUnitId() {
        return responseUnitId;
    }

    public Instant getDispatchedAt() {
        return dispatchedAt;
    }

    public int getEtaMinutes() {
        return etaMinutes;
    }

    public String getStatus() {
        return status;
    }

    public String getSource() {
        return source;
    }

    public String getDataOrigin() {
        return dataOrigin;
    }
}
