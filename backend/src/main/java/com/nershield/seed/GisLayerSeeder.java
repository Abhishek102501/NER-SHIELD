package com.nershield.seed;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.nershield.gis.GisLayerEntity;
import com.nershield.gis.GisLayerRepository;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

/**
 * Seeds {@code gis_layers} with the project's original demonstration GeoJSON, ported from the
 * former frontend-only {@code frontend/data/geo.ts} constants (including its {@code blob()}
 * polygon-generation algorithm, reproduced here so the geometry matches exactly). Only runs
 * against an empty table — see {@link DemoDataSeeder} for the full seeding discipline this
 * follows.
 *
 * <p>Scope note: this seeds the three layers with genuine polygon/line geometry
 * (risk-zone-polygons, roads, rivers). The remaining {@code geo.ts} layers (villages,
 * schools, infrastructure points, the incident-point overlay, and the synthetic rainfall
 * heat-point overlay) still live only in the frontend as of this change — see the project
 * audit for why they were left for a follow-up pass rather than ported here.
 */
@Component
public class GisLayerSeeder implements ApplicationRunner {

    private static final String DEMO_SOURCE = "seed:demo-fixture";
    private static final String DEMO_ORIGIN = "demo";

    private final GisLayerRepository repository;
    private final ObjectMapper objectMapper;
    private final boolean enabled;

    public GisLayerSeeder(
            GisLayerRepository repository,
            ObjectMapper objectMapper,
            @Value("${nershield.seed.demo-data:true}") boolean enabled) {
        this.repository = repository;
        this.objectMapper = objectMapper;
        this.enabled = enabled;
    }

    @Override
    public void run(ApplicationArguments args) throws Exception {
        if (!enabled || repository.count() > 0) {
            return;
        }
        Instant now = Instant.now();
        repository.saveAll(
                List.of(
                        new GisLayerEntity(
                                "risk-zone-polygons",
                                "Risk Zone Polygons",
                                "Susceptibility zone boundaries for the GIS command map.",
                                writeJson(riskZonePolygons()),
                                DEMO_SOURCE,
                                now,
                                DEMO_ORIGIN),
                        new GisLayerEntity(
                                "roads",
                                "Roads",
                                "Primary corridor and district road network.",
                                writeJson(roads()),
                                DEMO_SOURCE,
                                now,
                                DEMO_ORIGIN),
                        new GisLayerEntity(
                                "rivers",
                                "Rivers",
                                "Major river courses.",
                                writeJson(rivers()),
                                DEMO_SOURCE,
                                now,
                                DEMO_ORIGIN)));
    }

    // ---- Risk zone polygons ---------------------------------------------------------------

    private Map<String, Object> riskZonePolygons() {
        return featureCollection(
                List.of(
                        zoneFeature(
                                "nh10-sikkim",
                                "NH-10 Corridor",
                                "critical",
                                87,
                                142,
                                12800,
                                7,
                                "Immediate closure review & field verification",
                                "landslide",
                                88.53,
                                27.17,
                                0.09,
                                new double[] {0.2, 0.8, 0.4, 0.9, 0.3, 0.7, 0.5, 0.6}),
                        zoneFeature(
                                "east-district",
                                "East District Ridge",
                                "high",
                                74,
                                128,
                                8300,
                                4,
                                "Heighten monitoring; stage response teams",
                                "landslide",
                                88.68,
                                27.24,
                                0.07,
                                new double[] {0.6, 0.3, 0.7, 0.4, 0.8, 0.5, 0.3, 0.6}),
                        zoneFeature(
                                "teesta-basin",
                                "Teesta Basin",
                                "high",
                                71,
                                118,
                                9600,
                                4,
                                "Flood watch; advise low-lying settlements",
                                "flood",
                                88.53,
                                27.02,
                                0.08,
                                new double[] {0.5, 0.7, 0.3, 0.6, 0.4, 0.8, 0.5, 0.4}),
                        zoneFeature(
                                "hill-road-04",
                                "Hill Road 04 Sector",
                                "moderate",
                                52,
                                86,
                                3400,
                                2,
                                "Routine patrol; clear minor debris",
                                "landslide",
                                88.42,
                                27.09,
                                0.06,
                                new double[] {0.4, 0.5, 0.6, 0.4, 0.5, 0.6, 0.4, 0.5}),
                        zoneFeature(
                                "west-ridge",
                                "West Ridge Array",
                                "low",
                                34,
                                54,
                                1900,
                                1,
                                "Nominal; continue sensor calibration",
                                "landslide",
                                88.36,
                                27.20,
                                0.055,
                                new double[] {0.5, 0.4, 0.5, 0.6, 0.4, 0.5, 0.6, 0.5})));
    }

