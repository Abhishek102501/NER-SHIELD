package com.nershield.incident;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface IncidentRepository extends JpaRepository<IncidentEntity, String> {

    @Query("select i from IncidentEntity i order by i.occurredAt desc")
    List<IncidentEntity> findAllOrderByOccurredAtDesc();
}
