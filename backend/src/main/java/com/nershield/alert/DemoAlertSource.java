package com.nershield.alert;

import com.nershield.alert.dto.EscalationAlertResponse;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.stereotype.Component;

/**
 * Stand-in for a real escalation pipeline, active until risk-zone band changes and sensor
 * thresholds actually generate alerts.
 *
 * <p>Ports the frontend's own demonstration fixture ({@code frontend/data/alerts.ts}) so the
 * two stay recognizably in sync, the same way {@code DemoIncidentSource} does for incidents.
 * Acknowledgement state is kept in-memory only ({@link #isLive()} reports {@code false} so
 * callers never present this as real escalation activity, and this state does not need to
 * survive a restart).
 */
@Component
public class DemoAlertSource implements AlertSource {

    private static final List<EscalationAlertResponse> SEED =
            List.of(
                    new EscalationAlertResponse(
                            "alert-01",
                            "Meghalaya Sector 04",
                            Severity.HIGH,
                            Severity.CRITICAL,
                            "Extreme rainfall accumulation (341 mm / 72h)",
                            "Immediate field verification",
                            "just now",
                            false),
                    new EscalationAlertResponse(
                            "alert-02",
                            "NH-10 / Sikkim",
                            Severity.HIGH,
                            Severity.CRITICAL,
                            "Pore-pressure spike on cut-slope sensors",
                            "Corridor closure review",
                            "4 min ago",
                            false),
                    new EscalationAlertResponse(
                            "alert-03",
                            "Teesta Basin",
                            Severity.MODERATE,
                            Severity.HIGH,
                            "Upstream discharge above forecast band",
                            "Advise low-lying settlements",
                            "12 min ago",
                            false));

    private final Map<String, EscalationAlertResponse> alerts;

    public DemoAlertSource() {
        Map<String, EscalationAlertResponse> seeded = new LinkedHashMap<>();
        for (EscalationAlertResponse alert : SEED) {
            seeded.put(alert.id(), alert);
        }
        this.alerts = new ConcurrentHashMap<>(seeded);
    }

    @Override
    public List<EscalationAlertResponse> fetchAll() {
        return SEED.stream().map(seed -> alerts.getOrDefault(seed.id(), seed)).toList();
    }

    @Override
    public Optional<EscalationAlertResponse> acknowledge(String id) {
        EscalationAlertResponse current = alerts.get(id);
        if (current == null) {
            return Optional.empty();
        }
        EscalationAlertResponse acknowledged =
                new EscalationAlertResponse(
                        current.id(),
                        current.zone(),
                        current.from(),
                        current.to(),
                        current.cause(),
                        current.action(),
                        current.timeAgo(),
                        true);
        alerts.put(id, acknowledged);
        return Optional.of(acknowledged);
    }

    @Override
    public boolean isLive() {
        return false;
    }
}