    private Map<String, Object> zoneFeature(
            String id,
            String name,
            String band,
            int risk,
            int rainfall,
            int population,
            int roadsAtRisk,
            String recommendedAction,
            String hazard,
            double lng,
            double lat,
            double radius,
            double[] seedOffsets) {
        Map<String, Object> properties = new LinkedHashMap<>();
        properties.put("id", id);
        properties.put("name", name);
        properties.put("band", band);
        properties.put("risk", risk);
        properties.put("rainfall", rainfall);
        properties.put("population", population);
        properties.put("roadsAtRisk", roadsAtRisk);
        properties.put("recommendedAction", recommendedAction);
        properties.put("hazard", hazard);
        properties.put("color", severityTint(band));

        Map<String, Object> geometry = new LinkedHashMap<>();
        geometry.put("type", "Polygon");
        geometry.put("coordinates", List.of(blob(lng, lat, radius, seedOffsets)));

        return feature(properties, geometry);
    }

    /** Reproduces {@code frontend/data/geo.ts}'s {@code blob()} exactly, coordinate for coordinate. */
    private static List<double[]> blob(double lng, double lat, double r, double[] seedOffsets) {
        int n = seedOffsets.length;
        List<double[]> points = new java.util.ArrayList<>(n + 1);
        for (int i = 0; i < n; i++) {
            double a = (i / (double) n) * Math.PI * 2;
            double rr = r * (0.72 + seedOffsets[i] * 0.5);
            double x = round4(lng + Math.cos(a) * rr * 1.15);
            double y = round4(lat + Math.sin(a) * rr);
            points.add(new double[] {x, y});
        }
        points.add(points.get(0));
        return points;
    }

    private static double round4(double value) {
        return Math.round(value * 10000.0) / 10000.0;
    }

    private static String severityTint(String band) {
        return switch (band) {
            case "low" -> "#22C55E";
            case "moderate" -> "#F4B400";
            case "high" -> "#FB8C00";
            case "critical" -> "#E53935";
            default -> "#94A3B8";
        };
    }

    // ---- Roads / rivers -------------------------------------------------------------------

    private Map<String, Object> roads() {
        Map<String, Object> nh10Properties = new LinkedHashMap<>();
        nh10Properties.put("name", "NH-10");
        nh10Properties.put("cls", "national");
        nh10Properties.put("status", "warning");
        nh10Properties.put("evacuationRoute", true);
        Map<String, Object> nh10Geometry = new LinkedHashMap<>();
        nh10Geometry.put("type", "LineString");
        nh10Geometry.put(
                "coordinates",
                List.of(
                        new double[] {88.36, 27.28},
                        new double[] {88.46, 27.20},
                        new double[] {88.53, 27.14},
                        new double[] {88.55, 27.05},
                        new double[] {88.52, 26.95}));

        Map<String, Object> hillRoadProperties = new LinkedHashMap<>();
        hillRoadProperties.put("name", "Hill Road 04");
        hillRoadProperties.put("cls", "district");
        hillRoadProperties.put("status", "open");
        hillRoadProperties.put("evacuationRoute", false);
        Map<String, Object> hillRoadGeometry = new LinkedHashMap<>();
        hillRoadGeometry.put("type", "LineString");
        hillRoadGeometry.put(
                "coordinates",
                List.of(
                        new double[] {88.40, 27.12},
                        new double[] {88.45, 27.09},
                        new double[] {88.50, 27.10},
                        new double[] {88.60, 27.13}));

        return featureCollection(
                List.of(feature(nh10Properties, nh10Geometry), feature(hillRoadProperties, hillRoadGeometry)));
    }

    private Map<String, Object> rivers() {
        Map<String, Object> properties = new LinkedHashMap<>();
        properties.put("name", "Teesta");
        Map<String, Object> geometry = new LinkedHashMap<>();
        geometry.put("type", "LineString");
        geometry.put(
                "coordinates",
                List.of(
                        new double[] {88.55, 27.35},
                        new double[] {88.54, 27.20},
                        new double[] {88.53, 27.05},
                        new double[] {88.50, 26.90}));
        return featureCollection(List.of(feature(properties, geometry)));
    }

    // ---- GeoJSON helpers --------------------------------------------------------------------

    private Map<String, Object> feature(Map<String, Object> properties, Map<String, Object> geometry) {
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

    private String writeJson(Object value) throws Exception {
        return objectMapper.writeValueAsString(value);
    }
}
