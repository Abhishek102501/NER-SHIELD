/**
 * Named GeoJSON layer storage for the GIS command map.
 *
 * <p>{@link com.nershield.gis.GisLayerEntity} stores each layer as a whole {@code
 * FeatureCollection} document (see its javadoc for why, vs. the per-row PostGIS geometry
 * columns used by {@code com.nershield.risk}/{@code com.nershield.threat}/{@code
 * com.nershield.incident}). {@code GET /api/gis/layers/{id}} is what the frontend map
 * consumes in place of the large hardcoded GeoJSON constants formerly in {@code
 * frontend/data/geo.ts}.
 */
package com.nershield.gis;
