package com.nershield.risk;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface RiskZoneRepository extends JpaRepository<RiskZoneEntity, String> {

    @Query("select r from RiskZoneEntity r order by r.riskValue desc")
    List<RiskZoneEntity> findAllOrderByRiskValueDesc();
}
