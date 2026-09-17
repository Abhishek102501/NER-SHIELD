package com.nershield.threat.detection;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface ThreatDetectionRepository extends JpaRepository<ThreatDetectionEntity, String> {

    @Query("select t from ThreatDetectionEntity t order by t.detectedAt desc")
    List<ThreatDetectionEntity> findAllOrderByDetectedAtDesc();
}
