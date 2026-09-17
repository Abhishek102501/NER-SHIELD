package com.nershield.seed;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.nershield.alert.EscalationAlertEntity;
import com.nershield.alert.EscalationAlertRepository;
import com.nershield.incident.IncidentEntity;
import com.nershield.incident.IncidentRepository;
import com.nershield.risk.DeltaDirection;
import com.nershield.risk.RiskZoneEntity;
import com.nershield.risk.RiskZoneRepository;
import com.nershield.risk.dto.RiskDriverResponse;
import com.nershield.risk.dto.RiskFactorResponse;
import com.nershield.threat.detection.EntityType;
import com.nershield.threat.detection.ExposureType;
import com.nershield.threat.detection.ThreatDetectionEntity;
import com.nershield.threat.detection.ThreatDetectionRepository;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import org.locationtech.jts.geom.Coordinate;
import org.locationtech.jts.geom.GeometryFactory;
import org.locationtech.jts.geom.Point;
import org.locationtech.jts.geom.PrecisionModel;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

/**
 * Inserts the project's original demonstration content into the real PostgreSQL/PostGIS
 * tables, but only when a table is empty — this never overwrites real data with demo data,
 * and never re-seeds after the first run.
 *
 * <p>This is the single place that owns demo/seed content (ported verbatim from the former
 * in-memory {@code Demo*Source} classes it supersedes). Every row it inserts is tagged
 * {@code dataOrigin="demo", source="seed:demo-fixture"} so {@code JpaDetectionSource},
 * {@code JpaRiskZoneSource}, {@code JpaIncidentSource} and {@code JpaAlertSource} continue to
 * report {@code isLive()=false} for this content, exactly as the demo sources did before.
 *
 * <p>Disable with {@code nershield.seed.demo-data=false} (e.g. in a real deployment where an
 * empty table should stay empty until a real pipeline populates it).
 */
@Component
public class DemoDataSeeder implements ApplicationRunner {

    private static final String DEMO_SOURCE = "seed:demo-fixture";
    private static final String DEMO_ORIGIN = "demo";
    private static final GeometryFactory GEOMETRY_FACTORY = new GeometryFactory(new PrecisionModel(), 4326);

    private final ThreatDetectionRepository threatRepository;
    private final RiskZoneRepository riskZoneRepository;
    private final IncidentRepository incidentRepository;
    private final EscalationAlertRepository alertRepository;
    private final ObjectMapper objectMapper;
    private final boolean enabled;

    public DemoDataSeeder(
            ThreatDetectionRepository threatRepository,
            RiskZoneRepository riskZoneRepository,
            IncidentRepository incidentRepository,
            EscalationAlertRepository alertRepository,
            ObjectMapper objectMapper,
            @Value("${nershield.seed.demo-data:true}") boolean enabled) {
        this.threatRepository = threatRepository;
        this.riskZoneRepository = riskZoneRepository;
        this.incidentRepository = incidentRepository;
        this.alertRepository = alertRepository;
        this.objectMapper = objectMapper;
        this.enabled = enabled;
    }

    @Override
    public void run(ApplicationArguments args) throws Exception {
        if (!enabled) {
            return;
        }
        seedThreats();
        seedRiskZones();
        seedIncidents();
        seedAlerts();
    }

    private Point point(double longitude, double latitude) {
        return GEOMETRY_FACTORY.createPoint(new Coordinate(longitude, latitude));
    }

    // ---- Threats -----------------------------------------------------------------------

