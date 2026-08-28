-- V1 - Foundation only.
--
-- Enables the PostGIS extension so later migrations can declare spatial columns
-- (geometry/geography) for the GIS domain. Domain tables are introduced in
-- subsequent migrations, not here.
--
-- Requires the postgis extension to be installed on the PostgreSQL server and the
-- migration user to have rights to create it (superuser, or the extension already
-- created by a DBA - in which case this statement is a no-op).

CREATE EXTENSION IF NOT EXISTS postgis;
