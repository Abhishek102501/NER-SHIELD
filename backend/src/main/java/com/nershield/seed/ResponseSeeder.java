package com.nershield.seed;

import com.nershield.response.ResponseIncidentEntity;
import com.nershield.response.ResponseIncidentRepository;
import com.nershield.response.ResponsePhase;
import com.nershield.response.ResponseUnitEntity;
import com.nershield.response.ResponseUnitRepository;
import com.nershield.response.Severity;
import java.time.Instant;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

/**
 * Seeds {@code response_incidents} and {@code response_units} with the project's original
 * demonstration content, ported verbatim from the former frontend-only {@code
 * RESPONSE_INCIDENTS}/{@code RESPONSE_UNITS} fixtures. Only runs against empty tables — see
 * {@link DemoDataSeeder} for the full seeding discipline this follows.
 */
@Component
public class ResponseSeeder implements ApplicationRunner {

    private static final String DEMO_SOURCE = "seed:demo-fixture";
    private static final String DEMO_ORIGIN = "demo";

    private final ResponseIncidentRepository incidentRepository;
    private final ResponseUnitRepository unitRepository;
    private final boolean enabled;

    public ResponseSeeder(
            ResponseIncidentRepository incidentRepository,
            ResponseUnitRepository unitRepository,
            @Value("${nershield.seed.demo-data:true}") boolean enabled) {
        this.incidentRepository = incidentRepository;
        this.unitRepository = unitRepository;
        this.enabled = enabled;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (!enabled) {
            return;
        }
        seedIncidents();
        seedUnits();
    }

    private void seedIncidents() {
        if (incidentRepository.count() > 0) {
            return;
        }
        Instant now = Instant.now();
        incidentRepository.saveAll(
                List.of(
                        new ResponseIncidentEntity(
                                "inc-1042",
                                "Slope failure — imminent",
                                "NH-10 / Sikkim",
                                Severity.CRITICAL,
                                87,
                                12800,
                                "7 roads · 2 bridges · 1 hospital",
                                "Close corridor & dispatch field verification team",
                                ResponsePhase.RESPOND,
                                1,
                                DEMO_SOURCE,
                                now,
                                DEMO_ORIGIN),
                        new ResponseIncidentEntity(
                                "inc-1039",
                                "Saturated hillslope",
                                "Meghalaya Sector 04",
                                Severity.HIGH,
                                79,
                                18400,
                                "5 roads · 1 bridge · 1 hospital",
                                "Stage response teams; issue settlement advisory",
                                ResponsePhase.PRIORITIZE,
                                2,
                                DEMO_SOURCE,
                                now,
                                DEMO_ORIGIN),
                        new ResponseIncidentEntity(
                                "inc-1031",
                                "River level surge",
                                "Teesta Basin",
                                Severity.HIGH,
                                71,
                                9600,
                                "4 roads · 3 bridges",
                                "Flood watch; pre-position relief at depot",
                                ResponsePhase.ASSESS,
                                3,
                                DEMO_SOURCE,
                                now,
                                DEMO_ORIGIN),
                        new ResponseIncidentEntity(
                                "inc-1036",
                                "Debris on carriageway",
                                "Hill Road 04",
                                Severity.MODERATE,
                                52,
                                3400,
                                "2 roads",
                                "Routine clearance patrol",
                                ResponsePhase.DETECT,
                                4,
                                DEMO_SOURCE,
                                now,
                                DEMO_ORIGIN)));
    }

    private void seedUnits() {
        if (unitRepository.count() > 0) {
            return;
        }
        unitRepository.saveAll(
                List.of(
                        new ResponseUnitEntity(
                                "unit-alpha", "Unit Alpha · NDRF", "NDRF", "Gangtok", 35, DEMO_SOURCE, DEMO_ORIGIN),
                        new ResponseUnitEntity(
                                "unit-bravo", "Unit Bravo · SDRF", "SDRF", "Singtam", 18, DEMO_SOURCE, DEMO_ORIGIN),
                        new ResponseUnitEntity(
                                "unit-charlie",
                                "Unit Charlie · Engineering",
                                "Engineering",
                                "Rangpo",
                                22,
                                DEMO_SOURCE,
                                DEMO_ORIGIN),
                        new ResponseUnitEntity(
                                "unit-delta",
                                "Unit Delta · Medical",
                                "Medical",
                                "District Hospital",
                                12,
                                DEMO_SOURCE,
                                DEMO_ORIGIN),
                        new ResponseUnitEntity(
                                "unit-echo", "Unit Echo · Police", "Police", "Pakyong", 27, DEMO_SOURCE, DEMO_ORIGIN)));
    }
}