    private void seedThreats() {
        if (threatRepository.count() > 0) {
            return;
        }
        Instant now = Instant.now();
        threatRepository.saveAll(
                List.of(
                        threat(
                                "det-001",
                                EntityType.CREDENTIAL,
                                ExposureType.POLICY_VIOLATION,
                                0.93,
                                now.minus(45, ChronoUnit.MINUTES),
                                "New Delhi",
                                "Delhi",
                                "India",
                                28.6139,
                                77.2090),
                        threat(
                                "det-002",
                                EntityType.PERSON,
                                ExposureType.PUBLIC_EXPOSURE,
                                0.81,
                                now.minus(2, ChronoUnit.HOURS),
                                "Shillong",
                                "Meghalaya",
                                "India",
                                25.5788,
                                91.8933),
                        threat(
                                "det-003",
                                EntityType.PERSON,
                                ExposureType.POLICY_VIOLATION,
                                0.77,
                                now.minus(1, ChronoUnit.DAYS),
                                "Agartala",
                                "Tripura",
                                "India",
                                23.8315,
                                91.2868),
                        threat(
                                "det-004",
                                EntityType.IP_ADDRESS,
                                ExposureType.ANOMALOUS_BEHAVIOR,
                                0.72,
                                now.minus(4, ChronoUnit.HOURS),
                                "Guwahati",
                                "Assam",
                                "India",
                                26.1445,
                                91.7362),
                        threat(
                                "det-005",
                                EntityType.DOCUMENT,
                                ExposureType.THIRD_PARTY_ACCESS,
                                0.66,
                                now.minus(15, ChronoUnit.HOURS),
                                "Aizawl",
                                "Mizoram",
                                "India",
                                23.7271,
                                92.7176),
                        threat(
                                "det-006",
                                EntityType.IP_ADDRESS,
                                ExposureType.ANOMALOUS_BEHAVIOR,
                                0.60,
                                now.minus(30, ChronoUnit.HOURS),
                                "Kohima",
                                "Nagaland",
                                "India",
                                25.6751,
                                94.1086),
                        // det-007 deliberately carries no location at all, exercising the
                        // "no known location" path through ThreatTransformer and the map.
                        new ThreatDetectionEntity(
                                "det-007",
                                EntityType.DEVICE,
                                ExposureType.INTERNAL_ONLY,
                                0.52,
                                now.minus(6, ChronoUnit.HOURS),
                                null,
                                null,
                                null,
                                null,
                                null,
                                null,
                                DEMO_SOURCE,
                                null,
                                now,
                                DEMO_ORIGIN),
                        threat(
                                "det-008",
                                EntityType.ORGANIZATION,
                                ExposureType.INTERNAL_ONLY,
                                0.40,
                                now.minus(29, ChronoUnit.HOURS),
                                "Itanagar",
                                "Arunachal Pradesh",
                                "India",
                                27.4728,
                                94.9120)));
    }

    private ThreatDetectionEntity threat(
            String id,
            EntityType entityType,
            ExposureType exposureType,
            double confidence,
            Instant detectedAt,
            String city,
            String state,
            String country,
            double latitude,
            double longitude) {
        return new ThreatDetectionEntity(
                id,
                entityType,
                exposureType,
                confidence,
                detectedAt,
                city,
                state,
                country,
                null,
                null,
                point(longitude, latitude),
                DEMO_SOURCE,
                null,
                Instant.now(),
                DEMO_ORIGIN);
    }

    // ---- Risk zones ---------------------------------------------------------------------

