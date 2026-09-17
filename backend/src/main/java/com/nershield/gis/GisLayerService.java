package com.nershield.gis;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.nershield.common.ResourceNotFoundException;
import com.nershield.gis.dto.GisLayerMetaResponse;
import com.nershield.incident.IncidentEntity;
import com.nershield.incident.IncidentRepository;
import com.nershield.infrastructure.InfrastructurePointEntity;
import com.nershield.infrastructure.InfrastructurePointRepository;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;

/**
 * Serves named GeoJSON {@code FeatureCollection} layers for the GIS command map.
 *
 * <p>Two kinds of layer:
 *
 * <ul>
 *   <li><b>Stored</b> ({@code risk-zone-polygons}, {@code roads}, {@code rivers}): a whole
 *       FeatureCollection document persisted as-is in {@link GisLayerEntity} — see its
 *       javadoc for why.
 *   <li><b>Computed</b> ({@code villages}, {@code schools}, {@code infrastructure}, {@code
 *       incident-points}): built on read from a real per-row PostGIS table ({@link
 *       InfrastructurePointEntity}) or another domain's table ({@link IncidentEntity}), so
 *       spatial indexing/querying stays possible on the underlying rows. {@code
 *       incident-points} in particular is genuinely <i>derived</i> — it reads {@code
 *       incidents.location}, which is {@code null} for every currently-seeded demo incident
 *       (none of the original fixtures ever carried a real coordinate — see {@code
 *       IncidentEntity}'s javadoc), so this layer correctly returns an empty
 *       FeatureCollection today rather than inventing points, unlike the former frontend-only
 *       {@code geo.ts} version which hardcoded four made-up coordinates for it.
 * </ul>
 */
@Service
public class GisLayerService {

    private final GisLayerRepository repository;
    private final InfrastructurePointRepository infrastructureRepository;
    private final IncidentRepository incidentRepository;
    private final ObjectMapper objectMapper;

    public GisLayerService(
            GisLayerRepository repository,
            InfrastructurePointRepository infrastructureRepository,
            IncidentRepository incidentRepository,
            ObjectMapper objectMapper) {
        this.repository = repository;
        this.infrastructureRepository = infrastructureRepository;
        this.incidentRepository = incidentRepository;
        this.objectMapper = objectMapper;
    }

    /**
     * Lists metadata for every layer {@link #getLayerGeoJson} can actually serve — both the
     * stored ones and the computed ones. The four computed layers have no single stored
     * {@link GisLayerEntity} row (they're assembled live from another table each request),
     * so their metadata is synthesized here rather than read back from a row; {@code
     * updatedAt} is "now" because that's genuinely when this response was computed, not a
     * stored snapshot time.
     */
    public List<GisLayerMetaResponse> listLayers() {
        List<GisLayerMetaResponse> stored = repository.findAll().stream().map(this::toMeta).toList();
        List<GisLayerMetaResponse> computed =
                List.of(
                        computedMeta(
                                "villages",
                                "Villages",
                                "Settlement points (kind=village) from the infrastructure_points table.",
                                "demo"),
                        computedMeta(
                                "schools",
                                "Schools",
                                "School points (kind=school) from the infrastructure_points table.",
                                "demo"),
                        computedMeta(
                                "infrastructure",
                                "Infrastructure",
                                "Hospitals, bridges and depots (all kinds except village) from the infrastructure_points table.",
                                "demo"),
                        computedMeta(
                                "incident-points",
                                "Incident Points",
                                "Incidents with a real recorded location — derived live from the incidents table; empty until an incident carries real coordinates.",
                                "derived"));
        List<GisLayerMetaResponse> all = new java.util.ArrayList<>(stored);
        all.addAll(computed);
        return all;
    }

    private GisLayerMetaResponse computedMeta(String id, String name, String description, String dataOrigin) {
        return new GisLayerMetaResponse(id, name, description, "computed:live-query", Instant.now(), dataOrigin);
    }

    public JsonNode getLayerGeoJson(String id) {
        return switch (id) {
            case "villages" -> toJson(pointsFeatureCollection(infrastructureRepository.findByKind("village")));
            case "schools" -> toJson(pointsFeatureCollection(infrastructureRepository.findByKind("school")));
            case "infrastructure" ->
                    toJson(pointsFeatureCollection(infrastructureRepository.findByKindNot("village")));
            case "incident-points" -> toJson(incidentPointsFeatureCollection());
            default -> getStoredLayerGeoJson(id);
        };
    }

    private JsonNode getStoredLayerGeoJson(String id) {
        GisLayerEntity entity =
                repository.findById(id).orElseThrow(() -> ResourceNotFoundException.of("GisLayer", id));
        try {
            return objectMapper.readTree(entity.getGeojson());
        } catch (JsonProcessingException ex) {
            throw new IllegalStateException("Corrupt GIS layer JSON column: " + id, ex);
        }
    }

    private Map<String, Object> pointsFeatureCollection(List<InfrastructurePointEntity> points) {
        List<Map<String, Object>> features =
                points.stream()
                        .map(
                                p -> {
                                    Map<String, Object> properties = new LinkedHashMap<>();
                                    properties.put("id", p.getId());
                                    properties.put("name", p.getName());
                                    properties.put("kind", p.getKind());
                                    if (p.getStatus() != null) {
                                        properties.put("status", p.getStatus());
                                    }
                                    return feature(properties, p.getLocation().getX(), p.getLocation().getY());
                                })
                        .toList();
        return featureCollection(features);
    }

    private Map<String, Object> incidentPointsFeatureCollection() {
        List<Map<String, Object>> features =
                incidentRepository.findAll().stream()
                        .filter(inc -> inc.getLocation() != null)
                        .map(
                                inc -> {
                                    Map<String, Object> properties = new LinkedHashMap<>();
                                    properties.put("id", inc.getId());
                                    properties.put("name", inc.getTitle());
                                    properties.put("band", inc.getSeverity().toJson());
                                    return feature(
                                            properties, inc.getLocation().getX(), inc.getLocation().getY());
                                })
                        .toList();
        return featureCollection(features);
    }

    private Map<String, Object> feature(Map<String, Object> properties, double lng, double lat) {
        Map<String, Object> geometry = new LinkedHashMap<>();
        geometry.put("type", "Point");
        geometry.put("coordinates", List.of(lng, lat));
        Map<String, Object> feature = new LinkedHashMap<>();
        feature.put("type", "Feature");
        feature.put("properties", properties);
        feature.put("geometry", geometry);
        return feature;
    }

    private Map<String, Object> featureCollection(List<Map<String, Object>> features) {
        Map<String, Object> fc = new LinkedHashMap<>();
        fc.put("type", "FeatureCollection");
        fc.put("features", features);
        return fc;
    }

    private JsonNode toJson(Object value) {
        return objectMapper.valueToTree(value);
    }

    private GisLayerMetaResponse toMeta(GisLayerEntity e) {
        return new GisLayerMetaResponse(
                e.getId(), e.getName(), e.getDescription(), e.getSource(), e.getUpdatedAt(), e.getDataOrigin());
    }
}
