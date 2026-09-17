package com.nershield.gis.dto;

import java.time.Instant;

/** Metadata for one GIS layer, without the (potentially large) GeoJSON body. */
public record GisLayerMetaResponse(
        String id, String name, String description, String source, Instant updatedAt, String dataOrigin) {}
