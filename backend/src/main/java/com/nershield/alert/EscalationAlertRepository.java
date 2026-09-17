package com.nershield.alert;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface EscalationAlertRepository extends JpaRepository<EscalationAlertEntity, String> {

    @Query("select a from EscalationAlertEntity a order by a.occurredAt desc")
    List<EscalationAlertEntity> findAllOrderByOccurredAtDesc();
}