    private void seedRiskZones() {
        if (riskZoneRepository.count() > 0) {
            return;
        }
        riskZoneRepository.saveAll(
                List.of(
                        riskZone(
                                "nh10-sikkim",
                                "NH-10 Corridor",
                                "Sikkim · Teesta Valley",
                                88.53,
                                27.17,
                                87,
                                com.nershield.risk.Severity.CRITICAL,
                                91,
                                "+12.6% / 6H",
                                DeltaDirection.UP,
                                142,
                                287,
                                82,
                                41,
                                1240,
                                4,
                                7,
                                2,
                                1,
                                12800,
                                3,
                                List.of(
                                        new RiskFactorResponse(
                                                "rainfall", "Rainfall", 34, com.nershield.risk.Severity.CRITICAL),
                                        new RiskFactorResponse(
                                                "soil", "Soil Moisture", 24, com.nershield.risk.Severity.HIGH),
                                        new RiskFactorResponse("slope", "Slope", 18, com.nershield.risk.Severity.HIGH),
                                        new RiskFactorResponse(
                                                "historical", "Historical", 13, com.nershield.risk.Severity.MODERATE),
                                        new RiskFactorResponse(
                                                "satellite",
                                                "Satellite Change",
                                                7,
                                                com.nershield.risk.Severity.MODERATE),
                                        new RiskFactorResponse("terrain", "Terrain", 4, com.nershield.risk.Severity.LOW)),
                                List.of(
                                        new RiskDriverResponse(
                                                "d1",
                                                "Extreme rainfall accumulation",
                                                "287 mm over 72h — 2.4× the seasonal alert threshold.",
                                                34,
                                                com.nershield.risk.Severity.CRITICAL),
                                        new RiskDriverResponse(
                                                "d2",
                                                "High soil moisture",
                                                "Saturation at 82%, past the 70% failure threshold.",
                                                24,
                                                com.nershield.risk.Severity.HIGH),
                                        new RiskDriverResponse(
                                                "d3",
                                                "Steep terrain",
                                                "Cut-slope gradient of 41° along the NH-10 corridor.",
                                                18,
                                                com.nershield.risk.Severity.HIGH),
                                        new RiskDriverResponse(
                                                "d4",
                                                "Historical susceptibility",
                                                "9 recorded slope failures in this reach since 2011.",
                                                13,
                                                com.nershield.risk.Severity.MODERATE))),
                        riskZone(
                                "meghalaya-s04",
                                "Meghalaya Sector 04",
                                "East Khasi Hills",
                                91.74,
                                25.45,
                                79,
                                com.nershield.risk.Severity.HIGH,
                                88,
                                "+9.1% / 6H",
                                DeltaDirection.UP,
                                168,
                                341,
                                77,
                                33,
                                1490,
                                6,
                                5,
                                1,
                                1,
                                18400,
                                2,
                                List.of(
                                        new RiskFactorResponse(
                                                "rainfall", "Rainfall", 38, com.nershield.risk.Severity.CRITICAL),
                                        new RiskFactorResponse(
                                                "soil", "Soil Moisture", 22, com.nershield.risk.Severity.HIGH),
                                        new RiskFactorResponse(
                                                "slope", "Slope", 15, com.nershield.risk.Severity.MODERATE),
                                        new RiskFactorResponse(
                                                "historical", "Historical", 14, com.nershield.risk.Severity.MODERATE),
                                        new RiskFactorResponse(
                                                "satellite",
                                                "Satellite Change",
                                                7,
                                                com.nershield.risk.Severity.MODERATE),
                                        new RiskFactorResponse("terrain", "Terrain", 4, com.nershield.risk.Severity.LOW)),
                                List.of(
                                        new RiskDriverResponse(
                                                "d1",
                                                "Record rainfall band",
                                                "341 mm / 72h across the Cherrapunji orographic belt.",
                                                38,
                                                com.nershield.risk.Severity.CRITICAL),
                                        new RiskDriverResponse(
                                                "d2",
                                                "Saturated regolith",
                                                "Thin soil over bedrock saturated to 77%.",
                                                22,
                                                com.nershield.risk.Severity.HIGH),
                                        new RiskDriverResponse(
                                                "d3",
                                                "Historical susceptibility",
                                                "Repeated debris flows recorded along Sector 04.",
                                                14,
                                                com.nershield.risk.Severity.MODERATE),
                                        new RiskDriverResponse(
                                                "d4",
                                                "Slope gradient",
                                                "33° escarpment above the settlement cluster.",
                                                15,
                                                com.nershield.risk.Severity.MODERATE))),
                        riskZone(
                                "teesta-basin",
                                "Teesta Basin",
                                "Sikkim · Rangpo",
                                88.53,
                                27.02,
                                71,
                                com.nershield.risk.Severity.HIGH,
                                85,
                                "+6.4% / 6H",
                                DeltaDirection.UP,
                                118,
                                236,
                                74,
                                22,
                                300,
                                5,
                                4,
                                3,
                                0,
                                9600,
                                1,
                                List.of(
                                        new RiskFactorResponse("rainfall", "Rainfall", 30, com.nershield.risk.Severity.HIGH),
                                        new RiskFactorResponse(
                                                "soil", "Soil Moisture", 20, com.nershield.risk.Severity.HIGH),
                                        new RiskFactorResponse(
                                                "river", "River Discharge", 26, com.nershield.risk.Severity.HIGH),
                                        new RiskFactorResponse(
                                                "historical", "Historical", 14, com.nershield.risk.Severity.MODERATE),
                                        new RiskFactorResponse("terrain", "Terrain", 10, com.nershield.risk.Severity.LOW)),
                                List.of(
                                        new RiskDriverResponse(
                                                "d1",
                                                "Rising river discharge",
                                                "Upstream release climbing above the 6-hour forecast band.",
                                                26,
                                                com.nershield.risk.Severity.HIGH),
                                        new RiskDriverResponse(
                                                "d2",
                                                "Sustained rainfall",
                                                "236 mm / 72h feeding the catchment.",
                                                30,
                                                com.nershield.risk.Severity.HIGH),
                                        new RiskDriverResponse(
                                                "d3",
                                                "Valley-floor exposure",
                                                "Low-lying settlements within the flood envelope.",
                                                20,
                                                com.nershield.risk.Severity.HIGH))),
                        riskZone(
                                "aizawl-ridge",
                                "Aizawl Ridge",
                                "Mizoram",
                                92.72,
                                23.73,
                                54,
                                com.nershield.risk.Severity.MODERATE,
                                83,
                                "+3.2% / 6H",
                                DeltaDirection.UP,
                                74,
                                149,
                                61,
                                37,
                                1130,
                                2,
                                3,
                                0,
                                1,
                                21500,
                                1,
                                List.of(
                                        new RiskFactorResponse(
                                                "rainfall", "Rainfall", 28, com.nershield.risk.Severity.MODERATE),
                                        new RiskFactorResponse(
                                                "soil", "Soil Moisture", 22, com.nershield.risk.Severity.MODERATE),
                                        new RiskFactorResponse("slope", "Slope", 24, com.nershield.risk.Severity.HIGH),
                                        new RiskFactorResponse(
                                                "historical", "Historical", 16, com.nershield.risk.Severity.MODERATE),
                                        new RiskFactorResponse("terrain", "Terrain", 10, com.nershield.risk.Severity.LOW)),
                                List.of(
                                        new RiskDriverResponse(
                                                "d1",
                                                "Steep urban slopes",
                                                "Dense hillside construction on 37° gradients.",
                                                24,
                                                com.nershield.risk.Severity.HIGH),
                                        new RiskDriverResponse(
                                                "d2",
                                                "Moderate rainfall",
                                                "149 mm / 72h — below critical but rising.",
                                                28,
                                                com.nershield.risk.Severity.MODERATE)))));
    }

