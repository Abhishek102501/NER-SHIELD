package com.nershield.gis;

import static org.hamcrest.Matchers.greaterThan;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

/**
 * Verifies {@code GET /api/gis/layers} and {@code GET /api/gis/layers/{id}} through the full
 * filter chain: public access, the stored-layer path (risk-zone-polygons/roads/rivers), the
 * computed-layer path (villages/schools/infrastructure/incident-points), and the not-found
 * case for an unknown layer id.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class GisControllerTest {

    @Autowired private MockMvc mockMvc;

    @Test
    void listsBothStoredAndComputedLayerMetadataWithoutAuthentication() throws Exception {
        mockMvc.perform(get("/api/gis/layers"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()", greaterThan(0)))
                .andExpect(jsonPath("$[?(@.id=='risk-zone-polygons')].dataOrigin").value("demo"))
                .andExpect(jsonPath("$[?(@.id=='villages')].dataOrigin").value("demo"))
                .andExpect(jsonPath("$[?(@.id=='schools')].dataOrigin").value("demo"))
                .andExpect(jsonPath("$[?(@.id=='infrastructure')].dataOrigin").value("demo"))
                .andExpect(jsonPath("$[?(@.id=='incident-points')].dataOrigin").value("derived"));
    }

    @Test
    void returnsStoredRiskZonePolygonsAsValidGeoJson() throws Exception {
        mockMvc.perform(get("/api/gis/layers/risk-zone-polygons"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.type").value("FeatureCollection"))
                .andExpect(jsonPath("$.features.length()", greaterThan(0)))
                .andExpect(jsonPath("$.features[0].geometry.type").value("Polygon"));
    }

    @Test
    void returnsComputedVillagesLayerFromInfrastructureTable() throws Exception {
        mockMvc.perform(get("/api/gis/layers/villages"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.type").value("FeatureCollection"))
                .andExpect(jsonPath("$.features.length()", greaterThan(0)))
                .andExpect(jsonPath("$.features[0].properties.kind").value("village"))
                .andExpect(jsonPath("$.features[0].geometry.type").value("Point"));
    }

    @Test
    void returnsComputedInfrastructureLayerExcludingVillages() throws Exception {
        mockMvc.perform(get("/api/gis/layers/infrastructure"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.features.length()", greaterThan(0)))
                .andExpect(jsonPath("$.features[?(@.properties.kind=='village')]").doesNotExist());
    }

    @Test
    void returnsEmptyIncidentPointsLayerWhenNoIncidentCarriesRealCoordinates() throws Exception {
        // Honest behavior, not a bug: no seeded incident has ever carried a real lat/lon
        // (see IncidentEntity's javadoc) — this must stay an empty FeatureCollection rather
        // than inventing points, unlike the old frontend-only geo.ts version.
        mockMvc.perform(get("/api/gis/layers/incident-points"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.type").value("FeatureCollection"))
                .andExpect(jsonPath("$.features.length()").value(0));
    }

    @Test
    void unknownLayerIdReturnsNotFound() throws Exception {
        mockMvc.perform(get("/api/gis/layers/does-not-exist"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404));
    }
}
