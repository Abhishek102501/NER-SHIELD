package com.nershield.threat.detection;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import org.locationtech.jts.geom.Point;

/**
 * PostGIS-backed persistence for {@link DetectionResult}. See {@code V2__domain_tables.sql}
 * for the {@code threat_detections} schema.
 *
 * <p>{@code source}/{@code sourceUrl}/{@code fetchedAt}/{@code dataOrigin} are provenance
 * metadata: {@code dataOrigin} is {@code "demo"} for {@link
 * com.nershield.seed.DemoDataSeeder}-inserted rows and must be set to {@code "external"} or
 * {@code "model"} by any future real detection pipeline that inserts rows here — never
 * fabricated.
 */
@Entity
@Table(name = "threat_detections")
public class ThreatDetectionEntity {

    @Id
    @Column(length = 64)
    private String id;

    @Enumerated(EnumType.STRING)
    @Column(name = "entity_type", nullable = false, length = 32)
    private EntityType entityType;

    @Enumerated(EnumType.STRING)
    @Column(name = "exposure_type", nullable = false, length = 32)
    private ExposureType exposureType;

    @Column(nullable = false)
    private double confidence;

    @Column(name = "detected_at", nullable = false)
    private Instant detectedAt;

    @Column(length = 120)
    private String city;

    @Column(length = 120)
    private String state;

    @Column(length = 120)
    private String country;

    @Column(length = 120)
    private String region;

    @Column(length = 255)
    private String address;

    @Column(columnDefinition = "geometry(Point,4326)")
    private Point location;

    @Column(nullable = false, length = 64)
    private String source;

    @Column(name = "source_url", length = 255)
    private String sourceUrl;

    @Column(name = "fetched_at", nullable = false)
    private Instant fetchedAt;

    @Column(name = "data_origin", nullable = false, length = 16)
    private String dataOrigin;

    protected ThreatDetectionEntity() {}

    public ThreatDetectionEntity(
            String id,
            EntityType entityType,
            ExposureType exposureType,
            double confidence,
            Instant detectedAt,
            String city,
            String state,
            String country,
            String region,
            String address,
            Point location,
            String source,
            String sourceUrl,
            Instant fetchedAt,
            String dataOrigin) {
        this.id = id;
        this.entityType = entityType;
        this.exposureType = exposureType;
        this.confidence = confidence;
        this.detectedAt = detectedAt;
        this.city = city;
        this.state = state;
        this.country = country;
        this.region = region;
        this.address = address;
        this.location = location;
        this.source = source;
        this.sourceUrl = sourceUrl;
        this.fetchedAt = fetchedAt;
        this.dataOrigin = dataOrigin;
    }

    public String getId() {
        return id;
    }

    public EntityType getEntityType() {
        return entityType;
    }

    public ExposureType getExposureType() {
        return exposureType;
    }

    public double getConfidence() {
        return confidence;
    }

    public Instant getDetectedAt() {
        return detectedAt;
    }

    public String getCity() {
        return city;
    }

    public String getState() {
        return state;
    }

    public String getCountry() {
        return country;
    }

    public String getRegion() {
        return region;
    }

    public String getAddress() {
        return address;
    }

    public Point getLocation() {
        return location;
    }

    public String getSource() {
        return source;
    }

    public String getSourceUrl() {
        return sourceUrl;
    }

    public Instant getFetchedAt() {
        return fetchedAt;
    }

    public String getDataOrigin() {
        return dataOrigin;
    }
}
