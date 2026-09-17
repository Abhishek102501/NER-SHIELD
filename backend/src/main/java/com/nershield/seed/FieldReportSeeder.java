package com.nershield.seed;

import com.nershield.fieldreport.FieldReportEntity;
import com.nershield.fieldreport.FieldReportRepository;
import com.nershield.fieldreport.Severity;
import com.nershield.fieldreport.SyncStatus;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

/**
 * Seeds the {@code field_reports} table with the project's original demonstration content,
 * ported verbatim from the former frontend-only {@code FIELD_REPORTS} fixture. Only runs
 * against an empty table — see {@link DemoDataSeeder} for the full seeding discipline this
 * follows.
 */
@Component
public class FieldReportSeeder implements ApplicationRunner {

    private static final String DEMO_SOURCE = "seed:demo-fixture";
    private static final String DEMO_ORIGIN = "demo";

    private final FieldReportRepository repository;
    private final boolean enabled;

    public FieldReportSeeder(
            FieldReportRepository repository, @Value("${nershield.seed.demo-data:true}") boolean enabled) {
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
                        new FieldReportEntity(
                                "FR-0031",
                                null,
                                "27.176°N, 88.531°E",
                                "Landslide",
                                Severity.CRITICAL,
                                3,
                                SyncStatus.QUEUED,
                                now.minus(2, ChronoUnit.MINUTES),
                                DEMO_SOURCE,
                                DEMO_ORIGIN),
                        new FieldReportEntity(
                                "FR-0030",
                                null,
                                "27.238°N, 88.664°E",
                                "Road Obstruction",
                                Severity.MODERATE,
                                1,
                                SyncStatus.QUEUED,
                                now.minus(9, ChronoUnit.MINUTES),
                                DEMO_SOURCE,
                                DEMO_ORIGIN),
                        new FieldReportEntity(
                                "FR-0029",
                                null,
                                "27.021°N, 88.529°E",
                                "Flood",
                                Severity.HIGH,
                                2,
                                SyncStatus.SYNCED,
                                now.minus(24, ChronoUnit.MINUTES),
                                DEMO_SOURCE,
                                DEMO_ORIGIN)));
    }
}
