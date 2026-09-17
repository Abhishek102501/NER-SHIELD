-- V4 - Infrastructure/settlement points (villages, schools, hospitals, bridges, depots).
--
-- Origin: these were hand-authored placeholder points in the former frontend-only
-- `frontend/data/infrastructure.ts` (its own doc comment already called it "DEMO / MOCK
-- DATA" — plausible names/locations for the Sikkim/Darjeeling demonstration region, not a
-- surveyed dataset). No legitimate external source exists for this project's demo region,
-- so this migration only creates schema; DemoDataSeeder inserts the same content, tagged
-- data_origin='demo', same discipline as V2/V3.

CREATE TABLE infrastructure_points (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(160) NOT NULL,
    kind VARCHAR(24) NOT NULL,
    location GEOMETRY(Point, 4326) NOT NULL,
    status VARCHAR(16),
    source VARCHAR(64) NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    data_origin VARCHAR(16) NOT NULL DEFAULT 'demo'
);

CREATE INDEX idx_infrastructure_points_location ON infrastructure_points USING GIST (location);
CREATE INDEX idx_infrastructure_points_kind ON infrastructure_points (kind);