    private RiskZoneEntity riskZone(
            String id,
            String name,
            String sector,
            double lng,
            double lat,
            int riskValue,
            com.nershield.risk.Severity band,
            int confidence,
            String deltaLabel,
            DeltaDirection deltaDirection,
            double rainfall24h,
            double rainfall72h,
            double soilMoisture,
            double slope,
            double elevation,
            int villages,
            int roads,
            int bridges,
            int hospitals,
            int populationExposure,
            int activeIncidents,
            List<RiskFactorResponse> factors,
            List<RiskDriverResponse> drivers) {
        return new RiskZoneEntity(
                id,
                name,
                sector,
                point(lng, lat),
                riskValue,
                band,
                confidence,
                deltaLabel,
                deltaDirection,
                rainfall24h,
                rainfall72h,
                soilMoisture,
                slope,
                elevation,
                villages,
                roads,
                bridges,
                hospitals,
                populationExposure,
                activeIncidents,
                writeJson(factors),
                writeJson(drivers),
                DEMO_SOURCE,
                Instant.now(),
                DEMO_ORIGIN);
    }

    // ---- Incidents ------------------------------------------------------------------------

    private void seedIncidents() {
        if (incidentRepository.count() > 0) {
            return;
        }
        Instant now = Instant.now();
        incidentRepository.saveAll(
                List.of(
                        incident(
                                "inc-1042",
                                com.nershield.incident.Severity.CRITICAL,
                                "Slope failure risk",
                                "NH-10 / Sikkim",
                                now.minus(12, ChronoUnit.MINUTES),
                                34,
                                38,
                                "Rapid pore-pressure rise detected on the NH-10 cut-slope corridor. Debris"
                                        + " movement probability elevated; corridor flagged for pre-emptive"
                                        + " closure review.",
                                "Landslide",
                                "Sensor grid · SK-07"),
                        incident(
                                "inc-1039",
                                com.nershield.incident.Severity.HIGH,
                                "Saturated hillslope",
                                "East District",
                                now.minus(27, ChronoUnit.MINUTES),
                                58,
                                30,
                                "Continuous rainfall over 36h has pushed soil moisture past the seasonal"
                                        + " threshold across the East District ridge line.",
                                "Landslide",
                                "Field unit · ED-02"),
                        incident(
                                "inc-1036",
                                com.nershield.incident.Severity.MODERATE,
                                "Minor debris on carriageway",
                                "Hill Road 04",
                                now.minus(41, ChronoUnit.MINUTES),
                                46,
                                58,
                                "Small rockfall partially obstructing a single lane. No casualties reported."
                                        + " Clearance crew notified.",
                                "Road Obstruction",
                                "Field report · citizen"),
                        incident(
                                "inc-1031",
                                com.nershield.incident.Severity.HIGH,
                                "River level surge",
                                "Teesta Basin",
                                now.minus(58, ChronoUnit.MINUTES),
                                26,
                                66,
                                "Upstream discharge climbing faster than the 6-hour forecast band."
                                        + " Low-lying settlements advised to monitor.",
                                "Flood",
                                "Gauge station · TB-11"),
                        incident(
                                "inc-1028",
                                com.nershield.incident.Severity.LOW,
                                "Sensor calibration drift",
                                "West Ridge Array",
                                now.minus(74, ChronoUnit.MINUTES),
                                70,
                                52,
                                "Inclinometer WR-04 reporting drift beyond tolerance. Flagged for"
                                        + " maintenance; readings de-weighted in the model.",
                                "System",
                                "Diagnostics")));
    }

