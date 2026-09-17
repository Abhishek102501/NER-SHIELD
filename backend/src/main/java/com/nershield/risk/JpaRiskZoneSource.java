package com.nershield.risk;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
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
 * PostgreSQL/PostGIS-backed {@link RiskZoneSource}, reading from {@link RiskZoneRepository}.
 *
 * <p>Supersedes the former in-memory {@code DemoRiskZoneSource}: the same demo fixture
 * content now lives in the {@code risk_zones} table (inserted by {@code
 * com.nershield.seed.DemoDataSeeder} only when the table is empty, tagged {@code
 * dataOrigin=demo}).
 */
@Component
public class JpaRiskZoneSource implements RiskZoneSource {

    private final RiskZoneRepository repository;
    private final ObjectMapper objectMapper;

    public JpaRiskZoneSource(RiskZoneRepository repository, ObjectMapper objectMapper) {
        this.repository = repository;
        this.objectMapper = objectMapper;
    }

    @Override
    public List<RiskZoneResponse> fetchAll() {
        return repository.findAllOrderByRiskValueDesc().stream().map(this::toResponse).toList();
    }

    @Override
    public Optional<RiskZoneResponse> fetchById(String id) {
        return repository.findById(id).map(this::toResponse);
    }

    @Override
    public boolean isLive() {
        return repository.findAll().stream().anyMatch(e -> !"demo".equals(e.getDataOrigin()));
    }

    private RiskZoneResponse toResponse(RiskZoneEntity e) {
        return new RiskZoneResponse(
                e.getId(),
                e.getName(),
                e.getSector(),
                new double[] {e.getCenter().getX(), e.getCenter().getY()},
                new RiskScoreResponse(
                        e.getRiskValue(),
                        e.getRiskBand(),
                        e.getRiskConfidence(),
                        e.getRiskDeltaLabel(),
                        e.getRiskDeltaDirection()),
                readJson(e.getFactorsJson(), new TypeReference<List<RiskFactorResponse>>() {}),
                new RiskMetricsResponse(
                        nz(e.getRainfall24h()),
                        nz(e.getRainfall72h()),
                        nz(e.getSoilMoisture()),
                        nz(e.getSlope()),
                        nz(e.getElevation())),
                readJson(e.getDriversJson(), new TypeReference<List<RiskDriverResponse>>() {}),
                new RiskImpactResponse(
                        e.getVillages(), e.getRoads(), e.getBridges(), e.getHospitals(), e.getPopulationExposure()),
                e.getActiveIncidents());
    }

    private static double nz(Double value) {
        return value == null ? 0.0 : value;
    }

    private <T> T readJson(String json, TypeReference<T> type) {
        try {
            return objectMapper.readValue(json, type);
        } catch (JsonProcessingException ex) {
            throw new IllegalStateException("Corrupt risk zone JSON column", ex);
        }
    }
}
