package com.nershield.fieldreport;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface FieldReportRepository extends JpaRepository<FieldReportEntity, String> {

    @Query("select f from FieldReportEntity f order by f.submittedAt desc")
    List<FieldReportEntity> findAllOrderBySubmittedAtDesc();
}
