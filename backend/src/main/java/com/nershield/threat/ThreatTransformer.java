package com.nershield.threat;

import com.nershield.threat.detection.DetectionResult;
import com.nershield.threat.detection.EntityType;
import com.nershield.threat.detection.ExposureType;
import com.nershield.threat.detection.GeoContext;
import com.nershield.threat.dto.ThreatEventResponse;
import java.util.Locale;
import org.springframework.stereotype.Component;

/**
 * Converts a raw {@link DetectionResult} into the minimized {@link ThreatEventResponse} the
 * frontend consumes.
 *
 * <p>This is the one place that decides how a detection becomes a map location. It never
 * invents coordinates: {@link ThreatEventResponse#locationAvailable()} is {@code true} only
 * when the source {@link GeoContext} actually carried a latitude and longitude.
 */
@Component
public class ThreatTransformer {

    private final RiskClassifier riskClassifier;

    public ThreatTransformer(RiskClassifier riskClassifier) {
        this.riskClassifier = riskClassifier;
    }

    public ThreatEventResponse transform(DetectionResult detection) {
        GeoContext geo = detection.geo();
        boolean locationAvailable = geo != null && geo.hasCoordinates();

        return new ThreatEventResponse(
                detection.id(),
                locationAvailable ? geo.latitude() : null,
                locationAvailable ? geo.longitude() : null,
                locationAvailable,
                describeLocation(geo),
                detection.entityType().displayName(),
                threatName(detection),
                riskClassifier.classify(detection),
                detection.detectedAt(),
                description(detection));
    }

    /**
     * Best available human-readable place description, preferring the most specific field
     * a {@link GeoContext} actually carries. Falls back to raw coordinates, then to an
     * explicit "unavailable" label — never a guess.
     */
    private String describeLocation(GeoContext geo) {
        if (geo == null) {
            return "Location unavailable";
        }
        if (geo.address() != null) {
            return geo.address();
        }
        if (geo.city() != null && geo.state() != null) {
            return geo.city() + ", " + geo.state();
        }
        if (geo.city() != null) {
            return geo.country() != null ? geo.city() + ", " + geo.country() : geo.city();
        }
        if (geo.region() != null) {
            return geo.region();
        }
        if (geo.country() != null) {
            return geo.country();
        }
        if (geo.hasCoordinates()) {
            return String.format(Locale.ROOT, "%.4f, %.4f", geo.latitude(), geo.longitude());
        }
        return "Location unavailable";
    }

    private String threatName(DetectionResult detection) {
        String entity = detection.entityType().displayName();
        return switch (detection.exposureType()) {
            case POLICY_VIOLATION -> entity + " Policy Violation";
            case PUBLIC_EXPOSURE -> entity + " Public Exposure";
            case ANOMALOUS_BEHAVIOR -> "Anomalous " + entity + " Activity";
            case THIRD_PARTY_ACCESS -> entity + " Third-Party Access";
            case INTERNAL_ONLY -> entity + " Access Review";
        };
    }

    private String description(DetectionResult detection) {
        EntityType entityType = detection.entityType();
        ExposureType exposureType = detection.exposureType();
        int confidencePct = (int) Math.round(detection.confidence() * 100);
        return "%s detection triggered %s with %d%% model confidence."
                .formatted(article(entityType.displayName()), exposureType.label(), confidencePct);
    }

    private static String article(String label) {
        boolean vowelSound = "AEIOU".indexOf(Character.toUpperCase(label.charAt(0))) >= 0;
        return (vowelSound ? "An " : "A ") + label;
    }
}
