package com.nershield.infrastructure;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import org.locationtech.jts.geom.Point;

/**
 * PostGIS-backed persistence for a settlement/infrastructure point (village, school,
 * hospital, bridge, or depot). See {@code V4__infrastructure_points.sql} for provenance —
 * this is hand-authored demonstration geography, not a surveyed dataset, and is tagged
 * accordingly via {@code dataOrigin}.
 */
@Entity
@Table(name = "infrastructure_points")
public class InfrastructurePointEntity {

    @Id
    @Column(length = 64)
    private String id;

    @Column(nullable = false, length = 160)
    private String name;

    @Column(nullable = false, length = 24)
    private String kind;

    @Column(nullable = false, columnDefinition = "geometry(Point,4326)")
    private Point location;

    @Column(length = 16)
    private String status;

    @Column(nullable = false, length = 64)
    private String source;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Column(name = "data_origin", nullable = false, length = 16)
    private String dataOrigin;

    protected InfrastructurePointEntity() {}

    public InfrastructurePointEntity(
            String id,
            String name,
            String kind,
            Point location,
            String status,
            String source,
            Instant updatedAt,
            String dataOrigin) {
        this.id = id;
        this.name = name;
        this.kind = kind;
        this.location = location;
        this.status = status;
        this.source = source;
        this.updatedAt = updatedAt;
        this.dataOrigin = dataOrigin;
    }

    public String getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public String getKind() {
        return kind;
    }

    public Point getLocation() {
        return location;
    }

    public String getStatus() {
        return status;
    }

    public String getSource() {
        return source;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public String getDataOrigin() {
        return dataOrigin;
    }
}
