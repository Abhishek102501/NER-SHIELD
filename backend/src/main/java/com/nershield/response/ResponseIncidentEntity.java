package com.nershield.response;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;

/** PostgreSQL-backed persistence for a response-priority-queue incident. */
@Entity
@Table(name = "response_incidents")
public class ResponseIncidentEntity {

    @Id
    @Column(length = 64)
    private String id;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(name = "location_label", length = 200)
    private String locationLabel;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private Severity severity;

    @Column(name = "risk_score", nullable = false)
    private int riskScore;

    @Column(name = "population_exposure", nullable = false)
    private int populationExposure;

    @Column(name = "infrastructure_exposure", length = 255)
    private String infrastructureExposure;

    @Column(name = "recommended_action", length = 255)
    private String recommendedAction;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private ResponsePhase phase;

    @Column(nullable = false)
    private int priority;

    @Column(nullable = false, length = 64)
    private String source;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Column(name = "data_origin", nullable = false, length = 16)
    private String dataOrigin;

    protected ResponseIncidentEntity() {}

    public ResponseIncidentEntity(
            String id,
            String title,
            String locationLabel,
            Severity severity,
            int riskScore,
            int populationExposure,
            String infrastructureExposure,
            String recommendedAction,
            ResponsePhase phase,
            int priority,
            String source,
            Instant updatedAt,
            String dataOrigin) {
        this.id = id;
        this.title = title;
        this.locationLabel = locationLabel;
        this.severity = severity;
        this.riskScore = riskScore;
        this.populationExposure = populationExposure;
        this.infrastructureExposure = infrastructureExposure;
        this.recommendedAction = recommendedAction;
        this.phase = phase;
        this.priority = priority;
        this.source = source;
        this.updatedAt = updatedAt;
        this.dataOrigin = dataOrigin;
    }

    public String getId() {
        return id;
    }

    public String getTitle() {
        return title;
    }

    public String getLocationLabel() {
        return locationLabel;
    }

    public Severity getSeverity() {
        return severity;
    }

    public int getRiskScore() {
        return riskScore;
    }

    public int getPopulationExposure() {
        return populationExposure;
    }

    public String getInfrastructureExposure() {
        return infrastructureExposure;
    }

    public String getRecommendedAction() {
        return recommendedAction;
    }

    public ResponsePhase getPhase() {
        return phase;
    }

    public int getPriority() {
        return priority;
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
