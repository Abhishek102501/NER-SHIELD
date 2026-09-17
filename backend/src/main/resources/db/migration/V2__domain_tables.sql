-- V2 - Domain tables for threats, risk zones, incidents and escalation alerts.
--
-- Replaces the in-memory Demo*Source fixtures with real PostGIS-backed persistence.
-- Every row carries `source` and `data_origin` provenance columns so callers (ultimately
-- the frontend) can always tell demo/seed content apart from anything genuinely observed
-- or externally sourced. Demo/seed content itself is inserted by DemoDataSeeder at
-- application startup (only when a table is empty), not by this migration — this file
-- owns schema only, per the project's Flyway discipline.

CREATE TABLE threat_detections (
    id VARCHAR(64) PRIMARY KEY,
    entity_type VARCHAR(32) NOT NULL,
    exposure_type VARCHAR(32) NOT NULL,
    confidence DOUBLE PRECISION NOT NULL,
    detected_at TIMESTAMPTZ NOT NULL,
    city VARCHAR(120),
    state VARCHAR(120),
    country VARCHAR(120),
    region VARCHAR(120),
    address VARCHAR(255),
    location GEOMETRY(Point, 4326),
    source VARCHAR(64) NOT NULL,
    source_url VARCHAR(255),
    fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    data_origin VARCHAR(16) NOT NULL DEFAULT 'demo'
);

CREATE INDEX idx_threat_detections_location ON threat_detections USING GIST (location);
CREATE INDEX idx_threat_detections_detected_at ON threat_detections (detected_at DESC);

CREATE TABLE risk_zones (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(160) NOT NULL,
    sector VARCHAR(160),
    center GEOMETRY(Point, 4326) NOT NULL,
    risk_value INT NOT NULL,
    risk_band VARCHAR(16) NOT NULL,
    risk_confidence INT NOT NULL,
    risk_delta_label VARCHAR(32),
    risk_delta_direction VARCHAR(8),
    rainfall_24h DOUBLE PRECISION,
    rainfall_72h DOUBLE PRECISION,
    soil_moisture DOUBLE PRECISION,
    slope DOUBLE PRECISION,
    elevation DOUBLE PRECISION,
    villages INT NOT NULL DEFAULT 0,
    roads INT NOT NULL DEFAULT 0,
    bridges INT NOT NULL DEFAULT 0,
    hospitals INT NOT NULL DEFAULT 0,
    population_exposure INT NOT NULL DEFAULT 0,
    active_incidents INT NOT NULL DEFAULT 0,
    -- Factor/driver breakdowns are variable-length nested structures with no independent
    -- query need of their own yet; stored as JSON text rather than normalized child tables
    -- until a real susceptibility model needs to query into them individually.
    factors_json TEXT NOT NULL DEFAULT '[]',
    drivers_json TEXT NOT NULL DEFAULT '[]',
    source VARCHAR(64) NOT NULL,
    calculated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    data_origin VARCHAR(16) NOT NULL DEFAULT 'demo'
);

CREATE INDEX idx_risk_zones_center ON risk_zones USING GIST (center);

CREATE TABLE incidents (
    id VARCHAR(64) PRIMARY KEY,
    severity VARCHAR(16) NOT NULL,
    title VARCHAR(200) NOT NULL,
    location_label VARCHAR(200),
    location GEOMETRY(Point, 4326),
    map_x DOUBLE PRECISION,
    map_y DOUBLE PRECISION,
    summary TEXT,
    category VARCHAR(80),
    reported_by VARCHAR(160),
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    source VARCHAR(64) NOT NULL,
    data_origin VARCHAR(16) NOT NULL DEFAULT 'demo'
);

CREATE INDEX idx_incidents_location ON incidents USING GIST (location);
CREATE INDEX idx_incidents_occurred_at ON incidents (occurred_at DESC);

CREATE TABLE escalation_alerts (
    id VARCHAR(64) PRIMARY KEY,
    zone VARCHAR(160) NOT NULL,
    from_severity VARCHAR(16) NOT NULL,
    to_severity VARCHAR(16) NOT NULL,
    cause VARCHAR(255),
    action VARCHAR(255),
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    acknowledged BOOLEAN NOT NULL DEFAULT false,
    acknowledged_at TIMESTAMPTZ,
    source VARCHAR(64) NOT NULL,
    data_origin VARCHAR(16) NOT NULL DEFAULT 'demo'
);

CREATE INDEX idx_escalation_alerts_occurred_at ON escalation_alerts (occurred_at DESC);
