package com.nershield.seed;

import com.nershield.infrastructure.InfrastructurePointEntity;
import com.nershield.infrastructure.InfrastructurePointRepository;
import java.time.Instant;
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
 * Seeds {@code infrastructure_points} with the project's original demonstration content,
 * ported verbatim from the former frontend-only {@code frontend/data/infrastructure.ts}
 * (whose own doc comment already labeled it "DEMO / MOCK DATA" — hand-authored placeholder
 * geography, not a surveyed dataset). Only runs against an empty table — see {@link
 * DemoDataSeeder} for the full seeding discipline this follows.
 */
@Component
public class InfrastructurePointSeeder implements ApplicationRunner {

    private static final String DEMO_SOURCE = "seed:demo-fixture";
    private static final String DEMO_ORIGIN = "demo";
    private static final GeometryFactory GEOMETRY_FACTORY = new GeometryFactory(new PrecisionModel(), 4326);

    private final InfrastructurePointRepository repository;
    private final boolean enabled;

    public InfrastructurePointSeeder(
            InfrastructurePointRepository repository, @Value("${nershield.seed.demo-data:true}") boolean enabled) {
        this.repository = repository;
        this.enabled = enabled;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (!enabled || repository.count() > 0) {
            return;
        }
        Instant now = Instant.now();
        repository.saveAll(
                List.of(
                        point("v-rangpo", "Rangpo", "village", 88.53, 27.18, null, now),
                        point("v-singtam", "Singtam", "village", 88.50, 27.23, null, now),
                        point("v-melli", "Melli", "village", 88.46, 27.06, null, now),
                        point("v-rhenock", "Rhenock", "village", 88.68, 27.19, null, now),
                        point("v-pakyong", "Pakyong", "village", 88.60, 27.24, null, now),
                        point("h-district", "District Hospital", "hospital", 88.52, 27.16, null, now),
                        point("h-singtam", "Singtam PHC", "hospital", 88.49, 27.22, null, now),
                        point("s-rangpo", "Rangpo Sr. Sec. School", "school", 88.535, 27.172, null, now),
                        point("s-melli", "Melli Primary School", "school", 88.462, 27.064, null, now),
                        point("s-rhenock", "Rhenock Academy", "school", 88.676, 27.186, null, now),
                        // Status reflects each bridge's proximity to the NH-10/Teesta Basin
                        // risk zones already seeded by DemoDataSeeder — not an invented event.
                        point("b-teesta", "Teesta Bridge", "bridge", 88.54, 27.10, "warning", now),
                        point("b-rangpo", "Rangpo Rail Bridge", "bridge", 88.527, 27.176, "normal", now),
                        point("d-relief", "Relief Depot", "depot", 88.49, 27.20, null, now)));
    }

    private InfrastructurePointEntity point(
            String id, String name, String kind, double lng, double lat, String status, Instant now) {
        Point location = GEOMETRY_FACTORY.createPoint(new Coordinate(lng, lat));
        return new InfrastructurePointEntity(id, name, kind, location, status, DEMO_SOURCE, now, DEMO_ORIGIN);
    }
}
