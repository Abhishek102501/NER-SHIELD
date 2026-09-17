package com.nershield.gis;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;

/**
 * PostgreSQL-backed persistence for a named GeoJSON {@code FeatureCollection}. See {@code
 * V3__field_reports_dispatch_gis.sql}.
 *
 * <p>Stored as one JSON document per layer rather than normalized per-feature spatial rows:
 * the GIS command map consumes whole layers at a time (no per-feature spatial query need
 * exists yet), and this lets a layer's exact GeoJSON shape (arbitrary per-feature
 * {@code properties}) persist without a rigid column schema. A future layer that does need
 * per-feature PostGIS querying (e.g. "find zones within 5km of X") should get its own
 * geometry-typed table instead — {@link com.nershield.risk.RiskZoneEntity} is the template
 * for that.
 */
@Entity
@Table(name = "gis_layers")
public class GisLayerEntity {

    @Id
    @Column(length = 64)
    private String id;

    @Column(nullable = false, length = 160)
    private String name;

    @Column(length = 255)
    private String description;

    @Column(nullable = false, columnDefinition = "text")
    private String geojson;

    @Column(nullable = false, length = 64)
    private String source;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Column(name = "data_origin", nullable = false, length = 16)
    private String dataOrigin;

    protected GisLayerEntity() {}

    public GisLayerEntity(
            String id,
            String name,
            String description,
            String geojson,
            String source,
            Instant updatedAt,
            String dataOrigin) {
        this.id = id;
        this.name = name;
        this.description = description;
        this.geojson = geojson;
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

    public String getDescription() {
        return description;
    }

    public String getGeojson() {
        return geojson;
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