    private IncidentEntity incident(
            String id,
            com.nershield.incident.Severity severity,
            String title,
            String locationLabel,
            Instant occurredAt,
            double mapX,
            double mapY,
            String summary,
            String category,
            String reportedBy) {
        // No real lat/lon exists for these fixtures (they never had one — see the
        // superseded DemoIncidentSource / frontend Incident type doc comments): location
        // stays null rather than inventing coordinates, and the abstract 0-100 map
        // position is preserved as-is.
        return new IncidentEntity(
                id,
                severity,
                title,
                locationLabel,
                null,
                mapX,
                mapY,
                summary,
                category,
                reportedBy,
                occurredAt,
                DEMO_SOURCE,
                DEMO_ORIGIN);
    }

    // ---- Alerts ---------------------------------------------------------------------------

    private void seedAlerts() {
        if (alertRepository.count() > 0) {
            return;
        }
        Instant now = Instant.now();
        alertRepository.saveAll(
                List.of(
                        alert(
                                "alert-01",
                                "Meghalaya Sector 04",
                                com.nershield.alert.Severity.HIGH,
                                com.nershield.alert.Severity.CRITICAL,
                                "Extreme rainfall accumulation (341 mm / 72h)",
                                "Immediate field verification",
                                now),
                        alert(
                                "alert-02",
                                "NH-10 / Sikkim",
                                com.nershield.alert.Severity.HIGH,
                                com.nershield.alert.Severity.CRITICAL,
                                "Pore-pressure spike on cut-slope sensors",
                                "Corridor closure review",
                                now.minus(4, ChronoUnit.MINUTES)),
                        alert(
                                "alert-03",
                                "Teesta Basin",
                                com.nershield.alert.Severity.MODERATE,
                                com.nershield.alert.Severity.HIGH,
                                "Upstream discharge above forecast band",
                                "Advise low-lying settlements",
                                now.minus(12, ChronoUnit.MINUTES))));
    }

    private EscalationAlertEntity alert(
            String id,
            String zone,
            com.nershield.alert.Severity from,
            com.nershield.alert.Severity to,
            String cause,
            String action,
            Instant occurredAt) {
        return new EscalationAlertEntity(
                id, zone, from, to, cause, action, occurredAt, false, null, DEMO_SOURCE, DEMO_ORIGIN);
    }

    private String writeJson(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (Exception ex) {
            throw new IllegalStateException("Failed to serialize seed data", ex);
        }
    }
}
