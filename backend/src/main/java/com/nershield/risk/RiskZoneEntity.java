package com.nershield.risk;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import org.locationtech.jts.geom.Point;

/**
 * PostGIS-backed persistence for a risk zone assessment. See {@code V2__domain_tables.sql}
 * for the {@code risk_zones} schema.
 *
 * <p>{@code factorsJson}/{@code driversJson} hold the variable-length factor/driver
 * breakdown as JSON text (see the migration's comment for why) — {@link JpaRiskZoneSource}
 * is the only place that (de)serializes them.
 */
@Entity
@Table(name = "risk_zones")
public class RiskZoneEntity {

    @Id
    @Column(length = 64)
    private String id;

    @Column(nullable = false, length = 160)
    private String name;

    @Column(length = 160)
    private String sector;

    @Column(nullable = false, columnDefinition = "geometry(Point,4326)")
    private Point center;

    @Column(name = "risk_value", nullable = false)
    private int riskValue;

    @Enumerated(EnumType.STRING)
    @Column(name = "risk_band", nullable = false, length = 16)
    private Severity riskBand;

    @Column(name = "risk_confidence", nullable = false)
    private int riskConfidence;

    @Column(name = "risk_delta_label", length = 32)
    private String riskDeltaLabel;

    @Enumerated(EnumType.STRING)
    @Column(name = "risk_delta_direction", length = 8)
    private DeltaDirection riskDeltaDirection;

    @Column(name = "rainfall_24h")
    private Double rainfall24h;

    @Column(name = "rainfall_72h")
    private Double rainfall72h;

    @Column(name = "soil_moisture")
    private Double soilMoisture;

    private Double slope;

    private Double elevation;

    private int villages;
    private int roads;
    private int bridges;
    private int hospitals;

    @Column(name = "population_exposure")
    private int populationExposure;

    @Column(name = "active_incidents")
    private int activeIncidents;

    @Column(name = "factors_json", nullable = false, columnDefinition = "text")
    private String factorsJson;

    @Column(name = "drivers_json", nullable = false, columnDefinition = "text")
    private String driversJson;

    @Column(nullable = false, length = 64)
    private String source;

    @Column(name = "calculated_at", nullable = false)
    private Instant calculatedAt;

    @Column(name = "data_origin", nullable = false, length = 16)
    private String dataOrigin;

    protected RiskZoneEntity() {}

    public RiskZoneEntity(
            String id,
            String name,
            String sector,
            Point center,
            int riskValue,
            Severity riskBand,
            int riskConfidence,
            String riskDeltaLabel,
            DeltaDirection riskDeltaDirection,
            Double rainfall24h,
            Double rainfall72h,
            Double soilMoisture,
            Double slope,
            Double elevation,
            int villages,
            int roads,
            int bridges,
            int hospitals,
            int populationExposure,
            int activeIncidents,
            String factorsJson,
            String driversJson,
            String source,
            Instant calculatedAt,
            String dataOrigin) {
        this.id = id;
        this.name = name;
        this.sector = sector;
        this.center = center;
        this.riskValue = riskValue;
        this.riskBand = riskBand;
        this.riskConfidence = riskConfidence;
        this.riskDeltaLabel = riskDeltaLabel;
        this.riskDeltaDirection = riskDeltaDirection;
        this.rainfall24h = rainfall24h;
        this.rainfall72h = rainfall72h;
        this.soilMoisture = soilMoisture;
        this.slope = slope;
        this.elevation = elevation;
        this.villages = villages;
        this.roads = roads;
        this.bridges = bridges;
        this.hospitals = hospitals;
        this.populationExposure = populationExposure;
        this.activeIncidents = activeIncidents;
        this.factorsJson = factorsJson;
        this.driversJson = driversJson;
        this.source = source;
        this.calculatedAt = calculatedAt;
        this.dataOrigin = dataOrigin;
    }

    public String getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public String getSector() {
        return sector;
    }

    public Point getCenter() {
        return center;
    }

    public int getRiskValue() {
        return riskValue;
    }

    public Severity getRiskBand() {
        return riskBand;
    }

    public int getRiskConfidence() {
        return riskConfidence;
    }

    public String getRiskDeltaLabel() {
        return riskDeltaLabel;
    }

    public DeltaDirection getRiskDeltaDirection() {
        return riskDeltaDirection;
    }

    public Double getRainfall24h() {
        return rainfall24h;
    }

    public Double getRainfall72h() {
        return rainfall72h;
    }

    public Double getSoilMoisture() {
        return soilMoisture;
    }

    public Double getSlope() {
        return slope;
    }

    public Double getElevation() {
        return elevation;
    }

    public int getVillages() {
        return villages;
    }

    public int getRoads() {
        return roads;
    }

    public int getBridges() {
        return bridges;
    }

    public int getHospitals() {
        return hospitals;
    }

    public int getPopulationExposure() {
        return populationExposure;
    }

    public int getActiveIncidents() {
        return activeIncidents;
    }

    public String getFactorsJson() {
        return factorsJson;
    }

    public String getDriversJson() {
        return driversJson;
    }

    public String getSource() {
        return source;
    }

    public Instant getCalculatedAt() {
        return calculatedAt;
    }

    public String getDataOrigin() {
        return dataOrigin;
    }
}
