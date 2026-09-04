package com.nershield.risk;

import com.nershield.risk.dto.RiskDriverResponse;
import com.nershield.risk.dto.RiskFactorResponse;
import com.nershield.risk.dto.RiskImpactResponse;
import com.nershield.risk.dto.RiskMetricsResponse;
import com.nershield.risk.dto.RiskScoreResponse;
import com.nershield.risk.dto.RiskZoneResponse;
import java.util.List;
import java.util.Optional;
import org.springframework.stereotype.Component;

/**
 * Stand-in for the Python/FastAPI landslide susceptibility model, active until a real one is
 * wired in.
 *
 * <p>Ports the frontend's own demonstration fixture ({@code frontend/data/locations.ts}) so
 * the two stay recognizably in sync, the same way {@code DemoDetectionSource} does for
 * threats. {@link #isLive()} reports {@code false} so callers never present this as a real
 * model assessment.
 */
@Component
public class DemoRiskZoneSource implements RiskZoneSource {

    private static final List<RiskZoneResponse> ZONES =
            List.of(
                    new RiskZoneResponse(
                            "nh10-sikkim",
                            "NH-10 Corridor",
                            "Sikkim · Teesta Valley",
                            new double[] {88.53, 27.17},
                            new RiskScoreResponse(87, Severity.CRITICAL, 91, "+12.6% / 6H", DeltaDirection.UP),
                            List.of(
                                    new RiskFactorResponse("rainfall", "Rainfall", 34, Severity.CRITICAL),
                                    new RiskFactorResponse("soil", "Soil Moisture", 24, Severity.HIGH),
                                    new RiskFactorResponse("slope", "Slope", 18, Severity.HIGH),
                                    new RiskFactorResponse("historical", "Historical", 13, Severity.MODERATE),
                                    new RiskFactorResponse("satellite", "Satellite Change", 7, Severity.MODERATE),
                                    new RiskFactorResponse("terrain", "Terrain", 4, Severity.LOW)),
                            new RiskMetricsResponse(142, 287, 82, 41, 1240),
                            List.of(
                                    new RiskDriverResponse(
                                            "d1",
                                            "Extreme rainfall accumulation",
                                            "287 mm over 72h — 2.4× the seasonal alert threshold.",
                                            34,
                                            Severity.CRITICAL),
                                    new RiskDriverResponse(
                                            "d2",
                                            "High soil moisture",
                                            "Saturation at 82%, past the 70% failure threshold.",
                                            24,
                                            Severity.HIGH),
                                    new RiskDriverResponse(
                                            "d3",
                                            "Steep terrain",
                                            "Cut-slope gradient of 41° along the NH-10 corridor.",
                                            18,
                                            Severity.HIGH),
                                    new RiskDriverResponse(
                                            "d4",
                                            "Historical susceptibility",
                                            "9 recorded slope failures in this reach since 2011.",
                                            13,
                                            Severity.MODERATE)),
                            new RiskImpactResponse(4, 7, 2, 1, 12800),
                            3),
                    new RiskZoneResponse(
                            "meghalaya-s04",
                            "Meghalaya Sector 04",
                            "East Khasi Hills",
                            new double[] {91.74, 25.45},
                            new RiskScoreResponse(79, Severity.HIGH, 88, "+9.1% / 6H", DeltaDirection.UP),
                            List.of(
                                    new RiskFactorResponse("rainfall", "Rainfall", 38, Severity.CRITICAL),
                                    new RiskFactorResponse("soil", "Soil Moisture", 22, Severity.HIGH),
                                    new RiskFactorResponse("slope", "Slope", 15, Severity.MODERATE),
                                    new RiskFactorResponse("historical", "Historical", 14, Severity.MODERATE),
                                    new RiskFactorResponse("satellite", "Satellite Change", 7, Severity.MODERATE),
                                    new RiskFactorResponse("terrain", "Terrain", 4, Severity.LOW)),
                            new RiskMetricsResponse(168, 341, 77, 33, 1490),
                            List.of(
                                    new RiskDriverResponse(
                                            "d1",
                                            "Record rainfall band",
                                            "341 mm / 72h across the Cherrapunji orographic belt.",
                                            38,
                                            Severity.CRITICAL),
                                    new RiskDriverResponse(
                                            "d2",
                                            "Saturated regolith",
                                            "Thin soil over bedrock saturated to 77%.",
                                            22,
                                            Severity.HIGH),
                                    new RiskDriverResponse(
                                            "d3",
                                            "Historical susceptibility",
                                            "Repeated debris flows recorded along Sector 04.",
                                            14,
                                            Severity.MODERATE),
                                    new RiskDriverResponse(
                                            "d4",
                                            "Slope gradient",
                                            "33° escarpment above the settlement cluster.",
                                            15,
                                            Severity.MODERATE)),
                            new RiskImpactResponse(6, 5, 1, 1, 18400),
                            2),
                    new RiskZoneResponse(
                            "teesta-basin",
                            "Teesta Basin",
                            "Sikkim · Rangpo",
                            new double[] {88.53, 27.02},
                            new RiskScoreResponse(71, Severity.HIGH, 85, "+6.4% / 6H", DeltaDirection.UP),
                            List.of(
                                    new RiskFactorResponse("rainfall", "Rainfall", 30, Severity.HIGH),
                                    new RiskFactorResponse("soil", "Soil Moisture", 20, Severity.HIGH),
                                    new RiskFactorResponse("river", "River Discharge", 26, Severity.HIGH),
                                    new RiskFactorResponse("historical", "Historical", 14, Severity.MODERATE),
                                    new RiskFactorResponse("terrain", "Terrain", 10, Severity.LOW)),
                            new RiskMetricsResponse(118, 236, 74, 22, 300),
                            List.of(
                                    new RiskDriverResponse(
                                            "d1",
                                            "Rising river discharge",
                                            "Upstream release climbing above the 6-hour forecast band.",
                                            26,
                                            Severity.HIGH),
                                    new RiskDriverResponse(
                                            "d2",
                                            "Sustained rainfall",
                                            "236 mm / 72h feeding the catchment.",
                                            30,
                                            Severity.HIGH),
                                    new RiskDriverResponse(
                                            "d3",
                                            "Valley-floor exposure",
                                            "Low-lying settlements within the flood envelope.",
                                            20,
                                            Severity.HIGH)),
                            new RiskImpactResponse(5, 4, 3, 0, 9600),
                            1),
                    new RiskZoneResponse(
                            "aizawl-ridge",
                            "Aizawl Ridge",
                            "Mizoram",
                            new double[] {92.72, 23.73},
                            new RiskScoreResponse(54, Severity.MODERATE, 83, "+3.2% / 6H", DeltaDirection.UP),
                            List.of(
                                    new RiskFactorResponse("rainfall", "Rainfall", 28, Severity.MODERATE),
                                    new RiskFactorResponse("soil", "Soil Moisture", 22, Severity.MODERATE),
                                    new RiskFactorResponse("slope", "Slope", 24, Severity.HIGH),
                                    new RiskFactorResponse("historical", "Historical", 16, Severity.MODERATE),
                                    new RiskFactorResponse("terrain", "Terrain", 10, Severity.LOW)),
                            new RiskMetricsResponse(74, 149, 61, 37, 1130),
                            List.of(
                                    new RiskDriverResponse(
                                            "d1",
                                            "Steep urban slopes",
                                            "Dense hillside construction on 37° gradients.",
                                            24,
                                            Severity.HIGH),
                                    new RiskDriverResponse(
                                            "d2",
                                            "Moderate rainfall",
                                            "149 mm / 72h — below critical but rising.",
                                            28,
                                            Severity.MODERATE)),
                            new RiskImpactResponse(2, 3, 0, 1, 21500),
                            1));

    @Override
    public List<RiskZoneResponse> fetchAll() {
        return ZONES;
    }

    @Override
    public Optional<RiskZoneResponse> fetchById(String id) {
        return ZONES.stream().filter(z -> z.id().equals(id)).findFirst();
    }

    @Override
    public boolean isLive() {
        return false;
    }
}
