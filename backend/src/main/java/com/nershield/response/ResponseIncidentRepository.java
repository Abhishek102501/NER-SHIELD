package com.nershield.response;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface ResponseIncidentRepository extends JpaRepository<ResponseIncidentEntity, String> {

    @Query("select r from ResponseIncidentEntity r order by r.priority asc")
    List<ResponseIncidentEntity> findAllOrderByPriorityAsc();
}
