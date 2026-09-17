-- V3 - Field reports, response/dispatch, and GIS layer storage.
--
-- Same provenance discipline as V2: schema only here, demo/seed content inserted by
-- DemoDataSeeder at startup (only into empty tables), every row tagged data_origin.

CREATE TABLE field_reports (
    id VARCHAR(32) PRIMARY KEY,
    location GEOMETRY(Point, 4326),
    gps_label VARCHAR(64) NOT NULL,
    incident_type VARCHAR(80) NOT NULL,
    severity VARCHAR(16) NOT NULL,
    evidence_count INT NOT NULL DEFAULT 0,
    status VARCHAR(16) NOT NULL,
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    source VARCHAR(64) NOT NULL,
    data_origin VARCHAR(16) NOT NULL DEFAULT 'demo'
);

CREATE INDEX idx_field_reports_location ON field_reports USING GIST (location);
CREATE INDEX idx_field_reports_submitted_at ON field_reports (submitted_at DESC);

CREATE TABLE response_incidents (
    id VARCHAR(64) PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    location_label VARCHAR(200),
    severity VARCHAR(16) NOT NULL,
    risk_score INT NOT NULL,
    population_exposure INT NOT NULL DEFAULT 0,
    infrastructure_exposure VARCHAR(255),
    recommended_action VARCHAR(255),
    phase VARCHAR(16) NOT NULL,
    priority INT NOT NULL,
    source VARCHAR(64) NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    data_origin VARCHAR(16) NOT NULL DEFAULT 'demo'
);

CREATE TABLE response_units (
    id VARCHAR(32) PRIMARY KEY,
    label VARCHAR(120) NOT NULL,
    kind VARCHAR(24) NOT NULL,
    base VARCHAR(120) NOT NULL,
    eta_minutes INT NOT NULL,
    source VARCHAR(64) NOT NULL,
    data_origin VARCHAR(16) NOT NULL DEFAULT 'demo'
);

CREATE TABLE dispatch_assignments (
    id VARCHAR(36) PRIMARY KEY,
    response_incident_id VARCHAR(64) NOT NULL REFERENCES response_incidents (id),
    response_unit_id VARCHAR(32) NOT NULL REFERENCES response_units (id),
    dispatched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    eta_minutes INT NOT NULL,
    status VARCHAR(16) NOT NULL DEFAULT 'dispatched',
    source VARCHAR(64) NOT NULL,
    data_origin VARCHAR(16) NOT NULL DEFAULT 'demo'
);

CREATE INDEX idx_dispatch_assignments_incident ON dispatch_assignments (response_incident_id);

-- Generic named-GeoJSON-FeatureCollection store for the GIS command map. Not normalized
-- into per-feature spatial tables yet (see JpaGisLayerSource javadoc for why) — each row is
-- one full FeatureCollection, versioned as a whole via `updated_at`.
CREATE TABLE gis_layers (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(160) NOT NULL,
    description VARCHAR(255),
    geojson TEXT NOT NULL,
    source VARCHAR(64) NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    data_origin VARCHAR(16) NOT NULL DEFAULT 'demo'
);
