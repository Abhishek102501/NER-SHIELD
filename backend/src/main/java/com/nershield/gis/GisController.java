package com.nershield.gis;

import com.fasterxml.jackson.databind.JsonNode;
import com.nershield.gis.dto.GisLayerMetaResponse;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

/**
 * {@code GET /api/gis/layers} and {@code GET /api/gis/layers/{id}} — named GeoJSON layers for
 * the GIS command map. Public only because no auth mechanism is wired in yet, same rationale
 * as {@code ThreatController}.
 */
@RestController
public class GisController {

    private final GisLayerService service;

    public GisController(GisLayerService service) {
        this.service = service;
    }

    @GetMapping("/api/gis/layers")
    public List<GisLayerMetaResponse> listLayers() {
        return service.listLayers();
    }

    @GetMapping("/api/gis/layers/{id}")
    public JsonNode getLayer(@PathVariable String id) {
        return service.getLayerGeoJson(id);
    }
}
