package com.nershield.fieldreport;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import org.locationtech.jts.geom.Point;

/** PostGIS-backed persistence for a field report. See {@code V3__field_reports_dispatch_gis.sql}. */
@Entity
@Table(name = "field_reports")
public class FieldReportEntity {

    @Id
    @Column(length = 32)
    private String id;

    @Column(columnDefinition = "geometry(Point,4326)")
    private Point location;

    @Column(name = "gps_label", nullable = false, length = 64)
    private String gpsLabel;

    @Column(name = "incident_type", nullable = false, length = 80)
    private String incidentType;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private Severity severity;

    @Column(name = "evidence_count", nullable = false)
    private int evidenceCount;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private SyncStatus status;

    @Column(name = "submitted_at", nullable = false)
    private Instant submittedAt;

    @Column(nullable = false, length = 64)
    private String source;

    @Column(name = "data_origin", nullable = false, length = 16)
    private String dataOrigin;

    protected FieldReportEntity() {}

    public FieldReportEntity(
            String id,
            Point location,
            String gpsLabel,
            String incidentType,
            Severity severity,
            int evidenceCount,
            SyncStatus status,
            Instant submittedAt,
            String source,
            String dataOrigin) {
        this.id = id;
        this.location = location;
        this.gpsLabel = gpsLabel;
        this.incidentType = incidentType;
        this.severity = severity;
        this.evidenceCount = evidenceCount;
        this.status = status;
        this.submittedAt = submittedAt;
        this.source = source;
        this.dataOrigin = dataOrigin;
    }

    public String getId() {
        return id;
    }

    public Point getLocation() {
        return location;
    }

    public String getGpsLabel() {
        return gpsLabel;
    }

    public String getIncidentType() {
        return incidentType;
    }

    public Severity getSeverity() {
        return severity;
    }

    public int getEvidenceCount() {
        return evidenceCount;
    }

    public SyncStatus getStatus() {
        return status;
    }

    public Instant getSubmittedAt() {
        return submittedAt;
    }

    public String getSource() {
        return source;
    }

    public String getDataOrigin() {
        return dataOrigin;
    }
}
