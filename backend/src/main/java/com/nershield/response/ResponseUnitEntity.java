package com.nershield.response;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/** PostgreSQL-backed persistence for a response unit roster entry. */
@Entity
@Table(name = "response_units")
public class ResponseUnitEntity {

    @Id
    @Column(length = 32)
    private String id;

    @Column(nullable = false, length = 120)
    private String label;

    @Column(nullable = false, length = 24)
    private String kind;

    @Column(nullable = false, length = 120)
    private String base;

    @Column(name = "eta_minutes", nullable = false)
    private int etaMinutes;

    @Column(nullable = false, length = 64)
    private String source;

    @Column(name = "data_origin", nullable = false, length = 16)
    private String dataOrigin;

    protected ResponseUnitEntity() {}

    public ResponseUnitEntity(
            String id, String label, String kind, String base, int etaMinutes, String source, String dataOrigin) {
        this.id = id;
        this.label = label;
        this.kind = kind;
        this.base = base;
        this.etaMinutes = etaMinutes;
        this.source = source;
        this.dataOrigin = dataOrigin;
    }

    public String getId() {
        return id;
    }

    public String getLabel() {
        return label;
    }

    public String getKind() {
        return kind;
    }

    public String getBase() {
        return base;
    }

    public int getEtaMinutes() {
        return etaMinutes;
    }

    public String getSource() {
        return source;
    }

    public String getDataOrigin() {
        return dataOrigin;
    }
}
