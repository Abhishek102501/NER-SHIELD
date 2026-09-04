package com.nershield.incident;

import com.nershield.incident.dto.IncidentResponse;
import java.util.List;
import org.springframework.stereotype.Component;

/**
 * Stand-in for real incident intake, active until the report/response pipeline exists.
 *
 * <p>Ports the frontend's own demonstration fixture ({@code frontend/data/incidents.ts}) so
 * the two stay recognizably in sync, the same way {@code DemoDetectionSource} does for
 * threats. {@link #isLive()} reports {@code false} so callers never present this as real
 * incident activity.
 */
@Component
public class DemoIncidentSource implements IncidentSource {

    private static final List<IncidentResponse> INCIDENTS =
            List.of(
                    new IncidentResponse(
                            "inc-1042",
                            Severity.CRITICAL,
                            "Slope failure risk",
                            "NH-10 / Sikkim",
                            "12 min ago",
                            34,
                            38,
                            "Rapid pore-pressure rise detected on the NH-10 cut-slope corridor. Debris"
                                    + " movement probability elevated; corridor flagged for pre-emptive"
                                    + " closure review.",
                            "Landslide",
                            "Sensor grid · SK-07"),
                    new IncidentResponse(
                            "inc-1039",
                            Severity.HIGH,
                            "Saturated hillslope",
                            "East District",
                            "27 min ago",
                            58,
                            30,
                            "Continuous rainfall over 36h has pushed soil moisture past the seasonal"
                                    + " threshold across the East District ridge line.",
                            "Landslide",
                            "Field unit · ED-02"),
                    new IncidentResponse(
                            "inc-1036",
                            Severity.MODERATE,
                            "Minor debris on carriageway",
                            "Hill Road 04",
                            "41 min ago",
                            46,
                            58,
                            "Small rockfall partially obstructing a single lane. No casualties reported."
                                    + " Clearance crew notified.",
                            "Road Obstruction",
                            "Field report · citizen"),
                    new IncidentResponse(
                            "inc-1031",
                            Severity.HIGH,
                            "River level surge",
                            "Teesta Basin",
                            "58 min ago",
                            26,
                            66,
                            "Upstream discharge climbing faster than the 6-hour forecast band."
                                    + " Low-lying settlements advised to monitor.",
                            "Flood",
                            "Gauge station · TB-11"),
                    new IncidentResponse(
                            "inc-1028",
                            Severity.LOW,
                            "Sensor calibration drift",
                            "West Ridge Array",
                            "1 hr 14 min ago",
                            70,
                            52,
                            "Inclinometer WR-04 reporting drift beyond tolerance. Flagged for"
                                    + " maintenance; readings de-weighted in the model.",
                            "System",
                            "Diagnostics"));

    @Override
    public List<IncidentResponse> fetchAll() {
        return INCIDENTS;
    }

    @Override
    public boolean isLive() {
        return false;
    }
}
