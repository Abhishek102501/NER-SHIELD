package com.nershield.incident;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import org.locationtech.jts.geom.Point;

/**
 * PostGIS-backed persistence for an incident record. See {@code V2__domain_tables.sql} for
 * the {@code incidents} schema.
 *
 * <p>{@code mapX}/{@code mapY} preserve the original demo fixture's abstract 0-100 map
 * placeholder (see the superseded {@code DemoIncidentSource}'s doc comment) for incidents
 * that have never had a real coordinate — {@code location} is the real PostGIS point and is
 * {@code null} until a genuine lat/lon is known. {@link IncidentService} prefers {@code
 * location} when present.
 */
@Entity
@Table(name = "incidents")
public class IncidentEntity {

    @Id
    @Column(length = 64)
    private String id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private Severity severity;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(name = "location_label", length = 200)
    private String locationLabel;

    @Column(columnDefinition = "geometry(Point,4326)")
    private Point location;

    @Column(name = "map_x")
    private Double mapX;

    @Column(name = "map_y")
    private Double mapY;

    @Column(columnDefinition = "text")
    private String summary;

    @Column(length = 80)
    private String category;

    @Column(name = "reported_by", length = 160)
    private String reportedBy;

    @Column(name = "occurred_at", nullable = false)
    private Instant occurredAt;

    @Column(nullable = false, length = 64)
    private String source;

    @Column(name = "data_origin", nullable = false, length = 16)
    private String dataOrigin;

    protected IncidentEntity() {}

    public IncidentEntity(
            String id,
            Severity severity,
            String title,
            String locationLabel,
            Point location,
            Double mapX,
            Double mapY,
            String summary,
            String category,
            String reportedBy,
            Instant occurredAt,
            String source,
            String dataOrigin) {
        this.id = id;
        this.severity = severity;
        this.title = title;
        this.locationLabel = locationLabel;
        this.location = location;
        this.mapX = mapX;
        this.mapY = mapY;
        this.summary = summary;
        this.category = category;
        this.reportedBy = reportedBy;
        this.occurredAt = occurredAt;
        this.source = source;
        this.dataOrigin = dataOrigin;
    }

    public String getId() {
        return id;
    }

    public Severity getSeverity() {
        return severity;
    }

    public String getTitle() {
        return title;
    }

    public String getLocationLabel() {
        return locationLabel;
    }

    public Point getLocation() {
        return location;
    }

    public Double getMapX() {
        return mapX;
    }

    public Double getMapY() {
        return mapY;
    }

    public String getSummary() {
        return summary;
    }

    public String getCategory() {
        return category;
    }

    public String getReportedBy() {
        return reportedBy;
    }

    public Instant getOccurredAt() {
        return occurredAt;
    }

    public String getSource() {
        return source;
    }

    public String getDataOrigin() {
        return dataOrigin;
    }
}
