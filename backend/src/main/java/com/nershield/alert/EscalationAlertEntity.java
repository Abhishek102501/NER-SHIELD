package com.nershield.alert;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;

/**
 * PostgreSQL-backed persistence for an escalation alert. See {@code V2__domain_tables.sql}
 * for the {@code escalation_alerts} schema.
 */
@Entity
@Table(name = "escalation_alerts")
public class EscalationAlertEntity {

    @Id
    @Column(length = 64)
    private String id;

    @Column(nullable = false, length = 160)
    private String zone;

    @Enumerated(EnumType.STRING)
    @Column(name = "from_severity", nullable = false, length = 16)
    private Severity fromSeverity;

    @Enumerated(EnumType.STRING)
    @Column(name = "to_severity", nullable = false, length = 16)
    private Severity toSeverity;

    @Column(length = 255)
    private String cause;

    @Column(length = 255)
    private String action;

    @Column(name = "occurred_at", nullable = false)
    private Instant occurredAt;

    @Column(nullable = false)
    private boolean acknowledged;

    @Column(name = "acknowledged_at")
    private Instant acknowledgedAt;

    @Column(nullable = false, length = 64)
    private String source;

    @Column(name = "data_origin", nullable = false, length = 16)
    private String dataOrigin;

    protected EscalationAlertEntity() {}

    public EscalationAlertEntity(
            String id,
            String zone,
            Severity fromSeverity,
            Severity toSeverity,
            String cause,
            String action,
            Instant occurredAt,
            boolean acknowledged,
            Instant acknowledgedAt,
            String source,
            String dataOrigin) {
        this.id = id;
        this.zone = zone;
        this.fromSeverity = fromSeverity;
        this.toSeverity = toSeverity;
        this.cause = cause;
        this.action = action;
        this.occurredAt = occurredAt;
        this.acknowledged = acknowledged;
        this.acknowledgedAt = acknowledgedAt;
        this.source = source;
        this.dataOrigin = dataOrigin;
    }

    public String getId() {
        return id;
    }

    public String getZone() {
        return zone;
    }

    public Severity getFromSeverity() {
        return fromSeverity;
    }

    public Severity getToSeverity() {
        return toSeverity;
    }

    public String getCause() {
        return cause;
    }

    public String getAction() {
        return action;
    }

    public Instant getOccurredAt() {
        return occurredAt;
    }

    public boolean isAcknowledged() {
        return acknowledged;
    }

    public void setAcknowledged(boolean acknowledged) {
        this.acknowledged = acknowledged;
    }

    public Instant getAcknowledgedAt() {
        return acknowledgedAt;
    }

    public void setAcknowledgedAt(Instant acknowledgedAt) {
        this.acknowledgedAt = acknowledgedAt;
    }

    public String getSource() {
        return source;
    }

    public String getDataOrigin() {
        return dataOrigin;
    }
}
